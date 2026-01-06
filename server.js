import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Kafka, logLevel } from 'kafkajs';
import { publish } from './publish_test_events.js';
import { LogRepositoryFactory } from './log_repository.js';
import sqlite3 from 'sqlite3';

// ... (existing imports)

// ... (rest of code)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

// Paths relative to where this script is run (kafka-nexus-hub)
const BACKEND_DIR = path.resolve(__dirname, '../codigo/ms-tra-transaction-integrator-cobranza');
const CONFIG_FILE = path.join(BACKEND_DIR, 'src/main/resources/config.json');
const LOG_FILE = path.join(BACKEND_DIR, 'logs/integration-events.json');
const DB_FILE = path.join(__dirname, 'dashboard.db');

// --- Log Repository Setup ---
// Configurable via env var or config file. Defaulting to SQLite for local dev.
const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || 'SQLITE';
const ELASTIC_URL = process.env.ELASTIC_URL || 'http://localhost:9200';

const logRepository = LogRepositoryFactory.create(SEARCH_PROVIDER, {
  dbPath: DB_FILE, // Re-use same DB file for FTS
  url: ELASTIC_URL,
  index: 'kafka-logs'
});

// Initialize Repo
logRepository.init().catch(err => console.error("Failed to init log repository:", err));

app.use(cors());
app.use(express.json());
app.use(express.text());

// --- SQLite Setup ---
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Could not connect to database', err);
  else {
    console.log('Connected to SQLite database');
    // Optimization: Enable WAL mode for better concurrency
    db.configure('busyTimeout', 5000); // Wait up to 5s for lock
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;'); // Optional: faster writes, slightly less safe on power loss
  }
});

db.serialize(() => {
  // Events table (Transactions)
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT UNIQUE,
    status TEXT,
    duration_ms INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Topic Messages table (Processed count)
  db.run(`CREATE TABLE IF NOT EXISTS topic_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    correlation_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic, correlation_id)
  )`);

  // Errors table
  db.run(`CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correlation_id TEXT UNIQUE,
    error_type TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Indexes
  db.run("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_status_timestamp ON events(status, timestamp)"); // Optimized for counters
  db.run("CREATE INDEX IF NOT EXISTS idx_topic_messages_topic ON topic_messages(topic)");
  db.run("CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp)"); // Optimized for recent errors list
});

// --- Buffering for Batch Writes ---
const BATCH_INTERVAL_MS = 1000;
let eventBuffer = [];
let topicMsgBuffer = [];
let errorBuffer = [];
let rawLogBuffer = [];

let isFlushing = false;

async function flushBuffers() {
  if (isFlushing) return;
  if (eventBuffer.length === 0 && topicMsgBuffer.length === 0 && errorBuffer.length === 0) return;

  isFlushing = true;

  const eventsToInsert = [...eventBuffer];
  const topicMsgsToInsert = [...topicMsgBuffer];
  const errorsToInsert = [...errorBuffer];
  const rawLogsToInsert = [...rawLogBuffer];

  // Clear buffers immediately to allow new incoming data
  eventBuffer = [];
  topicMsgBuffer = [];
  errorBuffer = [];
  rawLogBuffer = [];

  // Index logs BEFORE DB transaction to avoid contention/locking issues
  try {
    await logRepository.indexLogs(rawLogsToInsert);
  } catch (e) {
    console.error("Error indexing logs:", e);
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    try {
      // Split events by status to prioritize SUCCESS
      const successes = eventsToInsert.filter(e => e.status === 'SUCCESS');
      const timeouts = eventsToInsert.filter(e => e.status !== 'SUCCESS');

      if (timeouts.length > 0) {
        // Timeouts: Only insert if ID doesn't exist (don't overwrite Success)
        const stmt = db.prepare("INSERT OR IGNORE INTO events (correlation_id, status, duration_ms, timestamp) VALUES (?, ?, ?, ?)");
        timeouts.forEach(e => stmt.run(e.correlation_id, e.status, e.duration_ms, e.timestamp));
        stmt.finalize();
      }

      if (successes.length > 0) {
        // Successes: Always win. Overwrite Timeout if it exists.
        const stmt = db.prepare("INSERT OR REPLACE INTO events (correlation_id, status, duration_ms, timestamp) VALUES (?, ?, ?, ?)");
        successes.forEach(e => stmt.run(e.correlation_id, e.status, e.duration_ms, e.timestamp));
        stmt.finalize();
      }

      if (topicMsgsToInsert.length > 0) {
        const stmt = db.prepare("INSERT OR IGNORE INTO topic_messages (topic, correlation_id, timestamp) VALUES (?, ?, ?)");
        topicMsgsToInsert.forEach(t => stmt.run(t.topic, t.correlation_id, t.timestamp));
        stmt.finalize();
      }

      if (errorsToInsert.length > 0) {
        const stmt = db.prepare("INSERT OR IGNORE INTO errors (correlation_id, error_type, details, timestamp) VALUES (?, ?, ?, ?)");
        errorsToInsert.forEach(e => stmt.run(e.correlation_id, e.error_type, e.details, e.timestamp));
        stmt.finalize();
      }

      // Enforce Mutual Exclusion: If a transaction is Successful, it cannot be an Error.
      // This fixes the bug where the Java app logs both "Success" and "Expired" for the same ID.
      // Only delete if the event status is SUCCESS. Timeouts should remain in both (or handled via events).
      db.run("DELETE FROM errors WHERE correlation_id IN (SELECT correlation_id FROM events WHERE status = 'SUCCESS')");

      db.run("COMMIT", (err) => {
        isFlushing = false; // Release lock
        if (err) {
          console.error("Error committing batch:", err);
          // Restore data on commit error
          restoreBuffers(eventsToInsert, topicMsgsToInsert, errorsToInsert);
        }
      });
    } catch (e) {
      isFlushing = false; // Release lock
      console.error("Error preparing batch:", e);
      db.run("ROLLBACK");
      // Restore data on execution error
      restoreBuffers(eventsToInsert, topicMsgsToInsert, errorsToInsert);
    }
  });
}

function restoreBuffers(events, topicMsgs, errors) {
  console.log(`Restoring ${events.length} events, ${topicMsgs.length} msgs, ${errors.length} errors to buffer due to DB error.`);
  eventBuffer = [...events, ...eventBuffer];
  topicMsgBuffer = [...topicMsgs, ...topicMsgBuffer];
  errorBuffer = [...errors, ...errorBuffer];
}

setInterval(flushBuffers, BATCH_INTERVAL_MS);

// --- In-Memory Stats (Cache/Legacy) ---
let dashboardStats = {
  clusterHealth: new Map() // Keep this for health checks
};

let lastFileSize = fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE).size : 0;
let isProcessingLogs = false;

function resetStats() {
  // No-op for DB, maybe truncate? For now, let's just keep history.
  console.log("Log rotation detected. DB persists history.");
}

// --- Kafka Health Check ---
async function checkCluster(bootstrapServers, topicsToCheck = [], isDestination = false) {
  const kafka = new Kafka({
    clientId: 'health-check',
    brokers: bootstrapServers.split(','),
    retry: { retries: 0 }, // Fail fast
    logLevel: logLevel.NOTHING // Silence logs
  });
  const admin = kafka.admin();
  try {
    await admin.connect();
    const clusterInfo = await admin.describeCluster();

    // Fetch processed message counts from DB
    // Filter by TODAY only
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayStr = startOfDay.toISOString();

    const topicMessages = {};

    if (isDestination) {
      // For Destination: Count Successful Transactions (Integrated Messages)
      const countQuery = `SELECT count(*) as count FROM events WHERE status = 'SUCCESS' AND timestamp >= ?`;
      try {
        const row = await new Promise((resolve, reject) => {
          db.get(countQuery, [startOfDayStr], (err, row) => err ? reject(err) : resolve(row));
        });
        // Assign same count to all destination topics (usually just one)
        for (const topic of topicsToCheck) {
          topicMessages[topic] = row ? row.count : 0;
        }
      } catch (e) {
        console.error(`Failed to fetch DB count for destination:`, e.message);
        for (const topic of topicsToCheck) {
          topicMessages[topic] = 0;
        }
      }
    } else {
      // For Source: Count Incoming Messages per Topic
      for (const topic of topicsToCheck) {
        const countQuery = `SELECT count(*) as count FROM topic_messages WHERE topic = ? AND timestamp >= ?`;
        try {
          const row = await new Promise((resolve, reject) => {
            db.get(countQuery, [topic, startOfDayStr], (err, row) => err ? reject(err) : resolve(row));
          });
          topicMessages[topic] = row ? row.count : 0;
        } catch (e) {
          console.error(`Failed to fetch DB count for ${topic}:`, e.message);
          topicMessages[topic] = 0;
        }
      }
    }

    await admin.disconnect();

    return {
      status: "online",
      metadata: {
        clusterId: clusterInfo.clusterId,
        controllerId: clusterInfo.controller,
        brokerCount: clusterInfo.brokers.length,
        topicMessages: topicMessages,
        brokers: clusterInfo.brokers
      }
    };
  } catch (error) {
    // console.error(`Health check failed for ${bootstrapServers}:`, error.message);
    return { status: "offline", metadata: null };
  }
}

async function checkClusterHealth() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return;
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    // Check Source Clusters
    for (const cluster of config.source_clusters) {
      const topicNames = cluster.topics.map(t => t.topic);
      const result = await checkCluster(cluster.bootstrap_servers, topicNames, false);
      dashboardStats.clusterHealth.set(cluster.bootstrap_servers, result);
    }

    // Check Destination Cluster
    if (config.destination_cluster) {
      const topicNames = [config.destination_cluster.topic];
      const result = await checkCluster(config.destination_cluster.bootstrap_servers, topicNames, true);
      dashboardStats.clusterHealth.set(config.destination_cluster.bootstrap_servers, result);
    }
  } catch (e) {
    console.error("Error in health check:", e);
  }
}

// Run health check every 30 seconds
setInterval(checkClusterHealth, 30000);
// Run once on startup
checkClusterHealth();

function processLogLine(line) {
  if (!line || !line.trim()) return;

  // Buffer raw line for FTS/Elastic indexing
  rawLogBuffer.push(line);

  try {
    // Extract timestamp
    let timestamp = new Date().toISOString();
    const match = line.match(/"@?timestamp":"([^"]+)"/);
    if (match) {
      timestamp = new Date(match[1]).toISOString();
    } else {
      const stdMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (stdMatch) timestamp = new Date(stdMatch[1]).toISOString();
    }

    // 1. Topic Messages (Ingestion)
    if (line.includes("Evento recibido del tópico")) {
      const topicMatch = line.match(/Evento recibido del tópico (.+) para correlación/);
      const correlationMatch = line.match(/para correlación ([^"]+)/); // Match until end of quote or string

      if (topicMatch) {
        const topic = topicMatch[1].trim();
        const correlationId = correlationMatch ? correlationMatch[1].trim() : null;

        // Push to buffer
        topicMsgBuffer.push({ topic, correlation_id: correlationId, timestamp });
      }
    }

    // 2. Successful Transactions
    else if (line.includes("Integrated correlation") && line.includes("successfully")) {
      const correlationMatch = line.match(/Integrated correlation ([^ ]+) successfully/);
      const durationMatch = line.match(/successfully in (\d+) ms/);

      if (correlationMatch) {
        const correlationId = correlationMatch[1].trim();
        const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;

        // Push to buffer
        eventBuffer.push({ correlation_id: correlationId, status: 'SUCCESS', duration_ms: duration, timestamp });
      }
    }

    // 3. Timeouts
    else if (line.includes("Transacción expirada")) {
      const correlationMatch = line.match(/timeout: ([^"]+)/);
      if (correlationMatch) {
        const correlationId = correlationMatch[1].trim();

        // Push to buffer
        eventBuffer.push({ correlation_id: correlationId, status: 'TIMEOUT', duration_ms: 0, timestamp });
        // Fix: Include ID in details so frontend can display it and link to traceability
        errorBuffer.push({ correlation_id: correlationId, error_type: 'TIMEOUT', details: `ID: ${correlationId}`, timestamp });
      }
    }

    // 4. Other Errors
    else if (line.includes('"level":"ERROR"')) {
      // Try to extract some details
      const msgMatch = line.match(/"message":"([^"]+)"/);
      const details = msgMatch ? msgMatch[1] : "Unknown Error";

      // Push to buffer
      errorBuffer.push({ correlation_id: null, error_type: 'ERROR', details, timestamp });
    }

  } catch (e) {
    console.error("Error processing log line:", e);
  }
}

function broadcastToClients(line) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(line);
    }
  });
}

function updateLogs() {
  if (isProcessingLogs) return; // Skip if already running
  if (!fs.existsSync(LOG_FILE)) return;

  isProcessingLogs = true;
  try {
    const stats = fs.statSync(LOG_FILE);
    const currentSize = stats.size;

    if (currentSize < lastFileSize) {
      // File rotated (new day or truncated)
      console.log("Log file rotated. Resetting stats.");
      lastFileSize = 0;
      resetStats();
    }

    if (currentSize > lastFileSize) {
      // If reading more than 1MB, assume catch-up and suppress broadcast
      const isCatchUp = (currentSize - lastFileSize) > 1024 * 1024;

      const stream = fs.createReadStream(LOG_FILE, {
        start: lastFileSize,
        end: currentSize,
        encoding: 'utf8'
      });

      let buffer = '';
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        // Keep the last part if it's not a complete line
        buffer = lines.pop();

        lines.forEach(line => {
          if (line.trim()) {
            processLogLine(line);
            if (!isCatchUp) broadcastToClients(line);
          }
        });
      });

      stream.on('end', () => {
        if (buffer.trim()) {
          processLogLine(buffer);
          if (!isCatchUp) broadcastToClients(buffer);
        }
        lastFileSize = currentSize;
        isProcessingLogs = false;
        if (isCatchUp) console.log("Catch-up complete. Resuming broadcasts.");
      });

      stream.on('error', (err) => {
        console.error("Stream error:", err);
        isProcessingLogs = false;
      });
    } else {
      isProcessingLogs = false;
    }
  } catch (e) {
    console.error("Error updating logs:", e);
    isProcessingLogs = false;
  }
}

// Start polling for logs
setInterval(updateLogs, 1000);

// --- API Endpoints ---

// Get Configuration
app.get('/api/config', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Config file not found' });
    }
    const config = fs.readFileSync(CONFIG_FILE, 'utf8');
    res.json(JSON.parse(config));
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// Update Configuration
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON configuration' });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    console.log('Configuration updated');
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error writing config:', error);
    res.status(500).json({ error: 'Failed to write config' });
  }
});

// Test Trigger Endpoint
app.post('/api/test/trigger', async (req, res) => {
  try {
    const { success = 0, error = 0 } = req.body;
    console.log(`Test Trigger: ${success} success, ${error} error`);

    publish(success, error).catch(err => console.error("Error in test trigger:", err));

    res.json({ message: 'Test events triggered', success, error });
  } catch (error) {
    console.error('Error triggering test events:', error);
    res.status(500).json({ error: 'Failed to trigger events' });
  }
});

// On-demand Health Check
app.get('/api/health/check', async (req, res) => {
  try {
    // Get fresh counts from DB to ensure consistency with Dashboard
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayStr = startOfDay.toISOString();

    const freshHealth = {};

    // Helper to get counts
    const getCounts = async (topics, isDestination) => {
      const counts = {};
      if (isDestination) {
        const countQuery = `SELECT count(*) as count FROM events WHERE status = 'SUCCESS' AND timestamp >= ?`;
        const row = await new Promise(resolve => db.get(countQuery, [startOfDayStr], (err, r) => resolve(r)));
        topics.forEach(t => counts[t] = row ? row.count : 0);
      } else {
        for (const t of topics) {
          const countQuery = `SELECT count(*) as count FROM topic_messages WHERE topic = ? AND timestamp >= ?`;
          const row = await new Promise(resolve => db.get(countQuery, [t, startOfDayStr], (err, r) => resolve(r)));
          counts[t] = row ? row.count : 0;
        }
      }
      return counts;
    };

    // Iterate over configured clusters to preserve order/config
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

      // Source Clusters
      for (const cluster of config.source_clusters) {
        const cached = dashboardStats.clusterHealth.get(cluster.bootstrap_servers) || { status: 'pending', metadata: {} };
        const topicNames = cluster.topics.map(t => t.topic);
        const freshCounts = await getCounts(topicNames, false);

        freshHealth[cluster.bootstrap_servers] = {
          ...cached,
          metadata: {
            ...cached.metadata,
            topicMessages: freshCounts
          }
        };
      }

      // Destination Cluster
      if (config.destination_cluster) {
        const cluster = config.destination_cluster;
        const cached = dashboardStats.clusterHealth.get(cluster.bootstrap_servers) || { status: 'pending', metadata: {} };
        const topicNames = [cluster.topic];
        const freshCounts = await getCounts(topicNames, true);

        freshHealth[cluster.bootstrap_servers] = {
          ...cached,
          metadata: {
            ...cached.metadata,
            topicMessages: freshCounts
          }
        };
      }
    }

    res.json(freshHealth);
  } catch (error) {
    console.error("Error in on-demand health check:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Debug Reset Endpoint
app.post('/api/debug/reset', (req, res) => {
  try {
    // 1. Clear In-Memory Buffers
    eventBuffer = [];
    topicMsgBuffer = [];
    errorBuffer = [];
    rawLogBuffer = [];

    // Clear Search Repo
    logRepository.clear().catch(e => console.error("Error clearing log repo:", e));

    // 2. Clear DB Tables
    db.serialize(() => {
      db.run("DELETE FROM events");
      db.run("DELETE FROM topic_messages");
      db.run("DELETE FROM errors");
      db.run("VACUUM", (err) => {
        if (err) {
          console.error("Error resetting DB:", err);
          return res.status(500).json({ error: "Failed to reset DB" });
        }

        // 3. Reset Stats (after DB is clear)
        dashboardStats = {
          clusterHealth: new Map()
        };

        console.log("System state reset via API");
        res.json({ message: "System reset complete" });
      });
    });
  } catch (error) {
    console.error("Error resetting system:", error);
    res.status(500).json({ error: "Failed to reset system" });
  }
});

// Dashboard API - Persistent!
app.get('/api/dashboard', async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayStr = startOfDay.toISOString();

    // 1. Success Stats
    const successQuery = `SELECT count(*) as count, sum(duration_ms) as totalDuration FROM events WHERE status = 'SUCCESS' AND timestamp >= ?`;
    const successStats = await new Promise((resolve, reject) => {
      db.get(successQuery, [startOfDayStr], (err, row) => {
        if (err) reject(err);
        else resolve(row || { count: 0, totalDuration: 0 });
      });
    });

    // 2. Error Stats (Timeouts + Other Errors)
    const timeoutQuery = `SELECT count(*) as count FROM events WHERE status = 'TIMEOUT' AND timestamp >= ?`;
    const errorLogQuery = `SELECT count(*) as count FROM errors WHERE timestamp >= ? AND error_type != 'TIMEOUT'`;

    const [timeoutStats, errorLogStats] = await Promise.all([
      new Promise((resolve, reject) => db.get(timeoutQuery, [startOfDayStr], (err, row) => err ? reject(err) : resolve(row))),
      new Promise((resolve, reject) => db.get(errorLogQuery, [startOfDayStr], (err, row) => err ? reject(err) : resolve(row)))
    ]);

    const errorsToday = (timeoutStats?.count || 0) + (errorLogStats?.count || 0);

    // 3. Recent Errors
    // 3. Recent Errors
    const recentErrorsQuery = `SELECT * FROM errors WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 10`;
    const recentErrors = await new Promise((resolve, reject) => {
      db.all(recentErrorsQuery, [startOfDayStr], (err, rows) => {
        if (err) reject(err);
        else {
          // Map DB rows
          const dbErrors = rows.map(r => ({
            time: new Date(r.timestamp).toLocaleTimeString(),
            event: r.error_type === 'TIMEOUT' ? 'Transacción Expirada' : 'Error de Sistema',
            details: r.details || `ID: ${r.correlation_id}`,
            status: 'error',
            timestamp: new Date(r.timestamp).getTime() // For sorting
          }));

          // Map In-Memory Buffer (to avoid flickering before flush)
          const bufferedErrors = errorBuffer.map(e => ({
            time: new Date(e.timestamp).toLocaleTimeString(),
            event: e.error_type === 'TIMEOUT' ? 'Transacción Expirada' : 'Error de Sistema',
            details: e.details || `ID: ${e.correlation_id}`,
            status: 'error',
            timestamp: new Date(e.timestamp).getTime()
          }));

          // Merge and Sort
          const allErrors = [...bufferedErrors, ...dbErrors]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

          resolve(allErrors);
        }
      });
    });

    // 4. Chart Data (Group by 5-minute intervals, Local Time)
    // Fix: Use 'localtime' modifier to show correct user time
    // Fix: Aggregate by 5 minutes ((Minute / 5) * 5)
    const chartQuery = `
      SELECT 
        strftime('%H:', datetime(timestamp, 'localtime')) || printf('%02d', (strftime('%M', datetime(timestamp, 'localtime')) / 5) * 5) as time, 
        status, 
        count(*) as count 
      FROM events 
      WHERE timestamp >= ? 
      GROUP BY time, status
    `;
    const chartRows = await new Promise((resolve, reject) => {
      db.all(chartQuery, [startOfDayStr], (err, rows) => err ? reject(err) : resolve(rows));
    });

    const chartDataMap = new Map();

    // Pre-fill last 6 buckets (30 mins) to ensure chart continuity
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 5 * 60000);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = (Math.floor(d.getMinutes() / 5) * 5).toString().padStart(2, '0');
      const timeKey = `${hours}:${minutes}`;
      chartDataMap.set(timeKey, { time: timeKey, messages: 0, errors: 0 });
    }

    chartRows.forEach(row => {
      if (!chartDataMap.has(row.time)) {
        chartDataMap.set(row.time, { time: row.time, messages: 0, errors: 0 });
      }
      const entry = chartDataMap.get(row.time);
      if (row.status === 'SUCCESS') entry.messages += row.count;
      else entry.errors += row.count;
    });

    // Fill in gaps? For now just return what we have, frontend handles it.
    const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.time.localeCompare(b.time));

    // 5. Cluster Status (from Memory)
    const sourceClusters = config.source_clusters.map((c, i) => ({
      id: `src-${i}`,
      name: `Source Cluster ${i + 1}`,
      bootstrapServers: c.bootstrap_servers,
      topics: c.topics.map(t => t.topic),
      status: dashboardStats.clusterHealth.get(c.bootstrap_servers)?.status || "pending",
      messagesPerMinute: 0 // Could calculate from DB if needed
    }));

    const destinationCluster = {
      id: "dest-1",
      name: "Destination Cluster",
      bootstrapServers: config.destination_cluster.bootstrap_servers,
      topic: config.destination_cluster.topic,
      status: dashboardStats.clusterHealth.get(config.destination_cluster.bootstrap_servers)?.status || "pending"
    };

    // Latency Metrics (P95, P50, Avg, Max)
    const latencyQuery = `
      SELECT 
        avg(duration_ms) as avg, 
        max(duration_ms) as max 
      FROM events 
      WHERE status = 'SUCCESS' AND timestamp >= ?
    `;
    const latencyBasic = await new Promise((resolve) => {
      db.get(latencyQuery, [startOfDayStr], (err, row) => resolve(row || { avg: 0, max: 0 }));
    });

    const getPercentile = async (percentile) => {
      const offsetQuery = `SELECT cast(count(*) * ? as int) as offset FROM events WHERE status = 'SUCCESS' AND timestamp >= ?`;
      const offset = await new Promise(resolve => db.get(offsetQuery, [percentile, startOfDayStr], (err, row) => resolve(row?.offset || 0)));

      const valQuery = `SELECT duration_ms FROM events WHERE status = 'SUCCESS' AND timestamp >= ? ORDER BY duration_ms ASC LIMIT 1 OFFSET ?`;
      return new Promise(resolve => db.get(valQuery, [startOfDayStr, offset], (err, row) => resolve(row?.duration_ms || 0)));
    };

    const p95 = await getPercentile(0.95);
    const p50 = await getPercentile(0.50);

    res.json({
      dashboardStats: {
        successfulToday: successStats.count,
        errorsToday: errorsToday,
        totalProcessingTime: successStats.totalDuration,
        avgProcessingTime: `${Math.round(latencyBasic.avg || 0)}ms`, // Keep for compat
        latency: {
          avg: Math.round(latencyBasic.avg || 0),
          max: latencyBasic.max || 0,
          p95: p95,
          p50: p50
        },
        lastKafkaConnectionError: 0
      },
      chartData: chartData,
      recentErrors: recentErrors,
      sourceClusters,
      destinationCluster
    });

  } catch (error) {
    console.error("Error generating dashboard data:", error);
    res.status(500).json({ error: "Failed to generate dashboard data" });
  }
});

// Search Logs Endpoint
app.get('/api/logs/search', async (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await logRepository.searchLogs(query);
    res.json(results);
  } catch (error) {
    console.error("Error searching logs:", error);
    res.status(500).json({ error: "Failed to search logs" });
  }
});

// WebSocket for Log Streaming
wss.on('connection', (ws) => {
  console.log('Client connected to log stream');
});

server.listen(PORT, () => {
  console.log(`Sidecar running on http://localhost:${PORT}`);
  console.log(`- API: http://localhost:${PORT}/api/config`);
  console.log(`- Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`- WebSocket: ws://localhost:${PORT}/logs`);
});

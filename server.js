import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Tail } from 'tail';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

// Paths relative to where this script is run (kafka-nexus-hub)
// Assuming ms-tra-transaction-integrator-cobranza is a sibling directory
const BACKEND_DIR = path.resolve(__dirname, '../codigo/ms-tra-transaction-integrator-cobranza');
const CONFIG_FILE = path.join(BACKEND_DIR, 'src/main/resources/config.json');
const LOG_FILE = path.join(BACKEND_DIR, 'logs/integration-events.json');

app.use(cors());
app.use(express.json());
app.use(express.text());

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
    // Validate JSON structure (basic check)
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

// --- WebSocket for Log Streaming ---

wss.on('connection', (ws) => {
  console.log('Client connected to log stream');

  // Send last 50 lines on connection
  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').slice(-50);
    lines.forEach(line => {
      try {
        ws.send(line);
      } catch (e) { /* ignore parse errors for raw lines */ }
    });
  }

  // Polling mechanism instead of Tail
  let currentSize = 0;

  // Initialize current size
  if (fs.existsSync(LOG_FILE)) {
    const stats = fs.statSync(LOG_FILE);
    currentSize = stats.size;
  }

  const checkInterval = setInterval(() => {
    if (!fs.existsSync(LOG_FILE)) return;

    const stats = fs.statSync(LOG_FILE);
    if (stats.size > currentSize) {
      // File grew, read new content
      const stream = fs.createReadStream(LOG_FILE, {
        start: currentSize,
        end: stats.size
      });

      stream.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log("Log read:", line.substring(0, 50) + "..."); // Debug
            if (ws.readyState === ws.OPEN) {
              ws.send(line);
            }
          }
        });
      });

      currentSize = stats.size;
    } else if (stats.size < currentSize) {
      // File rotated or truncated
      currentSize = stats.size;
    }
  }, 1000); // Check every second

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(checkInterval);
  });
});

// --- Dashboard API ---
app.get('/api/dashboard', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    // 1. Clusters Status
    const sourceClusters = config.source_clusters.map((c, i) => ({
      id: `src-${i}`,
      name: `Source Cluster ${i + 1}`,
      bootstrapServers: c.bootstrap_servers,
      topics: c.topics.map(t => t.topic),
      status: "online", // Assumed online if config exists
      messagesPerMinute: Math.floor(Math.random() * 100) // Mock metric for now
    }));

    const destinationCluster = {
      id: "dest-1",
      name: "Destination Cluster",
      bootstrapServers: config.destination_cluster.bootstrap_servers,
      topic: config.destination_cluster.topic,
      status: "online"
    };

    // 2. Stats from Logs
    let successfulToday = 0;
    let errorsToday = 0;
    let totalProcessingTime = 0;
    const chartDataMap = new Map();

    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Global Stats (Independent of timestamp parsing)
        if (line.includes("Integrated correlation") && line.includes("successfully")) {
          successfulToday++;
          // Parse duration: "... successfully in 123 ms"
          const durationMatch = line.match(/successfully in (\d+) ms/);
          if (durationMatch) {
            const duration = parseInt(durationMatch[1], 10);
            totalProcessingTime += duration;
          }
        } else if (line.includes("ERROR") || line.includes("Exception") || line.includes("Transacción expirada") || line.includes("WARN")) {
          errorsToday++;
        }

        try {
          // Chart Data (Requires timestamp)
          // Support both @timestamp and timestamp
          let date;
          const match = line.match(/"@?timestamp":"([^"]+)"/);

          if (match) {
            date = new Date(match[1]);
          } else {
            // Fallback: Use current time if parsing fails but line is valid
            // This ensures chart data is populated even if log format varies
            date = new Date();
          }

          if (date && !isNaN(date.getTime())) {
            const timeKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (!chartDataMap.has(timeKey)) {
              chartDataMap.set(timeKey, { time: timeKey, messages: 0, errors: 0 });
            }

            const entry = chartDataMap.get(timeKey);

            if (line.includes("Integrated correlation") && line.includes("successfully")) {
              entry.messages++;
            } else if (line.includes("ERROR") || line.includes("Exception") || line.includes("Transacción expirada") || line.includes("WARN")) {
              entry.errors++;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    }

    // Convert map to array and sort by time (roughly)
    // For a real app, we'd handle date boundaries better, but this works for "today"
    const chartData = Array.from(chartDataMap.values()).slice(-20); // Last 20 minutes

    const avgTime = successfulToday > 0 ? Math.round(totalProcessingTime / successfulToday) : 0;

    console.log("Generated Chart Data:", JSON.stringify(chartData, null, 2)); // Debug

    const dashboardStats = {
      successfulToday,
      errorsToday,
      avgProcessingTime: `${avgTime}ms`
    };

    res.json({
      sourceClusters,
      destinationCluster,
      dashboardStats,
      chartData
    });

  } catch (error) {
    console.error("Error generating dashboard data:", error);
    res.status(500).json({ error: "Failed to generate dashboard data" });
  }
});

server.listen(PORT, () => {
  console.log(`Sidecar running on http://localhost:${PORT}`);
  console.log(`- API: http://localhost:${PORT}/api/config`);
  console.log(`- Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`- WebSocket: ws://localhost:${PORT}/logs`);
});

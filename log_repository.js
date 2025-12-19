import sqlite3 from 'sqlite3';

// Abstract Base Class (Interface)
class LogRepository {
    async init() { throw new Error("Method 'init' must be implemented."); }
    async indexLogs(logs) { throw new Error("Method 'indexLogs' must be implemented."); }
    async searchLogs(query) { throw new Error("Method 'searchLogs' must be implemented."); }
    async clear() { throw new Error("Method 'clear' must be implemented."); }
}

// --- SQLite FTS5 Implementation (Local / Dev) ---
class SQLiteFTSRepository extends LogRepository {
    constructor(dbPath) {
        super();
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) return reject(err);

                // Increase busy timeout to 5 seconds to handle concurrency
                this.db.configure('busyTimeout', 5000);

                // Enable WAL for concurrency
                this.db.run('PRAGMA journal_mode = WAL;');

                // Create FTS5 Virtual Table
                // content: The full JSON log line
                // timestamp: For sorting/filtering
                this.db.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
            content, 
            timestamp UNINDEXED
          );
        `, (err) => {
                    if (err) reject(err);
                    else {
                        console.log("SQLite FTS5 initialized");
                        resolve();
                    }
                });
            });
        });
    }

    async indexLogs(logs) {
        if (!logs || logs.length === 0) return;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                const stmt = this.db.prepare("INSERT INTO logs_fts (content, timestamp) VALUES (?, ?)");

                logs.forEach(log => {
                    // We store the raw JSON string as content for full-text search
                    const content = typeof log === 'string' ? log : JSON.stringify(log);

                    // Extract timestamp if possible, else now
                    let timestamp = new Date().toISOString();
                    try {
                        const parsed = typeof log === 'string' ? JSON.parse(log) : log;
                        if (parsed.timestamp) timestamp = parsed.timestamp;
                        else if (parsed['@timestamp']) timestamp = parsed['@timestamp'];
                    } catch (e) { }

                    stmt.run(content, timestamp);
                });

                stmt.finalize();
                this.db.run("COMMIT", (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async searchLogs(query) {
        return new Promise((resolve, reject) => {
            // FTS5 Match Query
            // We order by rank (relevance) or timestamp? Usually timestamp for logs.
            // Note: FTS5 doesn't support ORDER BY timestamp efficiently without external rowid join, 
            // but for this scale it's fine.
            const sql = `
        SELECT content FROM logs_fts 
        WHERE logs_fts MATCH ? 
        ORDER BY rowid DESC 
        LIMIT 100
      `;

            // Sanitize query for FTS5 (basic)
            // FTS5 uses double quotes for phrases.
            const safeQuery = `"${query.replace(/"/g, '""')}"`;

            this.db.all(sql, [safeQuery], (err, rows) => {
                if (err) return reject(err);

                const results = rows.map(row => {
                    try {
                        return JSON.parse(row.content);
                    } catch (e) {
                        return { raw: row.content };
                    }
                });
                resolve(results);
            });
        });
    }

    async clear() {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM logs_fts", (err) => {
                if (err) reject(err);
                else {
                    this.db.run("VACUUM", (err) => err ? reject(err) : resolve());
                }
            });
        });
    }
}

// --- Elasticsearch Implementation (Production) ---
class ElasticsearchRepository extends LogRepository {
    constructor(nodeUrl, indexName = 'logs-index') {
        super();
        this.nodeUrl = nodeUrl.replace(/\/$/, ''); // Remove trailing slash
        this.indexName = indexName;
    }

    async init() {
        console.log(`Elasticsearch Repository initialized pointing to ${this.nodeUrl}/${this.indexName}`);
        // Check connection or create index template if needed
        try {
            const res = await fetch(`${this.nodeUrl}/_cat/health`);
            if (!res.ok) console.warn("Elasticsearch health check failed");
        } catch (e) {
            console.warn("Could not connect to Elasticsearch on init (might be down):", e.message);
        }
    }

    async indexLogs(logs) {
        if (!logs || logs.length === 0) return;

        // Bulk API format:
        // { index: { _index: 'my-index' } }
        // { field1: 'value1' }
        let bulkBody = '';
        logs.forEach(log => {
            const content = typeof log === 'string' ? JSON.parse(log) : log;
            bulkBody += JSON.stringify({ index: { _index: this.indexName } }) + '\n';
            bulkBody += JSON.stringify(content) + '\n';
        });

        try {
            const res = await fetch(`${this.nodeUrl}/_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: bulkBody
            });

            if (!res.ok) {
                throw new Error(`Elasticsearch bulk failed: ${res.statusText}`);
            }
            const json = await res.json();
            if (json.errors) {
                console.error("Elasticsearch bulk errors:", JSON.stringify(json.items.filter(i => i.index.error)));
            }
        } catch (e) {
            console.error("Error indexing to Elasticsearch:", e);
        }
    }

    async searchLogs(query) {
        // Simple query_string search
        const searchBody = {
            query: {
                query_string: {
                    query: query,
                    default_operator: "AND"
                }
            },
            sort: [
                { "@timestamp": { "order": "desc", "ignore_unmapped": true } },
                { "timestamp": { "order": "desc", "ignore_unmapped": true } }
            ],
            size: 100
        };

        try {
            const res = await fetch(`${this.nodeUrl}/${this.indexName}/_search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchBody)
            });

            if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);

            const json = await res.json();
            return json.hits.hits.map(hit => hit._source);
        } catch (e) {
            console.error("Error searching Elasticsearch:", e);
            throw e;
        }
    }

    async clear() {
        // Delete by query or delete index
        try {
            await fetch(`${this.nodeUrl}/${this.indexName}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Error clearing Elastic index:", e);
        }
    }
}

// --- Factory ---
export class LogRepositoryFactory {
    static create(type, config) {
        switch (type.toUpperCase()) {
            case 'ELASTIC':
                return new ElasticsearchRepository(config.url, config.index);
            case 'SQLITE':
            default:
                return new SQLiteFTSRepository(config.dbPath);
        }
    }
}

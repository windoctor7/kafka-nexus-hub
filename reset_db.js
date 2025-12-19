import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'dashboard.db');

const db = new sqlite3.Database(DB_FILE);

const runWithRetry = (sql, params = [], retries = 5) => {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            db.run(sql, params, function (err) {
                if (err) {
                    if (err.code === 'SQLITE_BUSY' && n > 0) {
                        console.log(`DB Locked, retrying... (${n} attempts left)`);
                        setTimeout(() => attempt(n - 1), 1000);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(this);
                }
            });
        };
        attempt(retries);
    });
};

const resetViaApi = async () => {
    try {
        const res = await fetch('http://localhost:3001/api/debug/reset', { method: 'POST' });
        if (res.ok) {
            console.log('System reset via API successful. 🚀');
            return true;
        }
    } catch (e) {
        // Ignore error, server might be down
    }
    return false;
};

const clearDb = async () => {
    // Try API first (clears buffers + DB)
    if (await resetViaApi()) {
        process.exit(0);
    }

    console.log('API unavailable, falling back to direct DB reset...');
    try {
        console.log('Clearing all tables...');
        await runWithRetry("DELETE FROM events");
        console.log("Deleted all rows from 'events'");

        await runWithRetry("DELETE FROM topic_messages");
        console.log("Deleted all rows from 'topic_messages'");

        await runWithRetry("DELETE FROM errors");
        console.log("Deleted all rows from 'errors'");

        try {
            await runWithRetry("DELETE FROM logs_fts");
            console.log("Deleted all rows from 'logs_fts'");
        } catch (e) {
            console.log("Skipping 'logs_fts' (table might not exist)");
        }

        await runWithRetry("VACUUM");
        console.log("Database vacuumed.");

        console.log('Database reset complete. 🧹');
        process.exit(0);
    } catch (err) {
        console.error("Error clearing database:", err);
        process.exit(1);
    }
};

clearDb();

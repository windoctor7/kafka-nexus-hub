import sqlite3 from 'sqlite3';

export class IntegratorRepository {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) return reject(err);

                // Ensure table exists
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS integrators (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        wsUrl TEXT,
                        apiUrl TEXT,
                        status TEXT,
                        lastActivity DATETIME DEFAULT CURRENT_TIMESTAMP,
                        configuration TEXT
                    )
                `, (err) => {
                    if (err) reject(err);
                    else {
                        // Migration: Add configuration column if missing
                        this.db.run("ALTER TABLE integrators ADD COLUMN configuration TEXT", (err) => {
                            // Ignore error if column exists
                            console.log("IntegratorRepository initialized");
                            resolve();
                        });
                    }
                });
            });
        });
    }

    async getAll() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM integrators", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async add(integrator) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO integrators (id, name, description, wsUrl, apiUrl, status, lastActivity, configuration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                integrator.id,
                integrator.name,
                integrator.description,
                integrator.wsUrl,
                integrator.apiUrl,
                integrator.status,
                integrator.lastActivity || new Date().toISOString(),
                integrator.configuration ? JSON.stringify(integrator.configuration) : null,
                (err) => {
                    if (err) reject(err);
                    else resolve(integrator);
                }
            );
            stmt.finalize();
        });
    }

    async update(integrator) {
        return new Promise((resolve, reject) => {
            // Check if configuration update is requested
            const hasConfig = integrator.configuration !== undefined;

            const sql = hasConfig
                ? `UPDATE integrators SET name = ?, description = ?, wsUrl = ?, apiUrl = ?, status = ?, lastActivity = ?, configuration = ? WHERE id = ?`
                : `UPDATE integrators SET name = ?, description = ?, wsUrl = ?, apiUrl = ?, status = ?, lastActivity = ? WHERE id = ?`;

            const params = hasConfig
                ? [
                    integrator.name,
                    integrator.description,
                    integrator.wsUrl,
                    integrator.apiUrl,
                    integrator.status,
                    new Date().toISOString(),
                    typeof integrator.configuration === 'object' ? JSON.stringify(integrator.configuration) : integrator.configuration,
                    integrator.id
                ]
                : [
                    integrator.name,
                    integrator.description,
                    integrator.wsUrl,
                    integrator.apiUrl,
                    integrator.status,
                    new Date().toISOString(),
                    integrator.id
                ];

            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else if (this.changes === 0) reject(new Error("Integrator not found"));
                else resolve(integrator);
            });
        });
    }

    async remove(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM integrators WHERE id = ?", [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async updateStatus(id, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                "UPDATE integrators SET status = ?, lastActivity = ? WHERE id = ?",
                [status, new Date().toISOString(), id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

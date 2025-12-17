const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '../codigo/ms-tra-transaction-integrator-cobranza');
const LOG_FILE = path.join(BACKEND_DIR, 'logs/integration-events.json');

const testLog = `{"@timestamp":"${new Date().toISOString()}","level":"WARN","message":"Transacción expirada SIMULADA","logger_name":"Simulated"}\n`;

fs.appendFileSync(LOG_FILE, testLog);
console.log("Appended:", testLog.trim());

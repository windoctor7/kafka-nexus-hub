import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.resolve(__dirname, '../codigo/ms-tra-transaction-integrator-cobranza');
const LOG_FILE = path.join(BACKEND_DIR, 'logs/integration-events.json');

console.log(`Checking log file at: ${LOG_FILE}`);

if (!fs.existsSync(LOG_FILE)) {
    console.error("❌ Log file not found!");
    process.exit(1);
}

const content = fs.readFileSync(LOG_FILE, 'utf8');
const lines = content.split('\n');

console.log(`Found ${lines.length} lines.`);

let successfulToday = 0;
let errorsToday = 0;
const chartDataMap = new Map();

lines.forEach((line, index) => {
    if (!line.trim()) return;

    try {
        if (index < 5) console.log(`[Line ${index}] ${line.substring(0, 100)}...`);

        const match = line.match(/"@timestamp":"([^"]+)"/);

        if (match) {
            const date = new Date(match[1]);
            const timeKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (!chartDataMap.has(timeKey)) {
                chartDataMap.set(timeKey, { time: timeKey, messages: 0, errors: 0 });
            }

            const entry = chartDataMap.get(timeKey);

            if (line.includes("Integrated correlation") && line.includes("successfully")) {
                successfulToday++;
                entry.messages++;
            } else if (line.includes("ERROR") || line.includes("Exception") || line.includes("Transacción expirada") || line.includes("WARN")) {
                errorsToday++;
                entry.errors++;
            }
        } else {
            if (index < 5) console.log(`❌ No timestamp match for line ${index}`);
        }
    } catch (e) {
        console.error("Error parsing line:", e);
    }
});

console.log("\n--- Results ---");
console.log(`Successful: ${successfulToday}`);
console.log(`Errors: ${errorsToday}`);
console.log("Chart Data:", Array.from(chartDataMap.values()));

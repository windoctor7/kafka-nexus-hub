const fs = require('fs');
const path = require('path');

const LOG_FILE = '/Users/ascariquerop/Documents/NCP/codigo/ms-tra-transaction-integrator-cobranza/logs/integration-events.json';

try {
    if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = content.split('\n');
        console.log(`Total lines: ${lines.length}`);
        console.log("First 3 lines:");
        lines.slice(0, 3).forEach((line, i) => console.log(`[${i}] ${line}`));
    } else {
        console.log("File not found");
    }
} catch (e) {
    console.error("Error:", e);
}

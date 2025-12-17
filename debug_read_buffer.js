const fs = require('fs');

const LOG_FILE = '/Users/ascariquerop/Documents/NCP/codigo/ms-tra-transaction-integrator-cobranza/logs/integration-events.json';

console.log(`Reading file: ${LOG_FILE}`);

try {
    const fd = fs.openSync(LOG_FILE, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    console.log(`Bytes read: ${bytesRead}`);
    console.log("Content start:");
    console.log(buffer.toString('utf8', 0, bytesRead));
    fs.closeSync(fd);
} catch (e) {
    console.error("Error:", e);
}

console.log("Starting debug script...");
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/logs');

ws.on('open', function open() {
    console.log('Connected to WebSocket');
});

ws.on('message', function message(data) {
    console.log('Received:', data.toString());
    process.exit(0);
});

ws.on('error', (e) => {
    console.error(e);
    process.exit(1);
});

setTimeout(() => {
    console.log("Timeout waiting for message");
    process.exit(1);
}, 10000);

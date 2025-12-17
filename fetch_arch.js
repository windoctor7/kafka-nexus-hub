const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/windoctor7/kafka-nexus-hub/main/docs/architecture.md';
const dest = path.join(__dirname, 'docs', 'architecture.md');

console.log(`Downloading ${url} to ${dest}...`);

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: ${res.statusCode} ${res.statusMessage}`);
        res.resume();
        return;
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Download completed.');
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});

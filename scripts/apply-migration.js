
import fetch from 'node-fetch';
import fs from 'fs';

const payload = JSON.parse(fs.readFileSync('temp_migration_payload.json', 'utf8'));

async function run() {
    try {
        const response = await fetch('http://localhost:54321/functions/v1/run-migration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
    }
}

run();

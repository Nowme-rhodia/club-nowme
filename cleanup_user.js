
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.error("Could not find URL or Key in .env");
            return;
        }

        const url = urlMatch[1].trim();
        const key = keyMatch[1].trim();

        const endpoint = `${url}/functions/v1/cleanup-test-user`;
        console.log(`Calling ${endpoint}...`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({ email: 'aboneetest@gmail.com' })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Body: ${text}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

run();

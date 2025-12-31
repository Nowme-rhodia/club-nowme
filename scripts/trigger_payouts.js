
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const functionUrl = "https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/run-payouts";
const anonKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
    console.error("❌ Missing VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

async function triggerPayouts() {
    console.log(`🚀 Triggering Payouts via Function: ${functionUrl}`);

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            }
        });

        const status = response.status;
        const text = await response.text();

        console.log(`Response Status: ${status}`);
        console.log(`Response Body: ${text}`);

        if (status === 200) {
            console.log("✅ Success!");
        } else {
            console.error("❌ Failed!");
        }

    } catch (e) {
        console.error("❌ Network Error:", e);
    }
}

triggerPayouts();

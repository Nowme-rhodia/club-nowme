
import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const stripe = new Stripe(envConfig.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function listTransfers() {
    console.log("🔍 Checking Stripe Transfers...");

    try {
        const transfers = await stripe.transfers.list({
            limit: 10,
        });

        console.log(`Found ${transfers.data.length} transfers.`);
        transfers.data.forEach(t => {
            console.log(`- ID: ${t.id} | Amount: ${t.amount / 100} ${t.currency} | Dest: ${t.destination}`);
        });

    } catch (err) {
        console.error("❌ Failed to list transfers:", err.message);
    }
}

listTransfers();

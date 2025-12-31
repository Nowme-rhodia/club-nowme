
import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const stripe = new Stripe(envConfig.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function topUp() {
    console.log("💳 Top Up Platform Account (Test Mode)...");

    try {
        // Create a charge to add funds to the platform's balance
        const charge = await stripe.charges.create({
            amount: 200000, // 2000.00 EUR
            currency: 'eur',
            source: 'tok_visa', // Test card token
            description: 'Test Top Up for Connect Payouts',
        });

        console.log(`✅ Top Up Successful! Charge ID: ${charge.id}`);
        console.log(`   Amount: 2000.00 EUR`);
        console.log(`   Status: ${charge.status}`);

    } catch (err) {
        console.error("❌ Top Up Failed:", err.message);
    }
}

topUp();

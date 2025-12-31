
import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const stripe = new Stripe(envConfig.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function checkBalance() {
    console.log("💰 Checking Balance...");
    const balance = await stripe.balance.retrieve();
    console.log(JSON.stringify(balance, null, 2));
}

checkBalance();


const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error('Missing STRIPE_SECRET_KEY');
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);
const TARGET_EMAIL = 'mylen.nicolas@gmail.com';

function safeDate(ts) {
    if (!ts) return 'None';
    try {
        return new Date(ts * 1000).toISOString();
    } catch (e) {
        return `Invalid(${ts})`;
    }
}

async function inspectMylene() {
    console.log(`🔍 Deep inspection for: ${TARGET_EMAIL}`);

    const customers = await stripe.customers.list({
        email: TARGET_EMAIL,
        limit: 1
    });

    if (customers.data.length === 0) {
        console.error('❌ No customer found.');
        return;
    }

    const customer = customers.data[0];
    console.log(`✅ Customer ID: ${customer.id}`);
    console.log(`   Balance: ${customer.balance}`);
    console.log(`   Created: ${safeDate(customer.created)}`);
    console.log(`   Delinquent: ${customer.delinquent}`);

    const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 5,
        status: 'all' // Fetch ALL statuses
    });

    console.log(`\n📋 Subscriptions found: ${subscriptions.data.length}`);

    if (subscriptions.data.length === 0) {
        console.log("   (No subscriptions returned by Stripe)");
    }

    subscriptions.data.forEach((sub, i) => {
        console.log(`\n--- Subscription #${i + 1} ---`);
        console.log(`ID: ${sub.id}`);
        console.log(`Status: ${sub.status}`); // active, incomplete, past_due, etc.
        console.log(`Created: ${safeDate(sub.created)}`);
        console.log(`Current Period End: ${safeDate(sub.current_period_end)}`);
        console.log(`Trial End: ${safeDate(sub.trial_end)}`);
        console.log(`Discount: ${sub.discount ? JSON.stringify(sub.discount) : 'None'}`);

        if (sub.latest_invoice) {
            console.log(`Latest Invoice ID: ${typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id}`);
        }

        if (sub.items && sub.items.data) {
            sub.items.data.forEach(item => {
                const amount = item.price.unit_amount ? item.price.unit_amount / 100 : 0;
                console.log(`   Plan: ${item.price.nickname || 'Unknown'} - ${amount.toFixed(2)} ${item.price.currency.toUpperCase()}`);
            });
        }

        // Check for invoices
        checkInvoices(sub.latest_invoice);
    });

    // Also list recent invoices for the customer to see if any are unpaid/void
    console.log(`\n📋 Recent Invoices for Customer:`);
    const invoices = await stripe.invoices.list({
        customer: customer.id,
        limit: 3
    });

    invoices.data.forEach(inv => {
        console.log(`   Invoice ${inv.id}: Status=${inv.status}, Paid=${inv.paid}, Amount=${inv.amount_due / 100}`);
    });
}

async function checkInvoices(invoiceId) {
    if (!invoiceId || typeof invoiceId !== 'string') return;
    try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        console.log(`\n   📄 Invoice Details for ${invoiceId}:`);
        console.log(`      Status: ${invoice.status}`);
        console.log(`      Paid: ${invoice.paid}`);
        console.log(`      Amount due: ${invoice.amount_due}`);
        console.log(`      Amount paid: ${invoice.amount_paid}`);
    } catch (e) {
        console.error('      Error fetching invoice:', e.message);
    }
}

inspectMylene();

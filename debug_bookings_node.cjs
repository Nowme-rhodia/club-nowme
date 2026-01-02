
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid dependency issues if dotenv is missing
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            });
            console.log('.env loaded.');
        } else {
            console.warn('.env file not found.');
        }
    } catch (e) {
        console.error('Error loading .env', e);
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('Key:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectBookings() {
    console.log("Fetching bookings...");
    // Use 'count' to verify connection

    // Select specific columns to debug penalties
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, created_at, status, amount, cancelled_by_partner, cancellation_reason, cancelled_at")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching bookings:", error);
        return;
    }

    console.log(`Found ${bookings.length} recent bookings.`);

    const cancelled = bookings.filter(b => b.status === 'cancelled');
    console.log(`Found ${cancelled.length} cancelled bookings in the last 20.`);

    cancelled.forEach(b => {
        console.log("------------------------------------------------");
        console.log(`Booking ID: ${b.id}`);
        console.log(`Created At: ${b.created_at}`);
        console.log(`Status: ${b.status}`);
        console.log(`Amount: ${b.amount}`);
        console.log(`Cancelled By Partner: ${b.cancelled_by_partner} (${typeof b.cancelled_by_partner})`);
        console.log(`Cancellation Reason: ${b.cancellation_reason}`);
        console.log(`Penalty Amount: ${b.penalty_amount}`);
        console.log(`Cancelled At: ${b.cancelled_at}`);
    });
}

inspectBookings().catch(console.error);

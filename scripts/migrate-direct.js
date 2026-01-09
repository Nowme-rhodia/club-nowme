
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL missing in .env");
    process.exit(1);
}

const client = new pg.Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        console.log("Connecting to Database...");
        await client.connect();
        console.log("✅ Connected.");

        const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260109_add_slugs.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Migration file not found: ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`Executing migration: 20260109_add_slugs.sql...`);
        await client.query(sql);
        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

run();

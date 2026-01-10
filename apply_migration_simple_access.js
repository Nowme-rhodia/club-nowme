
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs'
import path from 'path'
import 'dotenv/config'

async function applyMigration() {
    console.log("🚀 Applying migration: 20260109_add_simple_access_type.sql")

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is not set in environment.")
        process.exit(1)
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log("✅ Connected to database.")

        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260109_add_simple_access_type.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        await client.query(sql)
        console.log("✅ SQL Migration applied successfully.")

    } catch (err) {
        console.error("❌ Error applying migration:", err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

applyMigration()

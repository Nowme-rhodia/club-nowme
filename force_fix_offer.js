import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function forcedUpdate() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const offerId = '22f89587-ed11-40da-9d56-8e3b57df1281';

        // Force set slug and dates
        const query = `
      UPDATE offers 
      SET 
        slug = 'sejour-grece-2026',
        event_start_date = '2026-05-01 10:00:00+00',
        event_end_date = '2026-05-08 10:00:00+00',
        is_online = true
      WHERE id = $1
      RETURNING id, title, slug, event_start_date, event_end_date;
    `;

        const res = await client.query(query, [offerId]);
        console.log('Update result:', res.rows[0]);

    } catch (err) {
        console.error('Database connection error', err);
    } finally {
        await client.end();
    }
}

forcedUpdate();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFullSchema() {
    const tables = ['offers', 'offer_variants'];
    let output = '';

    for (const table of tables) {
        output += `\n--- Table: ${table} ---\n`;
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            output += `Error: ${error.message}\n`;
            continue;
        }

        if (data && data.length > 0) {
            output += `Columns: ${Object.keys(data[0]).join(', ')}\n`;
            //output += `Sample: ${JSON.stringify(data[0], null, 2)}\n`;
        } else {
            output += `No rows found.\n`;
        }
    }

    fs.writeFileSync('schema_output.txt', output);
    console.log('Schema written to schema_output.txt');
}

inspectFullSchema();

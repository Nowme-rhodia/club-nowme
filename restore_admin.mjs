
import fs from 'fs';
import path from 'path';

try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
        }
    });

    const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !ANON_KEY) {
        console.error('Missing URL or KEY in .env');
        process.exit(1);
    }

    // Function URL
    // If local: http://localhost:54321/functions/v1/admin-maintenance
    // If prod: check URL from env or construct
    const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-maintenance`;

    console.log(`Invoking: ${FUNCTION_URL}`);

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'admin@admin.fr',
            password: 'AdminSecure!2026',
            action: 'reset'
        })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

} catch (err) {
    console.error('Error:', err);
}

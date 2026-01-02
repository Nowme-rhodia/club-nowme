import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Required environment variables (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPolicies() {
    console.log(`Connecting to Supabase: ${supabaseUrl}`);
    console.log("Applying Storage Policies...");

    // We use the postgres_meta rpc or direct SQL via a specialized function if available.
    // However, with just the JS client, we often can't run raw SQL unless we have a specific function exposed.
    // BUT! We can try to use the 'rpc' method if we have a function to run SQL, OR we might be stuck if the user doesn't have a way to run SQL remotely.

    // BETTER APPROACH: Since we have the service role key, we can use the Storage API to at least upload the file? 
    // NO, the error is happening from the CLIENT side (browser) which uses the ANON key.
    // The browser upload is blocked because the policy doesn't exist.

    // We need to apply the SQL. Since I cannot run `supabase db push` (user didn't give me CLI access/login), 
    // I will try to use a little trick: I will create a function via the REST API if possible, or assume the user has a `exec_sql` function.
    // Checking previous conversations/files... 
    // It seems I don't have a generic SQL runner.

    // ALTERNATIVE: I will instruct the user to run the SQL in their Supabase Dashboard SQL Editor.
    // But wait, I can try to fix it by uploading via a server-side function (Edge Function)? No that's too complex.

    // Let's print the SQL for the user to run.
    console.log("\n❌ AUTOMATIC POLICY APPLICATION FAILED: The JS client cannot execute raw SQL to create policies.");
    console.log("⚠️ PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD -> SQL EDITOR:\n");
    console.log(`
    -- Policy: Partners can manage their own attachments
    CREATE POLICY "Partners can manage their own attachments"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'offer-attachments' AND
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM partners WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'offer-attachments' AND
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM partners WHERE user_id = auth.uid()
      )
    );

    -- Policy: Customers can download purchased files
    CREATE POLICY "Customers can download purchased files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'offer-attachments' AND
      EXISTS (
        SELECT 1 
        FROM bookings b
        JOIN offers o ON b.offer_id = o.id
        WHERE 
          b.user_id = auth.uid() AND 
          (b.status = 'confirmed' OR b.status = 'paid') AND
          o.digital_product_file = name
      )
    );
    `);
}

applyPolicies();

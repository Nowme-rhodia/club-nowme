import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    const { query } = await req.json();
    const sql = query;

    if (!sql) {
        return new Response(JSON.stringify({ error: "Missing query in body" }), { status: 400 });
    }

    try {
        // Try using the 'exec_sql' RPC if it exists (created by db-migrate.js)
        // If not, we might need another way, but typically 'exec_sql' is the standard way to run DDL via PostgREST/Client if enabled.
        // However, with Service Role Key, we might be able to use the raw SQL execution if configured?
        // Actually, 'exec_sql' RPC is the defined entry point in the project scripts.

        // We can also try to CREATE the RPC if it doesn't exist, but we need raw SQL capabilities for that.
        // Let's assume exec_sql exists or we are trying to add columns.

        // Attempt 1: RPC
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error("RPC Error:", error);
            // If RPC missing, we are stuck unless we have direct connection string.
            // But 'db-migrate.js' creates it.
            return new Response(JSON.stringify({ error }), { status: 400 });
        }

        return new Response(JSON.stringify({ message: "Migration executed successfully" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});

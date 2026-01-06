
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/utils/cors.ts";
import { logger } from "../_shared/utils/logging.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
    // 1. Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        // 2. Auth Check (JWT)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Validate User Token manually or via getUser
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 3. Parse Body
        const { partner_id, amount } = await req.json();

        if (!partner_id || !amount) {
            throw new Error("Missing required fields: partner_id, amount");
        }

        logger.info(`Processing user debit: User ${user.id} -> Partner ${partner_id} (${amount}€)`);

        // 4. Execute Debit (RPC)
        // Runs with Service Key because RPC is SECURITY DEFINER (elevated) but we want to log it via Admin client if needed?
        // Actually the RPC is safe to call.
        const { data: result, error: rpcError } = await supabaseAdmin.rpc("debit_wallet", {
            p_user_id: user.id, // Derived from Token, SECURE.
            p_partner_id: partner_id,
            p_amount_raw: amount,
            p_description: `Mobile Payment by User`
        });

        if (rpcError) {
            logger.error(`RPC Error: ${rpcError.message}`);
            throw rpcError;
        }

        // 5. Return Result
        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        logger.error("Error in handle-wallet-debit", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "Internal Server Error"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        const serverTime = new Date();
        const serverTimeISO = serverTime.toISOString();

        const { data: allNewsletters, error } = await supabase
            .from("admin_newsletters")
            .select("*");

        const analysis = allNewsletters?.map(n => {
            const scheduled = new Date(n.scheduled_at);
            const isDue = scheduled <= serverTime;
            return {
                id: n.id,
                subject: n.subject,
                status: n.status,
                scheduled_at: n.scheduled_at,
                server_time: serverTimeISO,
                is_due: isDue,
                time_diff_ms: scheduled.getTime() - serverTime.getTime()
            };
        });

        return new Response(JSON.stringify({
            server_now: serverTimeISO,
            rows: analysis,
            error
        }, null, 2), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Find past unrewarded squads
        const now = new Date().toISOString();
        const { data: squads, error: squadError } = await supabase
            .from('micro_squads')
            .select('id, title, creator_id, date_event')
            .lt('date_event', now)
            .eq('is_rewarded', false)
            .neq('status', 'cancelled') // Assuming cancelled status exists or relying on date
            .limit(50); // Process in batches

        if (squadError) throw squadError;

        const results = [];

        for (const squad of squads) {
            // 2. Count participants
            const { count, error: countError } = await supabase
                .from('squad_members')
                .select('*', { count: 'exact', head: true })
                .eq('squad_id', squad.id);

            if (countError) {
                console.error(`Error counting members for squad ${squad.id}:`, countError);
                continue;
            }

            const participantCount = count || 0;
            let rewarded = false;

            // 3. Award Points if Criteria Met (> 3 participants)
            // Note: Check if Creator is also a member? Assuming yes/no doesn't matter, usually creator attends.
            // Rule: > 3 (meaning 3 + creator? or 3 total?)
            // Let's assume 3 total participants including creator if they are in members table.
            // Usually creator is NOT in members table explicitly unless joined.
            // Let's say 3 attendees.

            if (participantCount >= 3) {
                const { error: awardError } = await supabase.rpc('award_points', {
                    p_user_id: squad.creator_id,
                    p_amount: 50,
                    p_reason: `Bonus Organisation: ${squad.title}`,
                    p_metadata: { squad_id: squad.id, participants: participantCount }
                });

                if (awardError) {
                    console.error(`Error awarding points for squad ${squad.id}:`, awardError);
                } else {
                    rewarded = true;
                }
            }

            // 4. Mark as processed
            await supabase
                .from('micro_squads')
                .update({ is_rewarded: true })
                .eq('id', squad.id);

            results.push({
                squad_id: squad.id,
                participants: participantCount,
                rewarded: rewarded
            });
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, details: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});

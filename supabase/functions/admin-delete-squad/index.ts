
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/utils/index.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
    if (req.method === "OPTIONS") return handleCors(req);

    try {
        const { squadId } = await req.json();
        const authHeader = req.headers.get('Authorization');

        if (!squadId) {
            return new Response(JSON.stringify({ error: "squadId manquant" }), { status: 400, headers: corsHeaders });
        }

        // 1. Initialize Supabase Clients
        const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 2. Verify Caller is Admin (Security)
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "User not found" }), { status: 401, headers: corsHeaders });
        }

        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

        if (!profile?.is_admin) {
            return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), { status: 403, headers: corsHeaders });
        }

        // 3. Fetch Squad Details & Creator Email (Before Deletion)
        const { data: squad, error: squadError } = await supabaseAdmin
            .from('micro_squads')
            .select(`
            title, 
            creator_id,
            creator:user_profiles!creator_id (
                email,
                first_name
            )
        `)
            .eq('id', squadId)
            .single();

        if (squadError || !squad) {
            return new Response(JSON.stringify({ error: "Squad not found" }), { status: 404, headers: corsHeaders });
        }

        const creatorEmail = squad.creator?.email;
        const creatorName = squad.creator?.first_name || "Kiffeuse";
        const squadTitle = squad.title;

        // 4. Delete the Squad
        const { error: deleteError } = await supabaseAdmin
            .from('micro_squads')
            .delete()
            .eq('id', squadId);

        if (deleteError) throw deleteError;

        // 5. Send Notification Email (Benevolent)
        if (creatorEmail) {
            const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Information concernant votre sortie</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
    <h2 style="color: #BF2778; margin-top: 0;">Bonjour ${creatorName},</h2>
    <p>Nous vous informons que votre sortie <strong>"${squadTitle}"</strong> a été retirée de la plateforme par nos modérateurs.</p>
    <p>Cela arrive parfois si une sortie ne correspond pas exactement à la charte de la communauté ou pour des raisons d'organisation.</p>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px; margin: 30px 0;">
    <h3 style="color: #856404; margin-top: 0;">💪 Ne vous découragez pas !</h3>
    <p style="color: #856404; margin: 0;">
      La communauté adore vos initiatives. Nous vous encourageons vivement à proposer une <strong>nouvelle sortie</strong> ! 
      Vérifiez simplement qu'elle respecte bien nos guidelines.
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://club.nowme.fr/community-space" style="background-color: #BF2778; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold;">
      ✨ Proposer une nouvelle sortie
    </a>
  </div>

  <p style="font-size: 14px; color: #666; text-align: center; margin-top: 40px;">
    L'équipe Nowme 💕
  </p>
</body>
</html>`;

            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: "Nowme Club <contact@nowme.fr>",
                    to: creatorEmail,
                    subject: `Information concernant votre sortie "${squadTitle}"`,
                    html
                })
            });
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });

    } catch (error: any) {
        console.error("Error in admin-delete-squad:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});

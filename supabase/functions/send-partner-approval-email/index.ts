import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    console.log("DEBUG: Request received", req.method)

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        // Debug Phase: Check Env Vars
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

        if (!RESEND_API_KEY) throw new Error("Missing Env: RESEND_API_KEY")
        if (!SUPABASE_URL) throw new Error("Missing Env: SUPABASE_URL")
        if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Env: SUPABASE_SERVICE_ROLE_KEY")

        console.log("DEBUG: Env vars present")

        const resend = new Resend(RESEND_API_KEY)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Debug Phase: Parse Body
        let payload;
        try {
            payload = await req.json()
        } catch (e) {
            throw new Error("Failed to parse JSON body")
        }

        console.log("DEBUG: Payload:", JSON.stringify(payload))
        const record = payload.record

        if (!record || !record.id) {
            throw new Error("Invalid payload: No record/id found")
        }

        console.log("DEBUG: Processing approval for:", record.id)

        // 1. Fetch Partner
        const { data: partner, error: fetchError } = await supabase
            .from('partners')
            .select('welcome_sent, contact_email, contact_name')
            .eq('id', record.id)
            .single()

        if (fetchError || !partner) {
            console.error("DEBUG: Partner fetch error:", fetchError)
            throw new Error("Partner not found in DB")
        }
        console.log("DEBUG: Partner email:", partner.contact_email)

        // 2. Resolve User & Generate Password (The Pivot)
        // 2. Resolve User & Generate Password (The Pivot)
        console.log("DEBUG: Resolving Auth User...")
        let userId: string | null = null;

        try {
            // Attempt 1: Create User
            // Note: createUser throws if user exists in some client versions
            const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
                email: partner.contact_email,
                email_confirm: true,
                user_metadata: { full_name: partner.contact_name, role: 'partner' }
            })

            if (createError) throw createError;
            if (createdUser?.user) {
                userId = createdUser.user.id;
            }
        } catch (err: any) {
            // Catch "User already exists" error
            // Check for various error shapes (Supabase AuthApiError usually has code or message)
            const isUserExistsError =
                err.code === "email_exists" ||
                (err.message && (err.message.includes("already registered") || err.message.includes("unique constraint")));

            if (isUserExistsError) {
                console.log("DEBUG: User already exists (via Catch). Fetching ID via Admin Link Hack...");

                // Fallback: Use generateLink to retrieve the User object
                const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: partner.contact_email
                });

                if (linkData?.user) {
                    userId = linkData.user.id;
                } else {
                    console.error("DEBUG: Could not resolve User ID even via generateLink hack:", linkErr);
                    throw new Error("User exists but ID resolution failed: " + (linkErr?.message || "Unknown"));
                }
            } else {
                // Real error
                console.error("DEBUG: Create User Failed:", err);
                throw err;
            }
        }

        if (!userId) throw new Error("Failed to resolve User ID");
        console.log("DEBUG: User ID Resolved:", userId);

        // 3. Generate & Set Random Password
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
        const tempPassword = Array(12).fill(null).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
        console.log("DEBUG: Password generated. Updating user...");

        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                password: tempPassword,
                email_confirm: true,
                user_metadata: { email_verified: true }
            }
        );

        if (updateError) throw new Error("Failed to set password: " + updateError.message);

        // 3b. Link User to Partner Record (Critical)
        await supabase.from('partners').update({ user_id: userId }).eq('id', record.id);

        // 4. Send Email
        console.log("DEBUG: Sending email...")
        const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || 'https://club.nowme.fr';
        const loginUrl = `${publicSiteUrl}/auth/signin`;

        try {
            const { error: emailError } = await resend.emails.send({
                from: "Nowme Club <admin@nowme.fr>",
                to: [partner.contact_email],
                subject: "Bienvenue chez Nowme ! Vos accès Partenaire 🚀",
                html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #D33D8D;">Félicitations ! Votre compte Partenaire est validé 🎉</h1>
                
                <p>Bonjour ${partner.contact_name || ''},</p>
                
                <p>Nous avons le plaisir de vous annoncer que votre demande de partenariat a été validée par notre équipe !</p>
                <p>Vous pouvez dès maintenant accéder à votre espace pour configurer vos offres.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin-bottom: 10px;"><strong>Vos identifiants de connexion :</strong></p>
                    <p>Email : <strong>${partner.contact_email}</strong></p>
                    <p>Mot de passe temporaire : <br/>
                    <strong style="color: #D33D8D; font-size: 1.4em; letter-spacing: 1px; background: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px;">${tempPassword}</strong></p>
                </div>

                <p style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}" style="background-color: #D33D8D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                      Accéder à mon Espace Partenaire
                    </a>
                </p>
                
                <p><em>Nous vous conseillons de changer ce mot de passe dès votre première connexion via la page "Mon Profil".</em></p>
                <p>À très vite,<br>L'équipe Nowme Club 💜</p>
            </div>
                `
            })

            if (emailError) {
                console.error("DEBUG: Resend API returned error:", emailError)
                throw new Error("Resend Error: " + JSON.stringify(emailError));
            } else {
                console.log("DEBUG: Email sent successfully via Resend")
            }
        } catch (err) {
            console.error("DEBUG: Resend Exception:", err)
            throw err;
        }

        // 5. Update DB
        await supabase.from('partners').update({ welcome_sent: true }).eq('id', record.id)
        console.log("DEBUG: welcome_sent updated")

        return new Response(JSON.stringify({ success: true, debug_message: "Process Complete", type: "password_reset" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error: any) {
        console.error("DEBUG: FATAL EXCEPTION:", error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            debug_tip: "Check Secrets in Supabase Dashboard"
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })
    }
})

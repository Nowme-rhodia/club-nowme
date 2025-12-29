import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
        const payload = await req.json()
        const record = payload.record

        if (!record || !record.id) {
            throw new Error("Invalid payload: No record found")
        }

        console.log("Processing approval for partner:", record.id)

        // 1. Idempotency Check (DB Double Check)
        const { data: partner, error: fetchError } = await supabase
            .from('partners')
            .select('welcome_sent, contact_email, contact_name')
            .eq('id', record.id)
            .single()

        if (fetchError || !partner) {
            throw new Error("Partner not found")
        }

        if (partner.welcome_sent) {
            console.log("Welcome email already sent. Skipping.")
            return new Response(JSON.stringify({ message: "Already sent" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            })
        }

        // 2. Generate Magic Link
        // We use the email from the partner record to generate a link
        // Action type 'signup' or 'recovery'. 'recovery' allows setting a password.
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: partner.contact_email,
            options: {
                redirectTo: `${Deno.env.get("PUBLIC_SITE_URL") || 'https://nowme.club'}/dashboard/partner`
            }
        })

        if (linkError) {
            console.error("Error generating link:", linkError)
            throw linkError
        }

        const magicLink = linkData.properties.action_link
        console.log("Magic Link generated successfully")

        // 3. Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: "Nowme <contact@nowme.io>",
            to: [partner.contact_email],
            subject: "Bienvenue chez Nowme ! Votre compte est validé 🎉",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #BF2778;">Félicitations ${partner.contact_name || ''} ! 🚀</h1>
            <p>Votre compte partenaire <strong>Nowme</strong> a été validé par notre équipe.</p>
            <p>Vous faites désormais partie de l'aventure !</p>
            
            <p>Pour accéder à votre espace et créer votre mot de passe, cliquez sur le lien ci-dessous (valable 24h) :</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="background-color: #BF2778; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Activer mon compte</a>
            </p>
            
            <p>Une fois connecté, vous pourrez :</p>
            <ul>
                <li>Compléter votre profil public</li>
                <li>Publier vos premières offres</li>
                <li>Suivre vos réservations</li>
            </ul>
            
            <p style="margin-top: 40px; font-size: 12px; color: #64748b;">
                Si le bouton ne fonctionne pas, copiez ce lien : <br/>${magicLink}
            </p>
        </div>
            `
        })

        if (emailError) {
            console.error("Resend Error:", emailError)
            throw emailError
        }

        // 4. Update welcome_sent flag
        const { error: updateError } = await supabase
            .from('partners')
            .update({ welcome_sent: true })
            .eq('id', record.id)

        if (updateError) {
            console.error("Failed to update welcome_sent:", updateError)
            // We still return success as email was sent
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error: any) {
        console.error("Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})

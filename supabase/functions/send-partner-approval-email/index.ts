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

        // 2. Generate Magic Link (Create User if needed)
        let magicLink: string | undefined;
        const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") || 'https://nowme.club';

        console.log("DEBUG: Generating link via Admin API...")
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: partner.contact_email,
            options: { redirectTo: `${publicSiteUrl}/auth/update-password` }
        })

        if (!linkError && linkData) {
            console.log("DEBUG: Link generated (User existed)")
            magicLink = linkData.properties.action_link
        } else if (linkError && linkError.message && linkError.message.includes("not found")) {
            console.log("DEBUG: User not found. Creating user...")

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: partner.contact_email,
                email_confirm: true,
                user_metadata: { full_name: partner.contact_name, role: 'partner' }
            })

            if (createError) {
                console.error("DEBUG: Creator user failed:", createError)
                throw createError
            }

            console.log("DEBUG: User created. Retrying link generation...")
            const { data: newLinkData, error: newLinkError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: partner.contact_email,
                options: { redirectTo: `${publicSiteUrl}/auth/update-password` }
            })

            if (newLinkError) throw newLinkError
            magicLink = newLinkData.properties.action_link
        } else {
            console.error("DEBUG: Link generation error:", linkError)
            throw linkError
        }

        if (!magicLink) throw new Error("Magic Link is undefined after logic")

        console.log("DEBUG: MAGIC LINK GENERATED successfully")
        console.log(">>> MAGIC LINK:", magicLink)

        // 3. Send Email
        console.log("DEBUG: Sending email...")
        try {
            const { error: emailError } = await resend.emails.send({
                from: "Nowme <contact@nowme.fr>", // Changed to .fr based on logs
                to: [partner.contact_email],
                subject: "Bienvenue chez Nowme ! Votre compte est validé 🎉",
                html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Félicitations ${partner.contact_name || ''} ! 🚀</h1>
                <p>Votre compte partenaire est validé.</p>
                <p><a href="${magicLink}">Cliquez ici pour activer votre compte</a></p>
            </div>
                `
            })

            if (emailError) {
                console.error("DEBUG: Resend API returned error:", emailError)
            } else {
                console.log("DEBUG: Email sent successfully via Resend")
            }
        } catch (err) {
            console.error("DEBUG: Resend Exception:", err)
        }

        // 4. Update DB
        await supabase.from('partners').update({ welcome_sent: true }).eq('id', record.id)
        console.log("DEBUG: welcome_sent updated")

        return new Response(JSON.stringify({ success: true, debug_message: "Process Complete", magic_link: magicLink }), {
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
            status: 200 // Return 200 to verify error in client
        })
    }
})

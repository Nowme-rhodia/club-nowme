import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface RequestPayload {
  record: {
    id: string;
    contact_email: string;
    contact_name: string;
    business_name: string;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || 'https://club.nowme.fr';

    if (!RESEND_API_KEY) throw new Error("Missing Env: RESEND_API_KEY")
    if (!SUPABASE_URL) throw new Error("Missing Env: SUPABASE_URL")
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Env: SUPABASE_SERVICE_ROLE_KEY")

    const resend = new Resend(RESEND_API_KEY)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const payload: RequestPayload = await req.json()
    const { record } = payload

    if (!record || !record.id || !record.contact_email) {
      throw new Error("Invalid payload: Missing recordId or email")
    }

    console.log(`Sending reminder to ${record.contact_email} (ID: ${record.id})`)

    // Send Email
    const { error: emailError } = await resend.emails.send({
      from: "Nowme Club <admin@nowme.fr>",
      to: [record.contact_email],
      subject: "💎 Plus que 48h pour valider votre statut Partenaire Premium",
      html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #D33D8D; font-size: 24px;">Votre vitrine vous attend, ${record.contact_name || 'Partenaire'} ! ✨</h1>
                </div>
                
                <p>Bonjour ${record.contact_name || ''},</p>
                
                <p>Nous avons remarqué que vote demande pour <strong>${record.business_name || 'votre établissement'}</strong> a été pré-approuvée, mais vous n'avez pas encore finalisé la création de votre compte.</p>
                
                <p><strong>C'est vraiment dommage de s'arrêter si près du but !</strong> 😯</p>
                
                <p>En finalisant votre inscription maintenant, vous pourrez :</p>
                <ul style="list-style-type: none; padding-left: 0;">
                    <li style="margin-bottom: 10px;">✅ <strong>Publier vos offres exclusives</strong> auprès de notre communauté engagée.</li>
                    <li style="margin-bottom: 10px;">🚀 <strong>Gagner en visibilité</strong> immédiatement.</li>
                    <li style="margin-bottom: 10px;">💳 <strong>Recevoir vos premiers paiements</strong> sans attendre.</li>
                </ul>

                <p style="background-color: #fff1f2; color: #be123c; padding: 15px; border-radius: 8px; border: 1px solid #fda4af;">
                    ⚠️ <strong>Attention :</strong> Pour des raisons de sécurité, les demandes non finalisées sont supprimées automatiquement au bout de 7 jours. 
                    <br/><strong>Il vous reste moins de 48h pour activer votre compte.</strong>
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${PUBLIC_SITE_URL}/partenaire/creation-compte?email=${encodeURIComponent(record.contact_email)}" 
                       style="background-color: #D33D8D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block;">
                       👉 Finaliser mon compte maintenant
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                    Si vous avez perdu votre lien d'activation, cliquez simplement sur le bouton ci-dessus pour reprendre là où vous en étiez.
                </p>
                
                <p>À très vite dans le Club !<br>L'équipe Nowme 💜</p>
            </div>
            `
    })

    if (emailError) throw new Error("Resend Error: " + JSON.stringify(emailError))

    // Update DB flag
    const { error: updateError } = await supabase
      .from('partners')
      .update({ reminder_sent: true })
      .eq('id', record.id)

    if (updateError) throw new Error("DB Update Error: " + updateError.message)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error: any) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})

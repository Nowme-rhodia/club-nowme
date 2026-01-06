import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Send Payment Failed Email Function Invoked")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, invoiceId, amount, retryLink } = await req.json()

        if (!email) {
            throw new Error('Email is required.')
        }

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY is missing")
            return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500, headers: corsHeaders })
        }

        const subject = `⚠️ Échec de paiement - Action requise sous 48h`;
        const htmlContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #DC2626;">Paiement refusé</h1>
                <p>Oups ! Le prélèvement pour votre échéance NowMe n'a pas pu être effectué.</p>
                
                <div style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #B91C1C;">Montant : ${amount}€</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #991B1B;">Facture n°${invoiceId || 'N/A'}</p>
                </div>

                <h3>Que faire ?</h3>
                <p>Vous avez <strong>48 heures</strong> pour régulariser votre situation avant que votre plan de paiement (et vos réservations) ne soit suspendu.</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${retryLink || 'https://club.nowme.fr/mon-compte'}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Régulariser le paiement
                    </a>
                </p>

                <p>Si vous avez déjà mis à jour votre carte, le prélèvement sera retenté automatiquement.</p>

                <p>Besoin d'aide ? Répondez à cet email.</p>
                <p>L'équipe NowMe</p>
            </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Nowme <contact@nowme.fr>',
                to: [email],
                subject: subject,
                html: htmlContent
            })
        })

        const data = await res.json()

        if (!res.ok) {
            console.error("Resend API Error:", data)
            return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: corsHeaders })
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )

    } catch (error) {
        console.error("Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})

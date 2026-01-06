import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Check Upcoming Installments Function Invoked")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Calculate Date Range (Today + 3 days)
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + 3);

        // Determine start and end of that target day in UTC or simple ISO split?
        // Timestamptz comparisons are tricky. 
        // Let's assume the cron runs daily. We want due_date strictly within that day.
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).toISOString();
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59).toISOString();

        console.log(`[CRON] Checking installments due between ${startOfDay} and ${endOfDay}`);

        // 2. Fetch Pending Installments
        const { data: installments, error: fetchError } = await supabaseClient
            .from('payment_installments')
            .select(`
                id, amount, due_date,
                payment_plans (
                    id, user_id, plan_type, booking_id
                )
            `)
            .eq('status', 'pending')
            .gte('due_date', startOfDay)
            .lte('due_date', endOfDay);

        if (fetchError) {
            throw fetchError;
        }

        console.log(`[CRON] Found ${installments?.length || 0} installments due.`);

        const results = [];

        if (installments && installments.length > 0) {
            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

            for (const installment of installments) {
                // @ts-ignore: Supabase join typing
                const plan = installment.payment_plans; // Single object due to 1:1 join on ID reversed? No, installments->plan is N:1. So it returns single object.
                if (!plan) continue;

                // 3. Fetch User Email
                const { data: userData, error: userError } = await supabaseClient
                    .from('user_profiles')
                    .select('email, first_name')
                    .eq('user_id', plan.user_id)
                    .single();

                if (userData?.email && RESEND_API_KEY) {
                    const subject = `📅 Rappel : Echéance à venir dans 3 jours`;
                    const amountEur = installment.amount;

                    const htmlContent = `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2563EB;">Une échéance arrive bientôt !</h1>
                            <p>Bonjour ${userData.first_name || 'Kiffeuse'},</p>
                            <p>Ceci est un petit rappel concernant votre paiement en plusieurs fois pour votre réservation NowMe.</p>
                            
                            <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-weight: bold; color: #1E40AF;">Montant à payer : ${amountEur}€</p>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #1E3A8A;">Date : Dans 3 jours</p>
                            </div>

                            <p>Le prélèvement se fera automatiquement sur votre carte enregistrée.</p>
                            <p>Assurez-vous d'avoir les fonds nécessaires pour éviter tout échec de paiement.</p>

                            <p>À très bientôt,<br/>L'équipe NowMe</p>
                        </div>
                    `;

                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${RESEND_API_KEY}`
                        },
                        body: JSON.stringify({
                            from: 'Nowme <contact@nowme.fr>',
                            to: [userData.email],
                            subject: subject,
                            html: htmlContent
                        })
                    }).then(() => {
                        console.log(`[CRON] Email sent to ${userData.email}`);
                        results.push({ id: installment.id, email: userData.email, status: 'sent' });
                    }).catch(e => {
                        console.error(`[CRON] Email failed for ${userData.email}`, e);
                        results.push({ id: installment.id, error: e.message });
                    });
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, details: results }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )

    } catch (error) {
        console.error("Cron Job Error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
        )
    }
})

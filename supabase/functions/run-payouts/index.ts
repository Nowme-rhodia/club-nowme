import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (_req) => {
  try {
    // 1. Generate Payouts (DB Calculation) - This creates/updates 'pending' records
    // We run this for the "previous month" usually if today is 1st of month.
    // The RPC logic uses "p_ref_date" to find the month.
    // If we run on Feb 1st, we want Jan Payouts.
    // So we should pass a date from the previous month, e.g. "today minus 5 days".

    const now = new Date();
    // Safety: Go back 5 days to be sure we are in the previous month if running on the 1st
    // Or if running manually mid-month, it does current month? 
    // Usually payouts are for COMPLETED months. 
    // If run on Feb 1st, we pass Jan 15th.
    // Let's deduce the reference date.
    const refDate = new Date();
    refDate.setDate(refDate.getDate() - 15); // Go back 15 days. If 1st, becomes 15th-ish of prev month.
    const refDateStr = refDate.toISOString().split('T')[0];

    console.log(`Generating payouts for reference date: ${refDateStr}`);

    const { error: rpcError } = await supabase.rpc("generate_monthly_partner_payouts", {
      p_ref_date: refDateStr
    });

    if (rpcError) {
      console.error("⚠️ Warning: RPC generate_monthly_partner_payouts failed:", rpcError);
    }

    // 2. Fetch Pending Payouts
    const { data: payouts, error: fetchError } = await supabase
      .from('payouts')
      .select('*, partners(stripe_account_id, stripe_charges_enabled)')
      .eq('status', 'pending')
      .gt('net_payout_amount', 0); // Only pay if amount > 0

    if (fetchError) {
      console.error("❌ Error fetching payouts:", fetchError);
      return new Response(JSON.stringify({ status: "error", message: fetchError.message }), { status: 500 });
    }

    console.log(`Found ${payouts.length} pending payouts.`);

    const results = [];

    // 3. Process Transfers
    for (const payout of payouts) {
      const partner = payout.partners;

      if (!partner?.stripe_account_id || !partner?.stripe_charges_enabled) {
        results.push({ id: payout.id, status: 'skipped', reason: 'No connected account' });
        continue;
      }

      try {
        // A. Generate PDF & Send Email
        // We invoke the 'generate-payout-statement' function.
        // We need to pass payout_id so it can find the record and update it.
        // We also pass dates just in case, but ID is key.
        console.log(`📄 Generating PDF for payout ${payout.id}...`);

        const { error: pdfError } = await supabase.functions.invoke('generate-payout-statement', {
          body: {
            payout_id: payout.id,
            partner_id: payout.partner_id,
            period_start: payout.period_start,
            period_end: payout.period_end
          }
        });

        if (pdfError) {
          console.error(`❌ PDF Generation failed for ${payout.id}`, pdfError);
          // We might choose to Continue or Abort. 
          // Let's Log and Continue, but maybe tag as "pdf_failed" in logs?
          // For now, proceed to transfer, as getting paid is priority.
        }

        // B. Execute Transfer
        console.log(`💸 Transfering ${payout.net_payout_amount}€ to ${partner.stripe_account_id}...`);

        const transfer = await stripe.transfers.create({
          amount: Math.round(payout.net_payout_amount * 100), // cents
          currency: 'eur',
          destination: partner.stripe_account_id,
          description: `Payout ${payout.period_start} - ${payout.period_end}`,
          metadata: {
            payout_id: payout.id,
            partner_id: payout.partner_id
          }
        });

        // C. Update DB
        const { error: updateError } = await supabase
          .from('payouts')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_transfer_id: transfer.id
          })
          .eq('id', payout.id);

        if (updateError) console.error('Error updating payout status:', updateError);

        results.push({ id: payout.id, status: 'paid', amount: payout.net_payout_amount, transfer_id: transfer.id });

      } catch (err) {
        console.error(`Failed transfer for payout ${payout.id}:`, err);
        results.push({ id: payout.id, status: 'failed', error: err.message });
      }
    }

    console.log("✅ Payouts processed:", results);
    return new Response(
      JSON.stringify({ status: "success", results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Exception run-payouts:", err);
    return new Response(
      JSON.stringify({ status: "error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

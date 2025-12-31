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
    // 1. Generate Payouts (DB Calculation)
    const today = new Date().toISOString().split('T')[0];
    const { error: rpcError } = await supabase.rpc("generate_monthly_partner_payouts", {
      p_ref_date: today
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
        // Execute Transfer
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

        // Update DB
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

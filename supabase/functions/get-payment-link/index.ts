import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.10.0'

console.log("Get Payment Link Helper Invoked")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { invoiceId } = await req.json()

        if (!invoiceId) {
            throw new Error('Invoice ID is required')
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Fetch Invoice
        const invoice = await stripe.invoices.retrieve(invoiceId);

        if (!invoice) {
            throw new Error('Invoice not found')
        }

        // Return URL
        return new Response(
            JSON.stringify({ url: invoice.hosted_invoice_url }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )

    } catch (error) {
        console.error("Error fetching invoice link:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        )
    }
})

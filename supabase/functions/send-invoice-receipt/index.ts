
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { Buffer } from "node:buffer";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("🧾 [RECEIPT_FUNC] Request received:", JSON.stringify(body));

    const { email, amount, currency, date, invoicePdfUrl, invoiceId } = body;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("❌ [RECEIPT_FUNC] CRITICAL: RESEND_API_KEY is missing from environment variables.");
      throw new Error("Internal Server Error: Missing API Key");
    } else {
      console.log("✅ [RECEIPT_FUNC] RESEND_API_KEY is present.");
    }

    if (!email) {
      console.error("❌ [RECEIPT_FUNC] Email is missing in payload");
      throw new Error("Email is missing");
    }

    console.log(`🧾 Sending invoice receipt to ${email} for ${amount} ${currency.toUpperCase()}`);

    const formattedDate = new Date(date * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (!invoicePdfUrl) {
      console.warn("⚠️ [RECEIPT_FUNC] No PDF URL provided, sending email without attachment.");
    }

    let attachments = [];
    if (invoicePdfUrl) {
      try {
        console.log(`📥 [RECEIPT_FUNC] Fetching PDF from: ${invoicePdfUrl}`);
        const pdfResponse = await fetch(invoicePdfUrl);
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          // Resend expects a Buffer or string for content. 
          // Deno's arrayBuffer needs to be handled. Resend SDK handles Buffer.
          // We can pass a URL directly to Resend? No, usually content.
          // Let's create a buffer from the arrayBuffer.
          const pdfContent = new Uint8Array(pdfBuffer); // Adapted for Deno from Buffer.from(pdfBuffer)

          attachments.push({
            filename: `Facture-${invoiceId}.pdf`,
            content: pdfContent,
          });
          console.log("📎 [RECEIPT_FUNC] PDF attached successfully.");
        } else {
          console.error(`❌ [RECEIPT_FUNC] Failed to fetch PDF. Status: ${pdfResponse.status}`);
        }
      } catch (fetchErr) {
        console.error(`❌ [RECEIPT_FUNC] Exception fetching PDF:`, fetchErr);
      }
    }

    const { data, error } = await resend.emails.send({
      from: 'NowMe Facturation <contact@nowme.fr>',
      to: email,
      subject: `Votre reçu n° ${invoiceId}`,
      attachments: attachments,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
             <h2 style="color: #111; margin: 0;">Reçu de paiement</h2>
             <p style="color: #666; font-size: 0.9em; margin-top: 5px;">Club Nowme</p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
             <p style="margin: 0; color: #666; font-size: 0.9em;">Montant payé</p>
             <h1 style="margin: 10px 0; color: #111; font-size: 32px;">${(amount / 100).toFixed(2)} €</h1>
             <p style="margin: 0; color: #666; font-size: 0.9em;">le ${formattedDate}</p>
          </div>

          <div style="margin-bottom: 30px;">
             <p>Bonjour,</p>
             <p>Nous vous confirmons la bonne réception de votre paiement pour votre abonnement au Club Nowme.</p>
          </div>

          <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold; color: #555;">Facture n°</span>
                <span>${invoiceId}</span>
            </div>
             <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: bold; color: #555;">Moyen de paiement</span>
                <span>Carte Bancaire</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${invoicePdfUrl}" style="background-color: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
              Télécharger la facture PDF
            </a>
          </div>

          <p style="margin-top: 40px; text-align: center; font-size: 0.8em; color: #999;">
            Si vous avez des questions, contactez-nous à <a href="mailto:contact@nowme.fr" style="color: #666;">contact@nowme.fr</a>
          </p>
        </div>
      `
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      return new Response(JSON.stringify({ error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log("✅ Invoice Receipt sent:", data);
    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("❌ Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

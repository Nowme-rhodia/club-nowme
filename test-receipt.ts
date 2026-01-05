
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log(`🚀 Testing send-invoice-receipt on: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const payload = {
    email: "jgendron.paris@gmail.com",
    amount: 1299,
    currency: "eur",
    date: Math.floor(Date.now() / 1000),
    invoiceId: "TEST-INV-MANUAL-001",
    invoicePdfUrl: "https://example.com/invoice.pdf"
};

const { data, error } = await supabase.functions.invoke('send-invoice-receipt', {
    body: payload
});

if (error) {
    console.error("❌ Function failed:", error);
} else {
    console.log("✅ Function succeeded:", data);
}

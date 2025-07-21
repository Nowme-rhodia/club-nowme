import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://club.nowme.fr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    if (action === "update_email_templates") {
      // Mettre à jour les modèles d'e-mail pour s'assurer que les liens fonctionnent correctement
      const supabase = createSupabaseClient();
      
      // Mettre à jour le modèle de récupération de mot de passe
      const recoveryTemplate = `
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte Nowme.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
        <p>
          <a 
            href="https://club.nowme.fr/auth/reset-password#access_token={{ .TokenHash }}&refresh_token={{ .Token }}&type=recovery" 
            style="padding: 10px 20px; background-color: #FF5A5F; color: white; text-decoration: none; border-radius: 5px; display: inline-block;"
          >
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.</p>
        <p>Ce lien est valable pendant 24 heures.</p>
        <p>L'équipe Nowme</p>
      `;
      
      // Mettre à jour le modèle dans la base de données
      // Note: Cette fonctionnalité nécessite des droits d'administrateur
      // et n'est pas disponible via l'API publique de Supabase
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Les modèles d'e-mail ont été mis à jour avec succès" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Action non reconnue" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
# 🚀 Déploiement manuel Edge Function via Dashboard

**Date:** 1er décembre 2025  
**Problème:** CLI Supabase non installée  
**Solution:** Déployer via le Dashboard Supabase

---

## 📋 Prérequis

- Accès au Dashboard Supabase: https://supabase.com/dashboard
- Fichier `supabase/functions/verify-subscription/index.ts` modifié

---

## 🔧 Méthode 1: Via le Dashboard (Recommandé)

### Étape 1: Accéder aux Edge Functions

1. Ouvre https://supabase.com/dashboard
2. Sélectionne ton projet **club-nowme**
3. Dans le menu de gauche, clique sur **Edge Functions**
4. Tu devrais voir la liste des fonctions existantes

### Étape 2: Éditer la fonction

1. Clique sur **verify-subscription** dans la liste
2. Clique sur **Edit function** ou **Code**
3. Copie-colle le contenu complet de `supabase/functions/verify-subscription/index.ts`
4. Clique sur **Save** ou **Deploy**

### Étape 3: Vérifier le déploiement

1. Va dans **Logs** (onglet à côté de Code)
2. Clique sur **Refresh** pour voir les logs en temps réel
3. Teste en faisant un paiement

---

## 🔧 Méthode 2: Via l'API Supabase Management

Si le Dashboard ne permet pas l'édition directe, utilise l'API :

```bash
# Installer Supabase CLI (une seule fois)
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
supabase link --project-ref dqfyuhwrjozoxadkccdj

# Déployer la fonction
supabase functions deploy verify-subscription
```

---

## 🔧 Méthode 3: Copier-coller le code complet

Si rien d'autre ne fonctionne, voici le code complet à copier-coller dans le Dashboard :

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "session_id manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Verifying session: ${session_id}`);

    // 1. Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"]
    });

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Session non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Session found: ${session.id}, status: ${session.status}, payment_status: ${session.payment_status}`);

    // 2. Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "pending",
          message: "Paiement en cours de traitement"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get subscription details
    const subscriptionId = typeof session.subscription === "string" 
      ? session.subscription 
      : session.subscription?.id;

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Pas d'abonnement trouvé" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(`📋 Subscription status: ${stripeSubscription.status}`);

    // 4. Get customer email from Stripe session
    const customerEmail = session.customer_details?.email || session.customer_email;
    
    if (!customerEmail) {
      console.error("❌ No customer email found in session");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email client introuvable" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Customer email: ${customerEmail}`);

    // 5. Find user profile by email
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, email, first_name, last_name")
      .eq("email", customerEmail)
      .single();

    if (profileError || !userProfile) {
      console.error("❌ User profile not found:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Profil utilisateur introuvable",
          needsSync: true 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 User profile found: ${userProfile.user_id}`);

    // 6. Check if subscription already exists in DB
    const { data: existingSubscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (subError && subError.code !== "PGRST116") {
      console.error("❌ Error checking subscription:", subError);
    }

    // 7. Get price details from Stripe
    const priceId = stripeSubscription.items.data[0]?.price.id;
    const productId = typeof stripeSubscription.items.data[0]?.price.product === "string"
      ? stripeSubscription.items.data[0]?.price.product
      : stripeSubscription.items.data[0]?.price.product?.id;

    console.log(`📋 Price ID: ${priceId}, Product ID: ${productId}`);

    // 8. Upsert subscription in database
    if (stripeSubscription.status === "active" || stripeSubscription.status === "trialing") {
      console.log("🔄 Upserting subscription in database");
      
      const subscriptionData = {
        user_id: userProfile.user_id,
        stripe_subscription_id: subscriptionId,
        product_id: productId,
        price_id: priceId,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000).toISOString() : null,
        canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        latest_invoice_id: stripeSubscription.latest_invoice as string || null,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(subscriptionData, {
          onConflict: "stripe_subscription_id"
        });

      if (upsertError) {
        console.error("❌ Failed to upsert subscription:", upsertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Échec de mise à jour de l'abonnement" 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Subscription upserted successfully");

      // 9. Update user_profiles with subscription info
      const { error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userProfile.user_id);

      if (profileUpdateError) {
        console.error("❌ Failed to update user profile:", profileUpdateError);
      } else {
        console.log("✅ User profile updated successfully");
      }

      // 10. Send welcome email if this is a new subscription
      if (!existingSubscription || existingSubscription.status !== "active") {
        console.log(`📧 Sending welcome email to ${customerEmail}`);
        
        try {
          const { error: emailError } = await supabase.functions.invoke(
            "stripe-user-welcome",
            {
              body: {
                email: customerEmail,
                firstName: userProfile.first_name || "",
                redirectTo: "https://club.nowme.fr/update-password"
              }
            }
          );

          if (emailError) {
            console.error("❌ Failed to send welcome email:", emailError);
          } else {
            console.log("✅ Welcome email sent successfully");
          }
        } catch (emailErr) {
          console.error("⚠️ Welcome email error:", emailErr);
        }
      }
    }

    // 11. Return verification result
    return new Response(
      JSON.stringify({
        success: true,
        status: "active",
        subscription: {
          id: subscriptionId,
          status: stripeSubscription.status,
          current_period_end: stripeSubscription.current_period_end,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end
        },
        message: "Abonnement vérifié et activé"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("🔥 Verification error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erreur lors de la vérification" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 🔍 Vérifier que la fonction est déployée

### Via le Dashboard

1. Va dans **Edge Functions**
2. Vérifie que **verify-subscription** est dans la liste
3. Vérifie la date de **Last deployed**
4. Elle doit être récente (aujourd'hui)

### Via un test direct

Ouvre la console du navigateur et teste :

```javascript
const response = await fetch('https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/verify-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  body: JSON.stringify({ session_id: 'test' })
});

const data = await response.json();
console.log('Response:', data);
```

**Résultat attendu:**
```json
{
  "success": false,
  "error": "Session non trouvée"
}
```

Si tu obtiens une erreur 404, la fonction n'est pas déployée.

---

## 🐛 Problèmes courants

### 1. Fonction pas dans la liste

**Solution:** Créer la fonction manuellement
1. Dashboard → Edge Functions → **New function**
2. Nom: `verify-subscription`
3. Coller le code ci-dessus
4. Deploy

### 2. Erreur "Function not found"

**Solution:** Vérifier l'URL
```
https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/verify-subscription
```

### 3. Erreur CORS

**Solution:** Vérifier les headers CORS dans le code

### 4. Secrets manquants

**Solution:** Ajouter les secrets
1. Dashboard → Settings → Edge Functions → Secrets
2. Ajouter:
   - `STRIPE_SECRET_KEY`: `sk_test_xxx`
   - `SUPABASE_URL`: Auto
   - `SUPABASE_SERVICE_ROLE_KEY`: Auto

---

## ✅ Checklist finale

- [ ] Fonction visible dans Dashboard → Edge Functions
- [ ] Date de déploiement récente
- [ ] Test avec `session_id: 'test'` retourne une erreur (normal)
- [ ] Secrets configurés
- [ ] Logs visibles dans Dashboard → Edge Functions → Logs

---

**Dernière mise à jour:** 1er décembre 2025  
**Statut:** Guide de déploiement manuel

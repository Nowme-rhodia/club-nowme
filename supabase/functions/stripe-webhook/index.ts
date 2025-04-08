import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@13.11.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Initialisation des clés
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let event: Stripe.Event | null = null;
  let stripeWebhookId: string | null = null;

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      throw new Error("❌ Stripe signature is missing.");
    }

    console.log("🔹 Vérification Stripe Webhook...");
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    stripeWebhookId = event.id;
    console.log(`✅ Event reçu: ${event.type}`);

    const stripeData = event.data.object as Stripe.Checkout.Session;
    const customerEmail = stripeData.customer_email || null;
    const stripeCustomerId = stripeData.customer as string || null;
    const subscriptionId = stripeData.subscription as string || null;

    if (!customerEmail) {
      throw new Error("❌ Email client manquant dans l'événement Stripe");
    }

    console.log("📥 Enregistrement de l'événement dans stripe_webhook_events...");
    console.log("🔍 Debug : Email =", customerEmail, " | Customer ID =", stripeCustomerId, " | Subscription ID =", subscriptionId);

    // 🟢 Enregistrement de l'événement Stripe
    const { data: webhookEvent, error: logError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        customer_id: stripeCustomerId,
        customer_email: customerEmail,
        subscription_id: subscriptionId,
        amount: stripeData.amount_total || null,
        status: 'processing',
        raw_event: event
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Erreur lors de l\'enregistrement dans stripe_webhook_events:', logError);
      throw logError;
    }

    if (!webhookEvent) {
      throw new Error("❌ Échec de l'enregistrement de l'événement webhook");
    }

    console.log(`🎯 Traitement de l'événement Stripe: ${event.type}`);

    // Recherche de l'utilisateur existant
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', customerEmail)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erreur lors de la recherche du profil:', profileError);
      throw profileError;
    }

    // Traitement selon le type d'événement
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('✅ Checkout session réussie');
        
        if (!userProfile) {
          // Générer un mot de passe temporaire
          const tempPassword = crypto.randomUUID();

          // Créer un nouvel utilisateur dans auth.users
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: customerEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              stripe_customer_id: stripeCustomerId,
              needs_password_reset: true
            }
          });

          if (authError) {
            console.error('❌ Erreur création utilisateur auth:', authError);
            throw authError;
          }

          if (!authUser?.user) {
            throw new Error('❌ Utilisateur auth non créé');
          }

          // Créer le profil utilisateur
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: authUser.user.id,
              email: customerEmail,
              first_name: 'Nouveau',
              last_name: 'Membre',
              phone: '+33000000000',
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active'
            });

          if (insertError) {
            console.error('❌ Erreur création profil:', insertError);
            throw insertError;
          }

          // Envoyer un email de bienvenue avec lien de réinitialisation
          const { data: resetData, error: resetError } = await supabase.auth.admin
            .generateLink({
              type: 'recovery',
              email: customerEmail
            });

          if (resetError) {
            console.error('❌ Erreur génération lien reset:', resetError);
            throw resetError;
          }

          // Enregistrer l'email à envoyer
          const { error: emailError } = await supabase
            .from('emails')
            .insert({
              to_address: customerEmail,
              subject: 'Bienvenue sur Nowme !',
              content: `
                Bienvenue sur Nowme !

                Votre compte a été créé avec succès. Pour commencer à utiliser nos services,
                veuillez définir votre mot de passe en cliquant sur le lien ci-dessous :

                ${resetData?.properties?.action_link}

                Ce lien est valable pendant 24h.

                À très vite !
                L'équipe Nowme
              `,
              status: 'pending'
            });

          if (emailError) {
            console.error('❌ Erreur enregistrement email:', emailError);
            throw emailError;
          }

        } else {
          // Mise à jour du profil existant
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('id', userProfile.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour profil:', updateError);
            throw updateError;
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log('✅ Paiement réussi');
        if (userProfile) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'active',
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscriptionId
            })
            .eq('id', userProfile.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour profil:', updateError);
            throw updateError;
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.log('⚠️ Paiement échoué');
        if (userProfile) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'payment_failed'
            })
            .eq('id', userProfile.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour profil:', updateError);
            throw updateError;
          }

          // Envoyer un email de notification
          const { error: emailError } = await supabase
            .from('emails')
            .insert({
              to_address: customerEmail,
              subject: 'Échec du paiement de votre abonnement',
              content: `
                Bonjour,

                Le paiement de votre abonnement Nowme a échoué.
                Pour éviter toute interruption de service, veuillez mettre à jour vos informations de paiement
                dans votre espace membre.

                Si vous avez des questions, n'hésitez pas à nous contacter.

                L'équipe Nowme
              `,
              status: 'pending'
            });

          if (emailError) {
            console.error('❌ Erreur enregistrement email:', emailError);
            throw emailError;
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        console.log('❌ Abonnement annulé');
        if (userProfile) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'cancelled'
            })
            .eq('id', userProfile.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour profil:', updateError);
            throw updateError;
          }

          // Envoyer un email de confirmation
          const { error: emailError } = await supabase
            .from('emails')
            .insert({
              to_address: customerEmail,
              subject: 'Confirmation d\'annulation de votre abonnement',
              content: `
                Bonjour,

                Nous confirmons l'annulation de votre abonnement Nowme.
                Vous pouvez continuer à profiter de nos services jusqu'à la fin de votre période en cours.

                Nous espérons vous revoir bientôt !

                L'équipe Nowme
              `,
              status: 'pending'
            });

          if (emailError) {
            console.error('❌ Erreur enregistrement email:', emailError);
            throw emailError;
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ Événement non traité: ${event.type}`);
    }

    // ✅ Marquer l'événement comme traité
    if (webhookEvent) {
      console.log("✅ Marquage de l'événement comme 'completed'");
      const { error: updateStatusError } = await supabase
        .from('stripe_webhook_events')
        .update({ status: 'completed' })
        .eq('id', webhookEvent.id);

      if (updateStatusError) {
        console.error('❌ Erreur mise à jour du statut webhook:', updateStatusError);
        throw updateStatusError;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook:', error);

    // Enregistrer l'erreur dans stripe_webhook_events si on a l'ID de l'événement
    if (stripeWebhookId) {
      try {
        const { error: updateError } = await supabase
          .from('stripe_webhook_events')
          .update({ 
            status: 'failed',
            error: error.message
          })
          .eq('stripe_event_id', stripeWebhookId);

        if (updateError) {
          console.error('❌ Impossible de mettre à jour le statut de l\'événement:', updateError);
        }
      } catch (logError) {
        console.error('❌ Impossible d\'enregistrer l\'erreur:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
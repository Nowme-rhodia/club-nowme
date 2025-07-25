import Stripe from 'npm:stripe@14.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
// Logging utilities
const logger = {
  success: (message, details)=>console.log(`✅ ${message}`, details || ""),
  error: (message, error, details = {})=>console.error(`❌ ${message}`, {
      error: error ? String(error) : undefined,
      ...details
    }),
  info: (message, details)=>console.log(`ℹ️ ${message}`, details || "")
};
// Define CORS headers specifically for Stripe webhooks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Stripe-Signature, Content-Type",
  "Content-Type": "application/json"
};
// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}
// Load environment variables
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
logger.info("Environment variables loaded", {
  stripeSecretKey: stripeSecretKey ? "[present]" : "[missing]",
  webhookSecret: webhookSecret ? "[present]" : "[missing]"
});
if (!stripeSecretKey || !webhookSecret) {
  throw new Error("Missing required environment variables for Stripe");
}
// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16"
});
/**
 * Extract email from Stripe data
 */ const extractEmailFromStripeData = async (stripeData)=>{
  const directEmail = stripeData.customer_email ?? stripeData.customer_details?.email ?? null;
  if (directEmail) return directEmail;
  const customerId = stripeData.customer ?? null;
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && typeof customer === "object" && "email" in customer) {
        return customer.email || null;
      }
    } catch (err) {
      logger.error("Error retrieving Stripe customer", err, {
        customerId
      });
    }
  }
  return null;
};
/**
 * Create a new user in auth.users and user_profiles
 */ async function createNewUser(supabase, email, customerId, subscriptionId, subscriptionType) {
  try {
    // Generate a random password for initial account setup
    const tempPassword = Math.random().toString(36).slice(-10);
    // Create user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    if (authError) {
      throw authError;
    }
    // Create user profile
    const { error: profileError } = await supabase.from("user_profiles").insert({
      user_id: authUser.user.id,
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
      subscription_type: subscriptionType
    });
    if (profileError) {
      throw profileError;
    }
    // Send password reset email so user can set their own password
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email
    });
    if (resetError) {
      logger.error("Error generating password reset link", resetError);
    } else {
      // Log email sending to emails table
      await supabase.from("emails").insert({
        to_address: email,
        subject: "Bienvenue sur Nowme - Configurez votre compte",
        content: "Bienvenue sur Nowme ! Veuillez suivre le lien de réinitialisation de mot de passe qui vous a été envoyé pour configurer votre compte.",
        status: "sent"
      });
      logger.success("Password reset email sent", {
        email
      });
    }
    // Send welcome email
    await supabase.from("emails").insert({
      to_address: email,
      subject: "Bienvenue sur Nowme - Votre abonnement est actif",
      content: `Félicitations ! Votre abonnement ${subscriptionType === 'yearly' ? 'annuel' : 'mensuel'} à Nowme est maintenant actif. Profitez de tous les avantages de votre abonnement.`,
      status: "sent"
    });
    logger.success("New user created", {
      email,
      userId: authUser.user.id
    });
    return authUser.user;
  } catch (err) {
    logger.error("Error creating new user", err);
    throw err;
  }
}
/**
 * Send email notification
 */ async function sendEmailNotification(supabase, email, subject, content) {
  try {
    const { error } = await supabase.from("emails").insert({
      to_address: email,
      subject,
      content,
      status: "pending"
    });
    if (error) {
      logger.error("Error logging email", error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Error sending email notification", err);
    return false;
  }
}
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  // Verify Stripe signature
  const sig = req.headers.get("Stripe-Signature");
  if (!sig) {
    return new Response(JSON.stringify({
      error: "Missing Stripe-Signature header"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  // Get raw body text for signature verification
  const bodyText = await req.text();
  let event;
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
    logger.info("Verified Stripe Event", {
      type: event.type,
      id: event.id
    });
  } catch (err) {
    logger.error("Invalid Stripe signature", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown signature verification error"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  // Initialize Supabase client
  const supabase = createSupabaseClient();
  // Extract data from event
  const stripeData = event.data.object;
  const email = await extractEmailFromStripeData(stripeData);
  const customerId = stripeData.customer ?? null;
  const subscriptionId = stripeData.subscription ?? null;
  if (!email) {
    logger.error("Missing email in event", null, {
      eventType: event.type,
      stripeData
    });
    return new Response(JSON.stringify({
      error: "Missing email"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  // Find user by email
  const { data: user, error: userError } = await supabase.from("user_profiles").select("*").eq("email", email).maybeSingle();
  if (userError) {
    logger.error("Error retrieving user profile", userError, {
      email
    });
    return new Response(JSON.stringify({
      error: userError.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
  // Log webhook event
  await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    customer_email: email,
    customer_id: customerId,
    subscription_id: subscriptionId,
    raw_event: event,
    status: "processing"
  });
  // Helper function to update user profile
  const updateProfile = async (fields)=>{
    if (user) {
      const { error } = await supabase.from("user_profiles").update(fields).eq("id", user.id);
      if (error) {
        logger.error("Error updating user profile", error, {
          userId: user.id,
          fields
        });
        throw error;
      }
      logger.success("Profile updated", {
        userId: user.id,
        fields
      });
    }
  };
  try {
    switch(event.type){
      case "checkout.session.completed":
        const sessionData = stripeData;
        const isMonthlyPrice = sessionData.amount_total === 1299; // 12,99€ en centimes (1er mois)
        const isYearlyPrice = sessionData.amount_total === 39900; // 399€ en centimes (annuel)
        const subscriptionType = isYearlyPrice ? "yearly" : "monthly";
        if (!user) {
          // Create new user in auth.users and user_profiles
          await createNewUser(supabase, email, customerId, subscriptionId, subscriptionType);
          logger.success("New user created from Checkout", {
            email,
            type: subscriptionType
          });
        } else {
          // Update existing user
          await updateProfile({
            subscription_status: "active",
            subscription_type: subscriptionType,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          });
          // Send confirmation email
          await sendEmailNotification(supabase, email, "Votre abonnement Nowme est actif", `Félicitations ! Votre abonnement ${subscriptionType === 'yearly' ? 'annuel' : 'mensuel'} à Nowme est maintenant actif.`);
        }
        break;
      case "customer.subscription.created":
        if (user) {
          await updateProfile({
            subscription_status: "created",
            stripe_subscription_id: subscriptionId,
            subscription_type: "discovery" // Par défaut, sera mis à jour au premier paiement
          });
          logger.success("Subscription initially created", {
            email
          });
          // Send notification email
          await sendEmailNotification(supabase, email, "Votre abonnement Nowme a été créé", "Votre abonnement Nowme a été créé avec succès. Vous recevrez une confirmation une fois le paiement traité.");
        }
        break;
      case "customer.subscription.updated":
        if (user) {
          // Vérifier le type d'abonnement
          const subscription = stripeData;
          const isYearlySubscription = subscription.items?.data?.[0]?.price?.unit_amount === 39900;
          const newType = isYearlySubscription ? "yearly" : "monthly";
          await updateProfile({
            subscription_status: "active",
            subscription_type: newType
          });
          logger.success("Subscription updated", {
            email,
            newType
          });
          // Send notification email
          await sendEmailNotification(supabase, email, "Votre abonnement Nowme a été mis à jour", `Votre abonnement Nowme a été mis à jour vers le type ${newType === 'yearly' ? 'annuel' : 'mensuel'}.`);
        }
        break;
      case "customer.subscription.paused":
        if (user) {
          await updateProfile({
            subscription_status: "paused"
          });
          logger.info("Subscription paused", {
            email
          });
          // Send notification email
          await sendEmailNotification(supabase, email, "Votre abonnement Nowme est en pause", "Votre abonnement Nowme a été mis en pause. Vous pouvez le réactiver à tout moment depuis votre compte.");
        }
        break;
      case "invoice.payment_succeeded":
        const invoice = stripeData;
        const amount = invoice.amount_paid;
        const isYearlyPayment = amount === 39900; // 399€ en centimes (annuel)
        const isSecondMonthPayment = amount === 3999; // 39,99€ en centimes (2ème mois+)
        const paymentType = isYearlyPayment ? "yearly" : "monthly";
        if (user) {
          await updateProfile({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_type: paymentType
          });
          logger.success("Payment succeeded - subscription updated", {
            email,
            amount: amount / 100,
            type: paymentType
          });
          // Send receipt email
          await sendEmailNotification(supabase, email, "Reçu de paiement Nowme", `Nous avons bien reçu votre paiement de ${amount / 100}€ pour votre abonnement ${paymentType === 'yearly' ? 'annuel' : 'mensuel'} à Nowme.`);
        }
        break;
      case "invoice.payment_failed":
        if (user) {
          await updateProfile({
            subscription_status: "payment_failed"
          });
          logger.info("Subscription updated to 'payment_failed'", {
            email
          });
          // Send notification email
          await sendEmailNotification(supabase, email, "Problème de paiement pour votre abonnement Nowme", "Nous avons rencontré un problème lors du traitement de votre paiement. Veuillez vérifier vos informations de paiement dans votre compte.");
        }
        break;
      case "customer.subscription.deleted":
        if (user) {
          await updateProfile({
            subscription_status: "cancelled"
          });
          logger.info("Subscription cancelled", {
            email
          });
          // Send notification email
          await sendEmailNotification(supabase, email, "Votre abonnement Nowme a été annulé", "Votre abonnement Nowme a été annulé. Nous espérons vous revoir bientôt !");
        }
        break;
      default:
        logger.info("Unhandled event type", {
          type: event.type
        });
    }
    // Mark webhook event as completed
    await supabase.from("stripe_webhook_events").update({
      status: "completed"
    }).eq("stripe_event_id", event.id);
  } catch (err) {
    logger.error("Error processing event", err, {
      eventType: event.type,
      email
    });
    // Mark webhook event as failed
    await supabase.from("stripe_webhook_events").update({
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error"
    }).eq("stripe_event_id", event.id);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
  return new Response(JSON.stringify({
    received: true
  }), {
    status: 200,
    headers: corsHeaders
  });
});
 

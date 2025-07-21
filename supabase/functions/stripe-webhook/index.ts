import Stripe from 'npm:stripe@14.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

// Logging utilities
const logger = {
  success: (message, details) => console.log(`✅ ${message}`, details || ""),
  error: (message, error, details) => console.error(`❌ ${message}`, {
    error: error ? String(error) : undefined,
    ...details
  }),
  info: (message, details) => console.log(`ℹ️ ${message}`, details || "")
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
 */
const extractEmailFromStripeData = async (stripeData) => {
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

Deno.serve(async (req) => {
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
  const { data: user, error: userError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

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
  const updateProfile = async (fields) => {
    if (user) {
      const { error } = await supabase
        .from("user_profiles")
        .update(fields)
        .eq("id", user.id);
      
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
    switch(event.type) {
      case "checkout.session.completed":
        const sessionData = stripeData;
        const isDiscoveryPrice = sessionData.amount_total === 1299; // 12,99€ en centimes
        
        if (!user) {
          // Create user profile
          await supabase.from("user_profiles").insert({
            email,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_type: isDiscoveryPrice ? "discovery" : "premium"
          });
          logger.success("New user created from Checkout", {
            email,
            type: isDiscoveryPrice ? "discovery" : "premium"
          });
        } else {
          // Update existing user
          await updateProfile({
            subscription_status: "active",
            subscription_type: isDiscoveryPrice ? "discovery" : "premium",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          });
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
        }
        break;
      
      case "customer.subscription.updated":
        if (user) {
          // Vérifier si c'est un passage de discovery à premium
          const subscription = stripeData;
          const isPremiumPrice = subscription.items?.data?.[0]?.price?.unit_amount === 3999;
          
          await updateProfile({
            subscription_status: "active",
            subscription_type: isPremiumPrice ? "premium" : "discovery"
          });
          
          logger.success("Subscription updated", {
            email,
            newType: isPremiumPrice ? "premium" : "discovery"
          });
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
        }
        break;
      
      case "invoice.payment_succeeded":
        const invoice = stripeData;
        const amount = invoice.amount_paid;
        const isPremiumPayment = amount === 3999; // 39,99€ en centimes
        
        if (user) {
          await updateProfile({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_type: isPremiumPayment ? "premium" : "discovery"
          });
          logger.success("Payment succeeded - subscription updated", {
            email,
            amount: amount / 100,
            type: isPremiumPayment ? "premium" : "discovery"
          });
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
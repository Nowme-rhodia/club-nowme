import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@13.11.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Logging utilities
const logger = {
  success: (message, details) => console.log(`✅ ${message}`, details || ""),
  error: (message, error, details = {}) => console.error(`❌ ${message}`, {
    error: error ? String(error) : undefined,
    ...details
  }),
  info: (message, details) => console.log(`ℹ️ ${message}`, details || ""),
  warn: (message, details) => console.warn(`⚠️ ${message}`, details || "")
};

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Content-Type": "application/json"
};

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  });
}

// Load environment variables
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16"
});

/**
 * Determine subscription type based on price
 */
const determineSubscriptionType = async (subscription) => {
  try {
    // Default to monthly if we can't determine
    let subscriptionType = "monthly";

    // Check subscription items
    if (subscription.items?.data && subscription.items.data.length > 0) {
      const item = subscription.items.data[0];
      if (item.price?.unit_amount === 39900) {
        subscriptionType = "yearly";
        return subscriptionType;
      }
    }

    return subscriptionType;
  } catch (error) {
    logger.error("Exception in determineSubscriptionType", error);
    return "monthly"; // Default fallback
  }
};

/**
 * Map Stripe subscription status to our status
 */
const mapSubscriptionStatus = (stripeStatus) => {
  const statusMap = {
    'active': 'active',
    'past_due': 'past_due',
    'unpaid': 'unpaid',
    'canceled': 'cancelled',
    'incomplete': 'pending',
    'incomplete_expired': 'cancelled',
    'trialing': 'active',
    'paused': 'paused'
  };

  return statusMap[stripeStatus] || 'pending';
};

/**
 * Sync a single subscription
 */
const syncSubscription = async (supabase, subscription) => {
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);

    if (!customer || customer.deleted) {
      logger.warn(`Customer ${subscription.customer} not found or deleted`);
      return { success: false, reason: 'customer_not_found' };
    }

    const email = customer.email;
    if (!email) {
      logger.warn(`No email found for customer ${subscription.customer}`);
      return { success: false, reason: 'no_email' };
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      logger.error(`Error finding user with email ${email}`, userError);
      return { success: false, reason: 'db_error' };
    }

    // Find user by customer ID if not found by email
    let userToUpdate = user;
    if (!userToUpdate) {
      const { data: userByCustomerId, error: customerIdError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("stripe_customer_id", subscription.customer)
        .maybeSingle();

      if (!customerIdError) {
        userToUpdate = userByCustomerId;
      }
    }

    // Determine subscription type and status
    const subscriptionType = await determineSubscriptionType(subscription);
    const subscriptionStatus = mapSubscriptionStatus(subscription.status);

    if (userToUpdate) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: subscriptionStatus,
          subscription_type: subscriptionType,
          // Ensure we only save the ID string, handling both string and object cases
          stripe_customer_id: typeof subscription.customer === 'object' ? (subscription.customer as any).id : subscription.customer,
          stripe_subscription_id: subscription.id,
          subscription_updated_at: new Date().toISOString()
        })
        .eq("id", userToUpdate.id);

      if (updateError) {
        logger.error(`Error updating user ${userToUpdate.id}`, updateError);
        return { success: false, reason: 'update_error' };
      }

      logger.success(`Updated user ${userToUpdate.id} with subscription ${subscription.id}`);
      return {
        success: true,
        action: 'updated',
        userId: userToUpdate.id,
        email,
        subscriptionId: subscription.id,
        status: subscriptionStatus,
        type: subscriptionType
      };
    } else {
      // No user found - log this case
      logger.warn(`No user found for email ${email} or customer ID ${subscription.customer}`);
      return { success: false, reason: 'user_not_found' };
    }
  } catch (error) {
    logger.error(`Error syncing subscription ${subscription.id}`, error);
    return { success: false, reason: 'exception', error: String(error) };
  }
};

/**
 * Check if user is admin
 */
async function isAdmin(supabase, token) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return !profileError && profile?.role === 'admin';
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  // Check authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  // Initialize Supabase client
  const supabase = createSupabaseClient();

  // Verify admin role
  if (!await isAdmin(supabase, token)) {
    return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
      status: 403,
      headers: corsHeaders
    });
  }

  try {
    // Parse request body
    const { action, subscriptionId, limit = 100 } = await req.json();

    // Sync specific subscription
    if (action === 'sync_subscription' && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const result = await syncSubscription(supabase, subscription);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: corsHeaders
      });
    }

    // Sync all active subscriptions
    if (action === 'sync_all') {
      const results = {
        success: 0,
        failed: 0,
        details: []
      };

      // Get all active subscriptions from Stripe
      let hasMore = true;
      let startingAfter = null;

      while (hasMore) {
        const subscriptions = await stripe.subscriptions.list({
          limit: 100,
          status: 'active',
          ...(startingAfter ? { starting_after: startingAfter } : {})
        });

        // Process each subscription
        for (const subscription of subscriptions.data) {
          const result = await syncSubscription(supabase, subscription);

          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }

          results.details.push(result);

          // Stop if we've reached the limit
          if (results.success + results.failed >= limit) {
            hasMore = false;
            break;
          }
        }

        // Check if there are more subscriptions
        if (subscriptions.has_more && hasMore) {
          startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }

      // Also sync cancelled subscriptions
      const cancelledSubscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: 'canceled'
      });

      for (const subscription of cancelledSubscriptions.data) {
        const result = await syncSubscription(supabase, subscription);

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }

        results.details.push(result);

        // Stop if we've reached the limit
        if (results.success + results.failed >= limit) {
          break;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fix inconsistencies
    if (action === 'fix_inconsistencies') {
      // Find users with active subscriptions in our DB
      const { data: activeUsers, error: activeError } = await supabase
        .from("user_profiles")
        .select("id, email, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_type")
        .eq("subscription_status", "active");

      if (activeError) {
        throw new Error(`Error fetching active users: ${activeError.message}`);
      }

      const results = {
        checked: 0,
        fixed: 0,
        details: []
      };

      // Check each active user's subscription in Stripe
      for (const user of activeUsers) {
        results.checked++;

        if (!user.stripe_subscription_id) {
          results.details.push({
            userId: user.id,
            email: user.email,
            issue: 'missing_subscription_id',
            fixed: false
          });
          continue;
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

          // Check if subscription status matches
          const stripeStatus = mapSubscriptionStatus(subscription.status);

          if (stripeStatus !== user.subscription_status) {
            // Update user profile with correct status
            const { error: updateError } = await supabase
              .from("user_profiles")
              .update({
                subscription_status: stripeStatus,
                subscription_updated_at: new Date().toISOString()
              })
              .eq("id", user.id);

            if (updateError) {
              results.details.push({
                userId: user.id,
                email: user.email,
                issue: 'status_mismatch',
                stripeStatus,
                dbStatus: user.subscription_status,
                fixed: false,
                error: updateError.message
              });
            } else {
              results.fixed++;
              results.details.push({
                userId: user.id,
                email: user.email,
                issue: 'status_mismatch',
                stripeStatus,
                dbStatus: user.subscription_status,
                fixed: true
              });
            }
          }
        } catch (error) {
          // Subscription not found in Stripe
          if (error.code === 'resource_missing') {
            results.details.push({
              userId: user.id,
              email: user.email,
              issue: 'subscription_not_found_in_stripe',
              subscriptionId: user.stripe_subscription_id,
              fixed: false
            });
          } else {
            results.details.push({
              userId: user.id,
              email: user.email,
              issue: 'api_error',
              error: error.message,
              fixed: false
            });
          }
        }

        // Stop if we've reached the limit
        if (results.checked >= limit) {
          break;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use sync_subscription, sync_all, or fix_inconsistencies'
    }), {
      status: 400,
      headers: corsHeaders
    });

  } catch (error) {
    logger.error("Error processing request", error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
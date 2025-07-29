import Stripe from 'npm:stripe@14.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
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

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16"
});

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

/**
 * Get webhook diagnostics
 */
async function getWebhookDiagnostics(supabase) {
  try {
    // Get webhook endpoints from Stripe
    const webhookEndpoints = await stripe.webhookEndpoints.list();
    
    // Get recent webhook events from our database
    const { data: recentEvents, error: eventsError } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (eventsError) {
      throw new Error(`Error fetching recent events: ${eventsError.message}`);
    }
    
    // Get event counts by status
    const { data: eventCounts, error: countsError } = await supabase
      .rpc('get_webhook_event_counts');
    
    if (countsError) {
      throw new Error(`Error fetching event counts: ${countsError.message}`);
    }
    
    // Get event counts by type
    const { data: eventTypeStats, error: typeStatsError } = await supabase
      .rpc('get_webhook_event_type_stats');
    
    if (typeStatsError) {
      throw new Error(`Error fetching event type stats: ${typeStatsError.message}`);
    }
    
    // Get failed events
    const { data: failedEvents, error: failedError } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (failedError) {
      throw new Error(`Error fetching failed events: ${failedError.message}`);
    }
    
    // Get inconsistent user records
    const { data: inconsistentUsers, error: inconsistentError } = await supabase
      .rpc('find_inconsistent_subscription_statuses');
    
    if (inconsistentError) {
      throw new Error(`Error fetching inconsistent users: ${inconsistentError.message}`);
    }
    
    return {
      webhookEndpoints: webhookEndpoints.data.map(endpoint => ({
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status,
        enabledEvents: endpoint.enabled_events,
        apiVersion: endpoint.api_version,
        created: new Date(endpoint.created * 1000).toISOString(),
        lastError: endpoint.last_error
      })),
      eventCounts,
      eventTypeStats,
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        stripeEventId: event.stripe_event_id,
        eventType: event.event_type,
        customerEmail: event.customer_email,
        status: event.status,
        createdAt: event.created_at,
        error: event.error
      })),
      failedEvents: failedEvents.map(event => ({
        id: event.id,
        stripeEventId: event.stripe_event_id,
        eventType: event.event_type,
        customerEmail: event.customer_email,
        status: event.status,
        createdAt: event.created_at,
        error: event.error
      })),
      inconsistentUsers: inconsistentUsers || []
    };
  } catch (error) {
    console.error("Error getting webhook diagnostics:", error);
    throw error;
  }
}

/**
 * Retry failed webhook event
 */
async function retryFailedEvent(supabase, eventId) {
  try {
    // Get the failed event
    const { data: event, error: eventError } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .eq("id", eventId)
      .single();
    
    if (eventError) {
      throw new Error(`Error fetching event: ${eventError.message}`);
    }
    
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    // Update event status to retrying
    const { error: updateError } = await supabase
      .from("stripe_webhook_events")
      .update({ status: "retrying" })
      .eq("id", eventId);
    
    if (updateError) {
      throw new Error(`Error updating event status: ${updateError.message}`);
    }
    
    // Process the event based on type
    let result;
    
    switch (event.event_type) {
      case "checkout.session.completed":
        result = await processCheckoutSessionCompleted(supabase, event);
        break;
      case "invoice.payment_succeeded":
        result = await processInvoicePaymentSucceeded(supabase, event);
        break;
      case "customer.subscription.deleted":
        result = await processSubscriptionDeleted(supabase, event);
        break;
      case "invoice.payment_failed":
        result = await processInvoicePaymentFailed(supabase, event);
        break;
      default:
        result = { success: false, message: `Unsupported event type: ${event.event_type}` };
    }
    
    // Update event status based on result
    const { error: finalUpdateError } = await supabase
      .from("stripe_webhook_events")
      .update({ 
        status: result.success ? "completed" : "failed",
        error: result.success ? null : result.message
      })
      .eq("id", eventId);
    
    if (finalUpdateError) {
      throw new Error(`Error updating final event status: ${finalUpdateError.message}`);
    }
    
    return result;
  } catch (error) {
    console.error("Error retrying failed event:", error);
    
    // Update event status to failed
    try {
      await supabase
        .from("stripe_webhook_events")
        .update({ 
          status: "failed",
          error: error.message
        })
        .eq("id", eventId);
    } catch (updateError) {
      console.error("Error updating event status after failure:", updateError);
    }
    
    throw error;
  }
}

/**
 * Process checkout.session.completed event
 */
async function processCheckoutSessionCompleted(supabase, event) {
  try {
    const stripeData = event.raw_event.data.object;
    const email = event.customer_email;
    const customerId = event.customer_id;
    const subscriptionId = event.subscription_id;
    
    if (!email) {
      return { success: false, message: "Missing email in event" };
    }
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    
    if (userError) {
      return { success: false, message: `Error retrieving user: ${userError.message}` };
    }
    
    // Determine subscription type
    let subscriptionType = "monthly";
    if (stripeData.amount_total === 39900) {
      subscriptionType = "yearly";
    }
    
    if (user) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          subscription_type: subscriptionType,
          stripe_customer_id: customerId || user.stripe_customer_id,
          stripe_subscription_id: subscriptionId || user.stripe_subscription_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
      
      if (updateError) {
        return { success: false, message: `Error updating user: ${updateError.message}` };
      }
      
      return { 
        success: true, 
        message: `Updated user ${user.id} with subscription ${subscriptionId}`,
        userId: user.id
      };
    } else {
      // Create new user in auth.users
      const tempPassword = Math.random().toString(36).slice(-10);
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });
      
      if (authError) {
        return { success: false, message: `Error creating auth user: ${authError.message}` };
      }
      
      // Create user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: crypto.randomUUID(),
          user_id: authUser.user.id,
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          subscription_type: subscriptionType
        });
      
      if (profileError) {
        return { success: false, message: `Error creating user profile: ${profileError.message}` };
      }
      
      // Send password reset email
      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email
      });
      
      if (resetError) {
        console.error("Error generating password reset link:", resetError);
      }
      
      return { 
        success: true, 
        message: `Created new user for email ${email}`,
        userId: authUser.user.id
      };
    }
  } catch (error) {
    console.error("Error processing checkout.session.completed:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Process invoice.payment_succeeded event
 */
async function processInvoicePaymentSucceeded(supabase, event) {
  try {
    const stripeData = event.raw_event.data.object;
    const email = event.customer_email;
    const customerId = event.customer_id;
    const subscriptionId = event.subscription_id;
    
    if (!email) {
      return { success: false, message: "Missing email in event" };
    }
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    
    if (userError) {
      return { success: false, message: `Error retrieving user: ${userError.message}` };
    }
    
    // Determine subscription type
    let subscriptionType = "monthly";
    if (stripeData.amount_paid === 39900) {
      subscriptionType = "yearly";
    }
    
    if (user) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          subscription_status: "active",
          subscription_type: subscriptionType,
          stripe_customer_id: customerId || user.stripe_customer_id,
          stripe_subscription_id: subscriptionId || user.stripe_subscription_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
      
      if (updateError) {
        return { success: false, message: `Error updating user: ${updateError.message}` };
      }
      
      return { 
        success: true, 
        message: `Updated user ${user.id} with subscription ${subscriptionId}`,
        userId: user.id
      };
    } else {
      return { success: false, message: "User not found and cannot be created from invoice event" };
    }
  } catch (error) {
    console.error("Error processing invoice.payment_succeeded:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Process customer.subscription.deleted event
 */
async function processSubscriptionDeleted(supabase, event) {
  try {
    const email = event.customer_email;
    const customerId = event.customer_id;
    
    // Try to find user by email first
    let user = null;
    
    if (email) {
      const { data: userByEmail, error: emailError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (!emailError) {
        user = userByEmail;
      }
    }
    
    // If not found by email, try by customer ID
    if (!user && customerId) {
      const { data: userByCustomerId, error: customerIdError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      
      if (!customerIdError) {
        user = userByCustomerId;
      }
    }
    
    if (!user) {
      return { success: false, message: "User not found by email or customer ID" };
    }
    
    // Update user profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        subscription_status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);
    
    if (updateError) {
      return { success: false, message: `Error updating user: ${updateError.message}` };
    }
    
    return { 
      success: true, 
      message: `Updated user ${user.id} subscription status to cancelled`,
      userId: user.id
    };
  } catch (error) {
    console.error("Error processing customer.subscription.deleted:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Process invoice.payment_failed event
 */
async function processInvoicePaymentFailed(supabase, event) {
  try {
    const email = event.customer_email;
    const customerId = event.customer_id;
    
    // Try to find user by email first
    let user = null;
    
    if (email) {
      const { data: userByEmail, error: emailError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      
      if (!emailError) {
        user = userByEmail;
      }
    }
    
    // If not found by email, try by customer ID
    if (!user && customerId) {
      const { data: userByCustomerId, error: customerIdError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      
      if (!customerIdError) {
        user = userByCustomerId;
      }
    }
    
    if (!user) {
      return { success: false, message: "User not found by email or customer ID" };
    }
    
    // Update user profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        subscription_status: "payment_failed",
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);
    
    if (updateError) {
      return { success: false, message: `Error updating user: ${updateError.message}` };
    }
    
    return { 
      success: true, 
      message: `Updated user ${user.id} subscription status to payment_failed`,
      userId: user.id
    };
  } catch (error) {
    console.error("Error processing invoice.payment_failed:", error);
    return { success: false, message: error.message };
  }
}

Deno.serve(async (req) => {
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
    if (req.method === "GET") {
      // Get webhook diagnostics
      const diagnostics = await getWebhookDiagnostics(supabase);
      
      return new Response(JSON.stringify({
        success: true,
        diagnostics
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else if (req.method === "POST") {
      // Parse request body
      const { action, eventId } = await req.json();
      
      if (action === 'retry_event' && eventId) {
        const result = await retryFailedEvent(supabase, eventId);
        
        return new Response(JSON.stringify({
          success: result.success,
          message: result.message,
          userId: result.userId
        }), {
          status: result.success ? 200 : 400,
          headers: corsHeaders
        });
      }
      
      return new Response(JSON.stringify({
        error: 'Invalid action. Use retry_event'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
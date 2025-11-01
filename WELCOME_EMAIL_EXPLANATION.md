# 🔍 Welcome Email Issue - Complete Analysis & Local Setup Guide

## 📋 Problem Summary

**Issue**: When a user subscribes (monthly or yearly plan), they do NOT receive the welcome email with password creation link.

**Expected Flow**:
1. User completes Stripe checkout
2. Stripe sends `checkout.session.completed` webhook
3. Subscription is created in database with status "incomplete"
4. Stripe sends `invoice.payment_succeeded` webhook
5. Subscription status updated to "active"
6. **MISSING**: Welcome email should be triggered here
7. User receives email with password creation link

---

## 🐛 Root Cause Analysis

### Current Implementation

I analyzed the codebase and found:

1. **Stripe Webhook Handler** (`supabase/functions/stripe-webhook/index.ts`)
   - ✅ Handles `checkout.session.completed` - creates subscription with status "incomplete"
   - ✅ Handles `invoice.payment_succeeded` - updates subscription to "active"
   - ❌ **DOES NOT trigger welcome email function**

2. **Welcome Email Function** (`supabase/functions/stripe-user-welcome/index.ts`)
   - ✅ Exists and is properly configured
   - ✅ Generates password creation link via `supabase.auth.admin.generateLink()`
   - ✅ Inserts email into `emails` table with status "pending"
   - ❌ **NEVER CALLED** by the webhook handler

3. **Email Processing** (`src/lib/email.ts`)
   - ✅ Generic email sending function exists
   - ❌ Not integrated with subscription flow

### The Missing Link

The `stripe-webhook` function updates the subscription status to "active" but **never invokes** the `stripe-user-welcome` function. There's no database trigger or function call to send the welcome email.

---

## ✅ Solution: Add Welcome Email Trigger

### Option 1: Modify Webhook Handler (RECOMMENDED)

Add welcome email invocation in `handleInvoicePaymentSucceeded` function:

```typescript
// In supabase/functions/stripe-webhook/index.ts
async function handleInvoicePaymentSucceeded(evt: Stripe.Event) {
  const invoice = evt.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription as Stripe.Subscription).id;

  const sub =
    typeof invoice.subscription === "string"
      ? await stripe.subscriptions.retrieve(subId)
      : (invoice.subscription as Stripe.Subscription);

  // Get subscription from database to check if it's the first payment
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("status, user_id")
    .eq("stripe_subscription_id", subId)
    .single();

  const isFirstPayment = existingSub?.status !== "active";

  // Update subscription status
  const { error } = await supabase
    .from("subscriptions")
    .update({
      latest_invoice_id: invoice.id,
      latest_payment_intent_id:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : null,
      product_id: sub.items?.data?.[0]?.price?.product?.toString() ?? null,
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      status: "active",
      current_period_start: toIsoOrNull(sub.current_period_start),
      current_period_end: toIsoOrNull(sub.current_period_end),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subId);

  if (error) {
    throw new Error(
      "subscriptions update on invoice succeeded failed: " + error.message
    );
  }

  // 🎯 NEW: Send welcome email on first payment
  if (isFirstPayment && existingSub?.user_id) {
    try {
      // Get user profile with email
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email, first_name")
        .eq("id", existingSub.user_id)
        .single();

      if (profile?.email) {
        console.log(`📧 Sending welcome email to ${profile.email}`);
        
        // Invoke welcome email function
        const { error: emailError } = await supabase.functions.invoke(
          "stripe-user-welcome",
          {
            body: {
              email: profile.email,
              firstName: profile.first_name || "",
              redirectTo: "https://club.nowme.fr/update-password"
            }
          }
        );

        if (emailError) {
          console.error("❌ Failed to send welcome email:", emailError);
          // Don't throw - email failure shouldn't fail the webhook
        } else {
          console.log("✅ Welcome email queued successfully");
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Welcome email error:", emailErr);
      // Don't throw - continue processing
    }
  }
}
```

### Option 2: Database Trigger (Alternative)

Create a PostgreSQL trigger that fires when subscription status changes to "active":

```sql
-- Create function to send welcome email
CREATE OR REPLACE FUNCTION send_welcome_email_on_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Only trigger on first activation (status changed from non-active to active)
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- Get user profile
    SELECT email, first_name INTO v_profile
    FROM public.user_profiles
    WHERE id = NEW.user_id;
    
    IF v_profile.email IS NOT NULL THEN
      -- Call the edge function via pg_net or insert into emails table
      INSERT INTO public.emails (to_address, subject, content, status)
      VALUES (
        v_profile.email,
        'Bienvenue chez Nowme ! Crée ton mot de passe',
        'Welcome email content here',
        'pending'
      );
      
      -- Note: You'll need to separately invoke the stripe-user-welcome function
      -- or use pg_net extension to call it directly
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_send_welcome_email
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION send_welcome_email_on_subscription();
```

---

## 🚀 Local Development Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Stripe CLI** (for webhook testing)
3. **Supabase CLI** (optional, for local functions)

### Step 1: Install Dependencies

```bash
cd c:\Users\boris\.symfony\nowme\club-nowme
npm install
```

### Step 2: Environment Variables

Your `.env` file is already configured with:
- ✅ Supabase credentials
- ✅ Stripe keys (test mode)
- ✅ Resend API key
- ✅ Database connection

### Step 3: Start Development Server

```bash
npm run dev
```

This will start Vite dev server at `http://localhost:5173`

### Step 4: Test Stripe Webhooks Locally

#### Option A: Using Stripe CLI (RECOMMENDED)

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli

2. **Login to Stripe**:
```bash
stripe login
```

3. **Forward webhooks to your Supabase function**:
```bash
stripe listen --forward-to https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/stripe-webhook
```

4. **Get the webhook signing secret** from the CLI output and add it to your Supabase secrets:
```bash
# The CLI will output something like:
# whsec_xxxxxxxxxxxxx
```

5. **Trigger test events**:
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test invoice payment
stripe trigger invoice.payment_succeeded
```

#### Option B: Using Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.*`
4. Copy the webhook secret and update Supabase environment variables

### Step 5: Test Complete Subscription Flow

```bash
npm run test:complete-flow
```

Or manually:
1. Go to `http://localhost:5173/subscription`
2. Click "Je commence à 12,99€"
3. Fill in test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check Supabase logs for webhook events
6. Check `emails` table for queued email

---

## 🔧 Implementation Steps

### 1. Update Webhook Handler

Edit `supabase/functions/stripe-webhook/index.ts` and add the welcome email logic shown in Option 1 above.

### 2. Deploy the Updated Function

```bash
# If using Supabase CLI
supabase functions deploy stripe-webhook

# Or push to GitHub - it will auto-deploy via GitHub Actions
git add .
git commit -m "Add welcome email trigger on subscription activation"
git push
```

### 3. Test the Flow

1. Create a test subscription
2. Monitor Supabase logs:
   - Go to Supabase Dashboard → Edge Functions → stripe-webhook → Logs
3. Check for welcome email log messages
4. Verify email in `emails` table:
```sql
SELECT * FROM emails ORDER BY created_at DESC LIMIT 10;
```

### 4. Verify Email Sending

The email should be processed by the `process-email-queue` function. Check:
1. Email status changes from "pending" to "sent"
2. User receives email with password creation link

---

## 📊 Database Schema Reference

### `subscriptions` table
```sql
- id (uuid, PK)
- user_id (uuid, FK to user_profiles)
- stripe_subscription_id (text, unique)
- stripe_customer_id (text)
- status (text) -- 'incomplete', 'active', 'past_due', 'canceled'
- product_id (text)
- price_id (text)
- current_period_start (timestamptz)
- current_period_end (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### `emails` table
```sql
- id (uuid, PK)
- to_address (text)
- subject (text)
- content (text)
- status (text) -- 'pending', 'sent', 'failed'
- sent_at (timestamptz)
- created_at (timestamptz)
```

### `user_profiles` table
```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- email (text)
- first_name (text)
- last_name (text)
- stripe_customer_id (text)
- created_at (timestamptz)
```

---

## 🧪 Testing Checklist

- [ ] Local dev server running (`npm run dev`)
- [ ] Stripe CLI forwarding webhooks
- [ ] Create test subscription (monthly plan)
- [ ] Verify webhook received in Supabase logs
- [ ] Check subscription status = "active" in database
- [ ] Verify email inserted in `emails` table
- [ ] Confirm email status = "pending"
- [ ] Wait for email processing (or trigger manually)
- [ ] Verify email status = "sent"
- [ ] Check user received email
- [ ] Test password creation link works

---

## 🔍 Debugging Commands

### Check Recent Webhook Events
```sql
SELECT stripe_event_id, event_type, status, error_message, received_at
FROM stripe_webhook_events
ORDER BY received_at DESC
LIMIT 20;
```

### Check Subscription Status
```sql
SELECT s.*, up.email, up.first_name
FROM subscriptions s
JOIN user_profiles up ON up.id = s.user_id
ORDER BY s.created_at DESC
LIMIT 10;
```

### Check Email Queue
```sql
SELECT id, to_address, subject, status, created_at, sent_at
FROM emails
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Check Failed Emails
```sql
SELECT id, to_address, subject, status, error_message, created_at
FROM emails
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📝 Additional Notes

### Email Provider (Resend)
- API Key configured in `.env`: `RESEND_API_KEY`
- Sending domain: `contact@nowme.fr`
- Make sure domain is verified in Resend dashboard

### Supabase Edge Functions
- All functions are deployed to: `https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/`
- Functions use Deno runtime
- Environment variables set in Supabase dashboard

### Stripe Configuration
- Using test mode keys
- Monthly price: `price_1RqraiDaQ8XsywAvAAmxoAFW` (39.99€)
- Yearly price: `price_1Rqrb6DaQ8XsywAvvF8fsaJi` (399€)
- Webhook secret: `whsec_7952d7f271b8c78c892d7771cbdbc08c75a1875c35eeeb6f5ffebb5d33a9ab5a`

---

## 🎯 Quick Fix Summary

**The core issue**: The `stripe-webhook` function never calls the `stripe-user-welcome` function when a subscription becomes active.

**The solution**: Add a function call to `stripe-user-welcome` inside `handleInvoicePaymentSucceeded` when `isFirstPayment === true`.

**To launch locally**:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/stripe-webhook

# Terminal 3: Test subscription flow
# Go to http://localhost:5173/subscription and complete a test purchase
```

---

## 🆘 Need Help?

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check Stripe webhook logs in dashboard
3. Verify all environment variables are set
4. Test email sending separately with `stripe-user-welcome` function
5. Check database for subscription and email records

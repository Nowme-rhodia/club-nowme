# 🚨 Supabase Support Request - Critical Production Issues

## Project Information
- **Project ID**: `dqfyuhwrjozoxadkccdj`
- **Project URL**: https://dqfyuhwrjozoxadkccdj.supabase.co
- **Application**: Nowme Club (subscription-based platform)
- **Issue Type**: Multiple critical failures blocking production

## Summary
We're experiencing multiple critical issues that are completely blocking our production deployment:

1. **Edge Function deployment failures** with parsing errors
2. **Auth API completely broken** - both `/admin/users` and `/admin/generate_link` failing
3. **Database constraint corruption** preventing any user creation
4. **Complete user onboarding flow broken** - customers pay but cannot access the platform

## Issue 1: Edge Function Deployment Failures

### Error Details
```
Function name: stripe-webhook
Error message: Failed to deploy edge function: Supabase API error, 400, failed to create the graph

Caused by:
    The module's source code could not be parsed: Expression expected at file:///tmp/user_fn_dqfyuhwrjozoxadkccdj_61da3804-c318-4739-94f5-50226eec817e_363/source/index.ts:485:2
    
      });
       ~
```

### Current Edge Function Code (Simplified Version)
```typescript
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    let event;
    
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      return new Response(`Invalid JSON: ${err.message}`, { status: 400 });
    }

    // Save event to database
    const { data: webhookEvent, error: insertError } = await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        customer_email: event.data.object.customer_email,
        status: 'processing',
        raw_event: event
      })
      .select('id')
      .single();

    if (insertError) {
      return new Response(`Database error: ${insertError.message}`, { status: 500 });
    }

    // Process checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(`Internal server error: ${err.message}`, { status: 500 });
  }
});

async function handleCheckoutCompleted(session) {
  const email = session.customer_email;
  
  // Create auth user
  const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: 'motdepasse123',
    email_confirm: true
  });
  
  if (createError) throw createError;

  // Create user profile
  await supabase.from('user_profiles').insert({
    user_id: newAuthUser.user.id,
    email,
    subscription_status: 'active'
  });

  // Send welcome email
  await supabase.from('emails').insert({
    to_address: email,
    subject: 'Welcome to Nowme Club!',
    content: 'Your account is ready...',
    status: 'pending'
  });
}
```

**The parsing error suggests there's a syntax issue around line 485, but we cannot identify the exact location.**

## Issue 2: Auth API Completely Broken

### Error Logs from Production
```json
{
  "error": "404: User with this email not found",
  "path": "/admin/generate_link",
  "status": 404,
  "timestamp": 1754485375000000
}

{
  "error": "unable to fetch records: sql: Scan error on column index 3, name \"confirmation_token\": converting NULL to string is unsupported",
  "path": "/admin/users",
  "status": 500,
  "timestamp": 1754484993000000
}
```

### Current admin-generate-link Function
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email } = await req.json();
    
    // This consistently returns 404 even when user exists
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });
    
    if (resetError) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: resetError.message 
      }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      link: resetData.properties.action_link
    }), { status: 200 });
    
  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: err.message 
    }), { status: 500 });
  }
});
```

### Problems with Auth API
1. **`/admin/users` endpoint returns 500** with SQL scan error on `confirmation_token` field
2. **`/admin/generate_link` consistently returns 404** even when user exists in database
3. **`listUsers()` method fails** with SQL errors

## Issue 3: Database Constraint Corruption

### Current Database State
We have orphaned records in `user_profiles` with `user_id = null`:

```sql
SELECT 'user_profiles' as source, email, user_id FROM user_profiles WHERE email LIKE '%test%'
UNION ALL  
SELECT 'auth.users' as source, email, id as user_id FROM auth.users WHERE email LIKE '%test%';
```

**Results:**
```
user_profiles | test-temp@example.com | null
user_profiles | test-flow@nowme.fr   | null
auth.users    | test1@nowme.fr       | f644e6dd-5028-4d38-9889-3a4f45245feb
auth.users    | test2@nowme.fr       | 275dd705-468f-4a00-9268-365bd3c7b8f9
```

### Constraint Violation Error
When trying to create a new user, we get:
```
ERROR: 23505: duplicate key value violates unique constraint "user_profiles_user_id_key"
DETAIL: Key (user_id)=(0b8cd675-d9e0-44c1-b044-a0757f258651) already exists.
```

**This happens even with freshly generated UUIDs**, suggesting database corruption.

### Failed SQL Attempts
```sql
-- This fails with constraint violation
DO $$
DECLARE
  user_uuid uuid;
  profile_id uuid;
BEGIN
  user_uuid := gen_random_uuid();
  
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_uuid, 'authenticated', 'authenticated',
    'test-flow@nowme.fr',
    crypt('motdepasse123', gen_salt('bf')),
    now(), now(), now(),
    '{}', '{}', false
  );

  INSERT INTO public.user_profiles (
    id, user_id, email, first_name, last_name, phone,
    subscription_status, subscription_type, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), user_uuid, 'test-flow@nowme.fr', 'Test', 'Flow',
    '+33612345678', 'active', 'premium', now(), now()
  );
END;
$$;
```

## Issue 4: Complete User Flow Breakdown

### Expected Flow
1. User subscribes via Stripe → `checkout.session.completed` webhook
2. Webhook creates user in `auth.users` + `user_profiles` + `member_rewards`
3. Welcome email sent with login credentials
4. User can login immediately

### Current Broken Flow
1. ✅ Stripe webhook received and logged in `stripe_webhook_events`
2. ✅ `user_profiles` record created/updated
3. ✅ Email queued and sent via `send-emails` function
4. ❌ **No user created in `auth.users`** due to Edge Function deployment failures
5. ❌ **`admin/generate_link` fails with 404** due to Auth API issues
6. ❌ **User cannot login** - complete flow broken

## Recent Error Logs Analysis

### Webhook Processing (Working)
```
POST | 201 | stripe_webhook_events | 200 OK
PATCH | 204 | user_profiles | 200 OK  
POST | 201 | emails | 200 OK
```

### Auth API Failures (Broken)
```
GET | 500 | /auth/v1/admin/users | SQL scan error on confirmation_token
POST | 404 | /auth/v1/admin/generate_link | User not found
```

### Email Processing (Working)
```
GET | 200 | emails?status=eq.pending | 200 OK
PATCH | 204 | emails | 200 OK (status updated to sent)
POST | 201 | email_logs | 200 OK
```

## Database Schema Issues

### Constraint Problems
- **Foreign key constraints** between `user_profiles.user_id` and `auth.users.id` are corrupted
- **Unique constraints** preventing proper user creation even with fresh UUIDs
- **Orphaned records** with `user_id = null` causing cascade failures

### Schema Verification Needed
Please help us verify the current state with these queries:

```sql
-- Check constraint definitions
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_profiles 
FROM user_profiles 
WHERE user_id IS NULL;

-- Check auth.users table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users' 
AND column_name IN ('id', 'email', 'confirmation_token');
```

## Environment Configuration

### Edge Function Environment Variables
- `SUPABASE_URL`: ✅ Set
- `SUPABASE_SERVICE_ROLE_KEY`: ✅ Set  
- `STRIPE_SECRET_KEY`: ✅ Set
- `STRIPE_WEBHOOK_SECRET`: ✅ Set
- `RESEND_API_KEY`: ✅ Set

### Project Configuration
- **Project ID**: dqfyuhwrjozoxadkccdj
- **Region**: eu-west-1
- **Postgres Version**: 15
- **API Version**: Latest

## Requested Support

1. **Investigate Auth API failures** - Why are `/admin/users` and `/admin/generate_link` consistently failing?

2. **Help diagnose Edge Function parsing error** - What's causing the syntax error that prevents deployment?

3. **Database constraint corruption** - Why do unique constraints fail even with fresh UUIDs?

4. **Provide working alternative** - If current approach is fundamentally flawed, what's the recommended pattern?

## Urgency Level
**CRITICAL** - This is blocking our production launch and affecting paying customers. Users are completing Stripe payments but cannot access the platform.

## Additional Context
- This is a subscription-based platform where users pay via Stripe and get immediate access
- The webhook needs to create complete user accounts (auth + profile + rewards) automatically
- We're using the latest versions of Supabase JS SDK and Stripe SDK
- The application is deployed on Netlify with Supabase as backend
- We have paying customers who cannot access their accounts

## Immediate Workaround Needed
We need an immediate solution to:
1. Create user accounts for existing paying customers
2. Fix the webhook flow for new customers
3. Restore normal platform functionality

Thank you for urgent assistance. This is affecting real customers and revenue.
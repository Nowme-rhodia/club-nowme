-- Migration: Add missing subscription columns to user_profiles
-- Created at: 2025-12-31T19:10:00.000Z

-- Add subscription_status if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
    END IF;
END $$;

-- Add subscription_type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_type') THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_type TEXT DEFAULT 'monthly';
    END IF;
END $$;

-- Add stripe_subscription_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN stripe_subscription_id TEXT;
    END IF;
END $$;

-- Add subscription_updated_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_updated_at') THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Optional: Sync status from subscriptions table if possible
-- UPDATE public.user_profiles up
-- SET subscription_status = s.status
-- FROM public.subscriptions s
-- WHERE up.user_id = s.user_id;

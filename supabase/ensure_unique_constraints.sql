-- Ensure unique constraints on critical fields

-- Email must be unique in user_profiles to prevent duplicates
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_email_key UNIQUE (email);

-- Stripe Customer ID must be unique to prevent linking multiple users to same payment profile
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);

-- Ensure user_id is unique (it likely is via PK, but good to be sure if it's not PK)
-- Assuming user_id is NOT the primary key (id is), but it should still be unique per user.
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);

-- Add new columns for Offer Duration and Promo Conditions
ALTER TABLE "public"."offers" ADD COLUMN IF NOT EXISTS "promo_conditions" text;
ALTER TABLE "public"."offers" ADD COLUMN IF NOT EXISTS "duration_type" text DEFAULT 'lifetime'; -- 'lifetime' or 'fixed'
ALTER TABLE "public"."offers" ADD COLUMN IF NOT EXISTS "validity_start_date" timestamp with time zone;
ALTER TABLE "public"."offers" ADD COLUMN IF NOT EXISTS "validity_end_date" timestamp with time zone;

-- Add discounted_price to offer_variants
ALTER TABLE "public"."offer_variants" 
ADD COLUMN IF NOT EXISTS "discounted_price" numeric;

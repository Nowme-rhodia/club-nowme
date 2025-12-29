-- Add new columns to offer_variants
ALTER TABLE "public"."offer_variants" 
ADD COLUMN IF NOT EXISTS "description" text,
ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 0;

-- Add variant_id to bookings to track which option was chosen
ALTER TABLE "public"."bookings" 
ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "public"."offer_variants"("id");

-- Update RLS if necessary (usually standard insert/select policies cover new columns if they are not restricted)
-- Just in case, ensure public read access to variants columns
GRANT SELECT ON TABLE "public"."offer_variants" TO "anon";
GRANT SELECT ON TABLE "public"."offer_variants" TO "authenticated";

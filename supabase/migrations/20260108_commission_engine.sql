-- Migration: Commission Engine Implementation
-- Date: 2026-01-08
-- Description: Adds commission tracking to categories and bookings. Updates confirm_booking RPC.

-- 1. Update Categories Table with Commission Configuration
ALTER TABLE offer_categories 
ADD COLUMN IF NOT EXISTS commission_model text CHECK (commission_model IN ('acquisition', 'transaction')) DEFAULT 'transaction',
ADD COLUMN IF NOT EXISTS rate_first_order numeric DEFAULT 15, -- Default 15%
ADD COLUMN IF NOT EXISTS rate_recurring numeric DEFAULT 15; -- Default 15%

-- 2. Update Bookings Table with Commission Tracking
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_note text;

-- 3. Seed Commission Data
-- Coaching / Wellness: Acquisition (20% first, 2% recurring)
UPDATE offer_categories 
SET commission_model = 'acquisition', rate_first_order = 20, rate_recurring = 2 
WHERE name ILIKE '%coaching%' 
   OR name ILIKE '%bien-être%' 
   OR name ILIKE '%développement personnel%'
   OR name ILIKE '%spiritualité%'
   OR name ILIKE '%praticien%'
   OR name ILIKE '%service à domicile%';

-- Transactional / Products: Transaction (15% fixed)
UPDATE offer_categories 
SET commission_model = 'transaction', rate_first_order = 15, rate_recurring = 15
WHERE name ILIKE '%culture%' 
   OR name ILIKE '%loisir%' 
   OR name ILIKE '%atelier%' 
   OR name ILIKE '%divertissement%'
   OR name ILIKE '%produit%'
   OR name ILIKE '%spa%'
   OR name ILIKE '%hôtel%'
   OR name ILIKE '%sport%';


-- 4. Update confirm_booking RPC to accept commission data AND commission_note
-- We need to drop and recreate because we are changing signature.
DROP FUNCTION IF EXISTS confirm_booking(uuid, uuid, timestamptz, text, text, numeric, uuid, text, text);

CREATE OR REPLACE FUNCTION confirm_booking(
  p_user_id UUID,
  p_offer_id UUID,
  p_booking_date TIMESTAMPTZ,
  p_status TEXT,
  p_source TEXT,
  p_amount NUMERIC,
  p_variant_id UUID DEFAULT NULL,
  p_external_id TEXT DEFAULT NULL,
  p_meeting_location TEXT DEFAULT NULL,
  p_commission_amount NUMERIC DEFAULT 0,
  p_commission_note TEXT DEFAULT NULL
) 
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_booking_id UUID;
  v_stock INT;
  v_existing_id UUID;
  v_partner_id UUID;
BEGIN

  -- 0. Get Partner ID from Offer to ensure data integrity
  SELECT partner_id INTO v_partner_id FROM offers WHERE id = p_offer_id;

  -- 1. Check Stock if Variant is involved
  IF p_variant_id IS NOT NULL THEN
    SELECT stock INTO v_stock FROM offer_variants WHERE id = p_variant_id;
    
    IF v_stock IS NOT NULL AND v_stock <= 0 THEN
      RAISE EXCEPTION 'Stock exhausted for this variant';
    END IF;

    -- Decrement Stock (Atomic)
    IF v_stock IS NOT NULL THEN
      UPDATE offer_variants SET stock = stock - 1 WHERE id = p_variant_id;
    END IF;
  END IF;

  -- 2. Check for an existing PENDING booking for this user/offer
  SELECT id INTO v_existing_id 
  FROM bookings 
  WHERE user_id = p_user_id 
    AND offer_id = p_offer_id 
    AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
     -- UPDATE existing pending booking
     UPDATE bookings 
     SET 
        status = p_status,
        source = p_source,
        amount = p_amount,
        partner_id = v_partner_id,
        variant_id = COALESCE(p_variant_id, variant_id),
        external_id = p_external_id,
        booking_date = p_booking_date,
        meeting_location = CASE 
            WHEN p_meeting_location IS NOT NULL AND TRIM(p_meeting_location) <> '' THEN p_meeting_location 
            ELSE meeting_location 
        END,
        commission_amount = p_commission_amount,
        commission_note = p_commission_note,
        updated_at = now()
     WHERE id = v_existing_id
     RETURNING id INTO v_booking_id;
  ELSE
     -- INSERT New Booking
     INSERT INTO bookings (
        user_id, offer_id, partner_id, booking_date, status, source, amount, variant_id, external_id, meeting_location, commission_amount, commission_note
     ) VALUES (
        p_user_id, p_offer_id, v_partner_id, p_booking_date, p_status, p_source, p_amount, p_variant_id, p_external_id, p_meeting_location, p_commission_amount, p_commission_note
     )
     RETURNING id INTO v_booking_id;
  END IF;

  -- 3. Return Success
  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

END;
$$;

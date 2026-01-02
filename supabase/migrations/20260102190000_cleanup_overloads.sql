-- Clean up all potential overloads of confirm_booking before recreating the definitive one.
-- This resolves the PGRST203 "Could not choose the best candidate function" error.

-- 1. Drop signature with TEXT date (First version)
DROP FUNCTION IF EXISTS confirm_booking(uuid, uuid, text, text, text, numeric, uuid, text);

-- 2. Drop signature with TIMESTAMPTZ date but NO meeting location (Intermediate version)
DROP FUNCTION IF EXISTS confirm_booking(uuid, uuid, timestamptz, text, text, numeric, uuid, text);

-- 3. Drop signature with TIMESTAMPTZ date AND meeting location (Current intended version - dropping to recreate cleanly)
DROP FUNCTION IF EXISTS confirm_booking(uuid, uuid, timestamptz, text, text, numeric, uuid, text, text);

-- 4. Recreate the definitive function (matches 20260102023000_fix_confirm_booking_final.sql)
CREATE OR REPLACE FUNCTION confirm_booking(
  p_user_id UUID,
  p_offer_id UUID,
  p_booking_date TIMESTAMPTZ,
  p_status TEXT,
  p_source TEXT,
  p_amount NUMERIC,
  p_variant_id UUID DEFAULT NULL,
  p_external_id TEXT DEFAULT NULL,
  p_meeting_location TEXT DEFAULT NULL
) 
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  v_booking_id UUID;
  v_stock INT;
  v_existing_id UUID;
  v_partner_id UUID; -- Added to ensure partner_id is set if not present in offer (though usually it is)
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

  -- 2. Check for an existing PENDING booking for this user/offer (from Calendly)
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
        variant_id = COALESCE(p_variant_id, variant_id),
        external_id = p_external_id,
        booking_date = p_booking_date,
        meeting_location = CASE 
            WHEN p_meeting_location IS NOT NULL AND TRIM(p_meeting_location) <> '' THEN p_meeting_location 
            ELSE meeting_location 
        END,
        updated_at = now()
     WHERE id = v_existing_id
     RETURNING id INTO v_booking_id;
  ELSE
     -- INSERT New Booking
     INSERT INTO bookings (
        user_id, offer_id, partner_id, booking_date, status, source, amount, variant_id, external_id, meeting_location
     ) VALUES (
        p_user_id, p_offer_id, v_partner_id, p_booking_date, p_status, p_source, p_amount, p_variant_id, p_external_id, p_meeting_location
     )
     RETURNING id INTO v_booking_id;
  END IF;

  -- 3. Return Success
  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

END;
$$;

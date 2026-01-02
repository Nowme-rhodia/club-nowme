
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
BEGIN

  -- 1. Check Stock if Variant is involved
  IF p_variant_id IS NOT NULL THEN
    SELECT stock INTO v_stock FROM offer_variants WHERE id = p_variant_id;
    
    IF v_stock IS NOT NULL AND v_stock <= 0 THEN
      RAISE EXCEPTION 'Stock exhausted for this variant';
    END IF;

    -- Decrement Stock (Optimistic locking assumed single thread per variant usually sufficient for low vol)
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
        variant_id = COALESCE(variant_id, p_variant_id), -- Keeps existing if present (unlikely) or sets new
        external_id = p_external_id,
        booking_date = p_booking_date, -- Update action date
        meeting_location = COALESCE(p_meeting_location, meeting_location), -- Update location if provided (Stripe source overrides or fills)
        updated_at = now()
     WHERE id = v_existing_id
     RETURNING id INTO v_booking_id;
  ELSE
     -- INSERT New Booking
    INSERT INTO bookings (
        user_id, offer_id, booking_date, status, source, amount, variant_id, external_id, meeting_location
    ) VALUES (
        p_user_id, p_offer_id, p_booking_date, p_status, p_source, p_amount, p_variant_id, p_external_id, p_meeting_location
    )
    RETURNING id INTO v_booking_id;
  END IF;

  -- 3. Return Success
  RETURN json_build_object('success', true, 'booking_id', v_booking_id);

END;
$$;

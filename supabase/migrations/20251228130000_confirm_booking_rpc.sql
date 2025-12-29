-- Function to handle booking confirmation and stock decrement atomically
CREATE OR REPLACE FUNCTION confirm_booking(
    p_user_id uuid,
    p_offer_id uuid,
    p_booking_date text, -- ISO string
    p_status text,
    p_source text,
    p_amount numeric,
    p_variant_id uuid DEFAULT NULL,
    p_external_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass potential RLS complexity if needed, or ensure user has rights
AS $$
DECLARE
    v_stock integer;
    v_booking_id uuid;
BEGIN
    -- 1. Check Stock if variant_id is provided
    IF p_variant_id IS NOT NULL THEN
        SELECT stock INTO v_stock
        FROM offer_variants
        WHERE id = p_variant_id
        FOR UPDATE; -- Lock the row to prevent race conditions

        IF v_stock IS NOT NULL AND v_stock <= 0 THEN
            RAISE EXCEPTION 'Stock épuisé pour cette option.';
        END IF;

        -- 2. Decrement Stock
        IF v_stock IS NOT NULL THEN
            UPDATE offer_variants
            SET stock = stock - 1
            WHERE id = p_variant_id;
        END IF;
    END IF;

    -- 3. Insert Booking
    INSERT INTO bookings (
        user_id,
        offer_id,
        booking_date,
        status,
        source,
        amount,
        variant_id,
        external_id
    ) VALUES (
        p_user_id,
        p_offer_id,
        p_booking_date::timestamp with time zone,
        p_status,
        p_source,
        p_amount,
        p_variant_id,
        p_external_id
    )
    RETURNING id INTO v_booking_id;

    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

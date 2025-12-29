-- Migration: Update confirm_booking to set partner_id
-- Created at: 2025-12-29T12:00:00.000Z

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
SECURITY DEFINER
AS $$
DECLARE
    v_stock integer;
    v_booking_id uuid;
    v_partner_id uuid;
BEGIN
    -- 0. Get Partner ID from Offer
    SELECT partner_id INTO v_partner_id FROM offers WHERE id = p_offer_id;

    -- 1. Check Stock if variant_id is provided
    IF p_variant_id IS NOT NULL THEN
        SELECT stock INTO v_stock
        FROM offer_variants
        WHERE id = p_variant_id
        FOR UPDATE; -- Lock the row

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

    -- 3. Insert Booking with partner_id
    INSERT INTO bookings (
        user_id,
        offer_id,
        partner_id, -- Added this
        booking_date,
        status,
        source,
        amount,
        variant_id,
        external_id
    ) VALUES (
        p_user_id,
        p_offer_id,
        v_partner_id, -- Value from select
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

-- Migration: Late Cancellation Payout Logic
-- Date: 2026-01-25
-- Description: Allows partners to be paid for non-refunded cancellations.

-- 1. Add payout eligibility flag to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS is_payout_eligible BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.bookings.is_payout_eligible IS 'If true, this booking is included in partner payouts regardless of status (e.g. non-refunded cancellation)';

-- 2. Backfill: Confirmed and Completed bookings are eligible
UPDATE public.bookings 
SET is_payout_eligible = TRUE 
WHERE status IN ('confirmed', 'completed');

-- 3. Update/Define Payout Generation RPC
-- Drop first to allow return type change
DROP FUNCTION IF EXISTS generate_monthly_partner_payouts(date);
DROP FUNCTION IF EXISTS generate_monthly_partner_payouts(p_ref_date date);

-- This function calculates payouts for a given month reference date
CREATE OR REPLACE FUNCTION generate_monthly_partner_payouts(p_ref_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Determine start and end of the month for the reference date
    -- If p_ref_date is '2026-02-15', start='2026-02-01', end='2026-02-28'
    v_start_date := date_trunc('month', p_ref_date)::DATE;
    v_end_date := (date_trunc('month', p_ref_date) + interval '1 month' - interval '1 day')::DATE;

    -- Insert/Update Payouts
    INSERT INTO public.payouts (
        partner_id,
        period_start,
        period_end,
        total_amount_collected,
        commission_amount,
        commission_tva, -- Assuming 0 for now as simplified in logic
        net_payout_amount,
        status
    )
    SELECT
        b.partner_id,
        v_start_date,
        v_end_date,
        COALESCE(SUM(b.amount), 0),
        COALESCE(SUM(b.commission_amount), 0),
        0, -- commission_tva placeholder
        COALESCE(SUM(b.amount - b.commission_amount), 0), -- Net = Collected - Commission
        'pending'
    FROM public.bookings b
    WHERE 
        b.booking_date >= v_start_date 
        AND b.booking_date <= v_end_date
        AND b.partner_id IS NOT NULL
        AND (
            b.status IN ('confirmed', 'completed') 
            OR 
            (b.status = 'cancelled' AND b.is_payout_eligible = TRUE)
        )
    GROUP BY b.partner_id
    ON CONFLICT (partner_id, period_start, period_end) 
    DO UPDATE SET
        total_amount_collected = EXCLUDED.total_amount_collected,
        commission_amount = EXCLUDED.commission_amount,
        net_payout_amount = EXCLUDED.net_payout_amount,
        generated_at = NOW();

END;
$$;

-- 4. Update Partner Commission View to show these cancellations
CREATE OR REPLACE VIEW partner_commission_history AS
SELECT 
    b.id as booking_id,
    b.partner_id,
    b.booking_date,
    b.amount as total_amount,
    b.commission_amount,
    b.commission_note,
    b.currency,
    b.status,
    u.email as customer_email,
    o.title as offer_title
FROM bookings b
LEFT JOIN user_profiles u ON b.user_id = u.user_id
LEFT JOIN offers o ON b.offer_id = o.id
WHERE 
  -- Show confirmed bookings OR cancelled but paid bookings
  (b.status = 'confirmed' OR (b.status = 'cancelled' AND b.is_payout_eligible = TRUE))
  AND b.commission_amount > 0;


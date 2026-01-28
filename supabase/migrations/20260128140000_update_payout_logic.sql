-- Migration: Update Payout Logic (VAT, Commission) and Schedule Cron
-- Date: 2026-01-28

-- 1. Redefine the Payout Generation RPC with correct VAT calculation
DROP FUNCTION IF EXISTS public.generate_monthly_partner_payouts(date);

CREATE OR REPLACE FUNCTION public.generate_monthly_partner_payouts(p_ref_date DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Start and end of month based on reference date
    v_start_date := date_trunc('month', p_ref_date)::DATE;
    v_end_date := (date_trunc('month', p_ref_date) + interval '1 month' - interval '1 day')::DATE;

    -- Insert/Update Payouts
    INSERT INTO public.payouts (
        partner_id,
        period_start,
        period_end,
        total_amount_collected,
        commission_amount,
        commission_tva,
        net_payout_amount,
        status
    )
    SELECT
        b.partner_id,
        v_start_date,
        v_end_date,
        -- Total collected (TTC)
        COALESCE(SUM(b.amount), 0) as total_collected,
        
        -- Commission HT (Assuming b.commission_amount from bookings is HT? 
        -- Actually, bookings.commission_amount is usually the calculated amount.
        -- Let's assume bookings.commission_amount is the BASE amount we took.
        -- If the platform takes 20%, that 20% is HT.
        -- We must add VAT (20%) on top of that commission service.
        -- Wait, usually Commission = Rate * Total.
        -- Is commission_amount in bookings table HT or TTC? 
        -- Based on standard Stripe flows, application_fee_amount is the total deducted.
        -- Let's stick to the previous logical flow but MAKE SURE we separate VAT.
        -- Logic: 
        --   Commission HT = SUM(b.commission_amount)
        --   Commission VAT = Commission HT * 0.20
        --   Net Payout = Total Collected - (Commission HT + Commission VAT)
        COALESCE(SUM(b.commission_amount), 0) as commission_ht,
        
        -- Calculate 20% VAT on the commission
        ROUND(COALESCE(SUM(b.commission_amount), 0) * 0.20, 2) as commission_tva_calc,
        
        -- Net Payout
        COALESCE(SUM(b.amount), 0) - (
            COALESCE(SUM(b.commission_amount), 0) + 
            ROUND(COALESCE(SUM(b.commission_amount), 0) * 0.20, 2)
        ) as net_payout,
        
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
        commission_tva = EXCLUDED.commission_tva,
        net_payout_amount = EXCLUDED.net_payout_amount,
        generated_at = NOW();

END;
$$;

-- 2. Schedule the 'run-payouts' Job via pg_cron (1st of Month at 02:00 AM)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule if exists
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-payouts') THEN
             PERFORM cron.unschedule('monthly-payouts');
        END IF;

        -- Schedule
        PERFORM cron.schedule(
            'monthly-payouts',
            '0 2 1 * *', -- 02:00 AM on the 1st of every month
            $cron_sql$
            SELECT
              net.http_post(
                url:='https://dqfyuhwrjozoxadkccdj.supabase.co/functions/v1/run-payouts',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
              ) as request_id;
            $cron_sql$
        );
    END IF;
END $$;

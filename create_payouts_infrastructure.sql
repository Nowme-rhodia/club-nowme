-- 1. Create Payouts Table
CREATE TABLE IF NOT EXISTS public.partner_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on run
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.partner_payouts;
DROP POLICY IF EXISTS "Partners can view own payouts" ON public.partner_payouts;

-- Policy: Admin can do everything
CREATE POLICY "Admins can manage payouts" ON public.partner_payouts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Policy: Partners can view their own payouts
CREATE POLICY "Partners can view own payouts" ON public.partner_payouts
    FOR SELECT
    TO authenticated
    USING (
        partner_id IN (
            SELECT partner_id FROM public.user_profiles
            WHERE user_id = auth.uid()
        )
    );

-- 2. Global Report Function
DROP FUNCTION IF EXISTS admin_payouts_report();
CREATE OR REPLACE FUNCTION admin_payouts_report()
RETURNS TABLE (
    total_bookings BIGINT,
    gross_total NUMERIC,
    commission NUMERIC,
    net_total NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.amount), 0) as gross_total,
        COALESCE(SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as commission,
        COALESCE(SUM(b.amount) - SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as net_total
    FROM
        bookings b
    JOIN
        partners p ON b.partner_id = p.id
    WHERE
        b.status = 'confirmed';
END;
$$;

-- 3. Partner Report Function
DROP FUNCTION IF EXISTS admin_payouts_report_by_partner(UUID);
CREATE OR REPLACE FUNCTION admin_payouts_report_by_partner(partner_uuid UUID)
RETURNS TABLE (
    total_bookings BIGINT,
    gross_total NUMERIC,
    commission NUMERIC,
    net_total NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.amount), 0) as gross_total,
        COALESCE(SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as commission,
        COALESCE(SUM(b.amount) - SUM(b.amount * (COALESCE(p.commission_rate, 15) / 100)), 0) as net_total
    FROM
        bookings b
    JOIN
        partners p ON b.partner_id = p.id
    WHERE
        b.status = 'confirmed'
        AND b.partner_id = partner_uuid;
END;
$$;

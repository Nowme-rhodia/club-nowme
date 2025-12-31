
-- Create Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount_collected NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission_tva NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    statement_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can do everything
CREATE POLICY "Admins can manage all payouts" ON payouts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid() AND up.is_admin = true
        )
    );

-- Partners can view their own payouts
CREATE POLICY "Partners can view own payouts" ON payouts
    FOR SELECT
    USING (
        partner_id IN (
            SELECT up.partner_id FROM user_profiles up 
            WHERE up.user_id = auth.uid()
            AND up.partner_id IS NOT NULL
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_partner_id ON payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_period_end ON payouts(period_end);

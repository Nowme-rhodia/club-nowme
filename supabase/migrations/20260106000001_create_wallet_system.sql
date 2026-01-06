-- Digital Wallet System Migration (User-Centric v2)
-- Created: 2026-01-06
-- FIXED: Added DROP POLICY commands to prevent errors on re-run

-- 1. Updates to Partners Table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS is_wallet_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_visit_discount_percent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurring_discount_percent integer DEFAULT 0;

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    balance numeric(10,2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    currency text DEFAULT 'EUR' NOT NULL,
    last_transaction_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, partner_id)
);

-- RLS for Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Partners can view their customers' wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;

-- Partners can view wallets belonging to them
CREATE POLICY "Partners can view their customers' wallets" 
ON public.wallets FOR SELECT 
USING (partner_id IN (
    SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
));

-- Users can view their own wallets
CREATE POLICY "Users can view their own wallets" 
ON public.wallets FOR SELECT 
USING (user_id = auth.uid());

-- 3. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('credit', 'debit')),
    amount_raw numeric(10,2) NOT NULL, -- The original amount entered
    discount_applied_percent integer DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    amount_final numeric(10,2) NOT NULL, -- The amount that affects balance
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- RLS for Transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Partners can view transactions for their wallets" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;

CREATE POLICY "Partners can view transactions for their wallets" 
ON public.wallet_transactions FOR SELECT 
USING (wallet_id IN (
    SELECT id FROM public.wallets WHERE partner_id IN (
        SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
));

CREATE POLICY "Users can view their own transactions" 
ON public.wallet_transactions FOR SELECT 
USING (wallet_id IN (
    SELECT id FROM public.wallets WHERE user_id = auth.uid()
));

-- 4. Automatic Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();


-- 5. Partner Revenue Report View
CREATE OR REPLACE VIEW public.partner_revenue_report AS
SELECT 
    p.id as partner_id,
    p.business_name,
    COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount_final ELSE 0 END), 0) as total_credits_purchased,
    COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount_final ELSE 0 END), 0) as total_consumed,
    COUNT(DISTINCT w.user_id) as active_wallet_users
FROM public.partners p
LEFT JOIN public.wallets w ON w.partner_id = p.id
LEFT JOIN public.wallet_transactions t ON t.wallet_id = w.id
GROUP BY p.id, p.business_name;


-- 6. RPC: Atomic Wallet Debit
CREATE OR REPLACE FUNCTION public.debit_wallet(
    p_user_id uuid,
    p_partner_id uuid,
    p_amount_raw numeric,
    p_description text DEFAULT 'Consommation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric;
    v_discount_percent integer;
    v_discount_amount numeric;
    v_final_amount numeric;
    v_partner_first_discount integer;
    v_partner_recurring_discount integer;
    v_has_transaction_today boolean;
BEGIN
    SELECT 
        first_visit_discount_percent, 
        recurring_discount_percent
    INTO 
        v_partner_first_discount, 
        v_partner_recurring_discount
    FROM public.partners 
    WHERE id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partner not found');
    END IF;

    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND partner_id = p_partner_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found for this user');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.wallet_transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE w.partner_id = p_partner_id 
        AND w.user_id = p_user_id
        AND t.type = 'debit'
        AND t.created_at >= current_date
    ) INTO v_has_transaction_today;
    
    IF v_has_transaction_today THEN
        v_discount_percent := COALESCE(v_partner_recurring_discount, 0);
    ELSE
        v_discount_percent := COALESCE(v_partner_first_discount, 0);
    END IF;

    v_discount_amount := ROUND((p_amount_raw * v_discount_percent / 100.0), 2);
    v_final_amount := p_amount_raw - v_discount_amount;

    IF v_current_balance < v_final_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient balance',
            'required', v_final_amount,
            'balance', v_current_balance
        );
    END IF;

    INSERT INTO public.wallet_transactions (
        wallet_id, type, amount_raw, discount_applied_percent, discount_amount, amount_final, metadata
    ) VALUES (
        v_wallet_id, 'debit', p_amount_raw, v_discount_percent, v_discount_amount, v_final_amount, jsonb_build_object('description', p_description)
    );

    UPDATE public.wallets
    SET balance = balance - v_final_amount, last_transaction_at = now()
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_current_balance - v_final_amount,
        'discount_applied', v_discount_percent,
        'final_amount', v_final_amount
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

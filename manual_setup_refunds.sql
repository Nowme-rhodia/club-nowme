-- COMPLETE SETUP: Wallet Expiry & Refund System
-- Run this in Supabase Dashboard > SQL Editor

BEGIN;

-- 1. Add Expiry to Wallets (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'expires_at') THEN 
        ALTER TABLE public.wallets ADD COLUMN expires_at timestamptz; 
    END IF; 
END $$;

-- 2. Create Refund Requests Table
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount_requested numeric(10,2) NOT NULL CHECK (amount_requested > 0),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
    admin_notes text,
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

-- RLS for Refund Requests
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own refund requests" ON public.refund_requests;
CREATE POLICY "Users can view own refund requests" 
ON public.refund_requests FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own refund requests" ON public.refund_requests;
CREATE POLICY "Users can create own refund requests" 
ON public.refund_requests FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins can view all refund requests" 
ON public.refund_requests FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- 3. Fix Relations for Admin View (The previous error fix)
ALTER TABLE public.refund_requests 
DROP CONSTRAINT IF EXISTS refund_requests_user_profile_fkey;

ALTER TABLE public.refund_requests
ADD CONSTRAINT refund_requests_user_profile_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(user_id)
ON DELETE CASCADE;

-- 4. Update Credit Wallet RPC to extend expiry (6 months)
CREATE OR REPLACE FUNCTION public.credit_wallet(
    p_user_id uuid,
    p_partner_id uuid,
    p_amount numeric,
    p_description text DEFAULT 'Credit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id uuid;
    v_new_balance numeric;
    v_expires_at timestamptz;
BEGIN
    -- Logic: Set expiry to 6 months from NOW. 
    -- If wallet exists, this extends it. If new, sets it.
    v_expires_at := now() + interval '6 months';

    -- 1. Upsert Wallet
    INSERT INTO public.wallets (user_id, partner_id, balance, expires_at)
    VALUES (p_user_id, p_partner_id, p_amount, v_expires_at)
    ON CONFLICT (user_id, partner_id) 
    DO UPDATE SET 
        balance = public.wallets.balance + EXCLUDED.balance,
        expires_at = v_expires_at, -- Extend validity on top-up
        updated_at = now()
    RETURNING id, balance INTO v_wallet_id, v_new_balance;

    -- 2. Record Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, type, amount_raw, amount_final, metadata
    ) VALUES (
        v_wallet_id, 'credit', p_amount, p_amount, jsonb_build_object('description', p_description)
    );

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet_id,
        'new_balance', v_new_balance,
        'expires_at', v_expires_at
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Force Refresh
NOTIFY pgrst, 'reload config';

COMMIT;

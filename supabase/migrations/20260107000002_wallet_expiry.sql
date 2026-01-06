-- Migration: Wallet Expiry and Refund System
-- Created: 2026-01-07

-- 1. Add Expiry to Wallets
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Refund Requests Table
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

-- Users can view and create their own requests
DROP POLICY IF EXISTS "Users can view own refund requests" ON public.refund_requests;
CREATE POLICY "Users can view own refund requests" 
ON public.refund_requests FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own refund requests" ON public.refund_requests;
CREATE POLICY "Users can create own refund requests" 
ON public.refund_requests FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Admins can view and update all requests
-- (Assuming admin policies are handled generically or implicitly via service role for now, 
-- but explicit policy is good practice if admin uses client)
DROP POLICY IF EXISTS "Admins can view all refund requests" ON public.refund_requests;
CREATE POLICY "Admins can view all refund requests" 
ON public.refund_requests FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- 3. Update Credit Wallet RPC to extend expiry
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

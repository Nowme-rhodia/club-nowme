-- Wallet Pack Support Migration
-- Created: 2026-01-06

-- 1. Add credit_amount to offer_variants
-- This stores the "Value" of the pack (e.g. 50.00) while 'price' is what the user pays (e.g. 45.00)
ALTER TABLE public.offer_variants
ADD COLUMN IF NOT EXISTS credit_amount numeric(10,2) DEFAULT NULL;

-- 2. Ensure offers table has booking_type text column (It seems to be missing from types but used in code?)
-- Check if it exists, if not add it.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'booking_type') THEN 
        ALTER TABLE public.offers ADD COLUMN booking_type text DEFAULT 'calendly'; 
    END IF; 
END $$;

-- 3. RPC: Credit Wallet (for automated top-ups)
CREATE OR REPLACE FUNCTION public.credit_wallet(
    p_user_id uuid,
    p_partner_id uuid,
    p_amount numeric,
    p_description text DEFAULT 'Achat Pack'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric;
BEGIN
    -- 1. Upsert Wallet (Create if not exists)
    INSERT INTO public.wallets (user_id, partner_id, balance)
    VALUES (p_user_id, p_partner_id, 0.00)
    ON CONFLICT (user_id, partner_id) DO NOTHING;

    -- 2. Get Wallet ID
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id AND partner_id = p_partner_id;

    -- 3. Insert Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, type, amount_raw, amount_final, metadata
    ) VALUES (
        v_wallet_id, 'credit', p_amount, p_amount, jsonb_build_object('description', p_description)
    );

    -- 4. Update Balance
    UPDATE public.wallets
    SET 
        balance = balance + p_amount,
        last_transaction_at = now()
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_current_balance + p_amount,
        'credited', p_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

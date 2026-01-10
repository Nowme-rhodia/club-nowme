-- Add Credit Balance to Member Rewards
-- Created: 2026-01-09 (Part 2)

-- 1. Add Column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_rewards' AND column_name = 'credit_balance_eur') THEN
        ALTER TABLE public.member_rewards ADD COLUMN credit_balance_eur numeric(10,2) DEFAULT 0.00 NOT NULL CHECK (credit_balance_eur >= 0);
    END IF;
END $$;

-- 2. Create Conversion RPC
CREATE OR REPLACE FUNCTION convert_points_to_credit(
    p_user_id uuid,
    p_points integer,
    p_credit_eur numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points integer;
    v_new_credit numeric;
BEGIN
    -- Check points
    SELECT points_balance INTO v_current_points
    FROM public.member_rewards
    WHERE user_id = p_user_id;

    IF v_current_points IS NULL OR v_current_points < p_points THEN
        RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    -- Update Atomic: Deduct Points, Add Credit
    UPDATE public.member_rewards
    SET 
        points_balance = points_balance - p_points,
        credit_balance_eur = credit_balance_eur + p_credit_eur,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING credit_balance_eur INTO v_new_credit;

    -- Log History
    INSERT INTO public.reward_history (user_id, amount, type, reason, metadata)
    VALUES (
        p_user_id, 
        -p_points, 
        'spent', 
        'Unlock Reward Credit', 
        jsonb_build_object('credit_eur', p_credit_eur)
    );

    RETURN v_new_credit;
END;
$$;

-- Create Loyalty System Tables
-- Created: 2026-01-09

-- 1. Member Rewards (Current Balance)
CREATE TABLE IF NOT EXISTS public.member_rewards (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    points_balance integer DEFAULT 0 NOT NULL CHECK (points_balance >= 0),
    lifetime_points integer DEFAULT 0 NOT NULL CHECK (lifetime_points >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for member_rewards
ALTER TABLE public.member_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards"
    ON public.member_rewards FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Reward History (Transaction Log)
CREATE TABLE IF NOT EXISTS public.reward_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL, -- Can be negative for spends
    type text NOT NULL CHECK (type IN ('earned', 'spent')),
    reason text NOT NULL, -- "Purchase: Massage", "Event Bonus", "Unlock: Coupon 15€"
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- RLS for reward_history
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history"
    ON public.reward_history FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Functions

-- Function to safely award points
CREATE OR REPLACE FUNCTION award_points(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure record exists
    INSERT INTO public.member_rewards (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update balance
    UPDATE public.member_rewards
    SET 
        points_balance = points_balance + p_amount,
        lifetime_points = lifetime_points + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Log history
    INSERT INTO public.reward_history (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, p_amount, 'earned', p_reason, p_metadata);
END;
$$;

-- Function to safely spend points (Unlock Reward)
CREATE OR REPLACE FUNCTION spend_points(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance integer;
BEGIN
    SELECT points_balance INTO v_current_balance
    FROM public.member_rewards
    WHERE user_id = p_user_id;

    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN false;
    END IF;

    -- Deduct points
    UPDATE public.member_rewards
    SET 
        points_balance = points_balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Log history
    INSERT INTO public.reward_history (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, -p_amount, 'spent', p_reason, p_metadata);

    RETURN true;
END;
$$;

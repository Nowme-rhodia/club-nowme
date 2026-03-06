-- Partner Credits System (Avoir)
-- Created: 2026-03-06

-- 1. Table for Partner-Specific Credits
CREATE TABLE IF NOT EXISTS public.partner_credits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL CHECK (amount >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, partner_id)
);

-- RLS
ALTER TABLE public.partner_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own partner credits" ON public.partner_credits;
CREATE POLICY "Users can view their own partner credits" 
ON public.partner_credits FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Partners can view credits issued by them" ON public.partner_credits;
CREATE POLICY "Partners can view credits issued by them" 
ON public.partner_credits FOR SELECT 
USING (partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
));

-- 2. Audit Log for Credits (Optional but recommended, using reward_history for now)

-- 3. RPC: Issue Partner Credit
CREATE OR REPLACE FUNCTION public.issue_partner_credit(
    p_user_id uuid,
    p_partner_id uuid,
    p_amount numeric,
    p_reason text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_amount numeric;
BEGIN
    INSERT INTO public.partner_credits (user_id, partner_id, amount)
    VALUES (p_user_id, p_partner_id, p_amount)
    ON CONFLICT (user_id, partner_id) 
    DO UPDATE SET 
        amount = partner_credits.amount + p_amount,
        updated_at = now()
    RETURNING amount INTO v_new_amount;

    -- Log transaction in reward_history (reusing existing table for user visibility)
    INSERT INTO public.reward_history (user_id, amount, type, reason, metadata)
    VALUES (
        p_user_id, 
        0, -- Not global points
        'earned', 
        p_reason, 
        jsonb_build_object(
            'credit_type', 'partner_avoir',
            'partner_id', p_partner_id,
            'credit_amount', p_amount
        )
    );

    RETURN v_new_amount;
END;
$$;

-- 4. RPC: Deduct Partner Credit
CREATE OR REPLACE FUNCTION public.deduct_partner_credit(
    p_user_id uuid,
    p_partner_id uuid,
    p_amount numeric,
    p_reason text DEFAULT 'Utilisation avoir'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance numeric;
BEGIN
    SELECT amount INTO v_current_balance
    FROM public.partner_credits
    WHERE user_id = p_user_id AND partner_id = p_partner_id;

    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Solde d''avoir insuffisant (Balance: %, Demandé: %)', COALESCE(v_current_balance, 0), p_amount;
    END IF;

    UPDATE public.partner_credits
    SET 
        amount = amount - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND partner_id = p_partner_id
    RETURNING amount INTO v_current_balance;

    -- Log transaction
    INSERT INTO public.reward_history (user_id, amount, type, reason, metadata)
    VALUES (
        p_user_id, 
        0, 
        'spent', 
        p_reason, 
        jsonb_build_object(
            'credit_type', 'partner_avoir',
            'partner_id', p_partner_id,
            'deduction_amount', p_amount
        )
    );

    RETURN v_current_balance;
END;
$$;

-- 5. RPC: Issue Credit by Email (Utility for Admin)
CREATE OR REPLACE FUNCTION public.issue_credit_by_email(
    p_user_email text,
    p_partner_email text,
    p_amount numeric,
    p_reason text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_partner_id uuid;
BEGIN
    -- 1. Find User ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = p_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur introuvable pour l''email: %', p_user_email;
    END IF;

    -- 2. Find Partner ID
    SELECT id INTO v_partner_id
    FROM public.partners
    WHERE contact_email = p_partner_email;

    IF v_partner_id IS NULL THEN
        RAISE EXCEPTION 'Partenaire introuvable pour l''email: %', p_partner_email;
    END IF;

    -- 3. Call existing issue_partner_credit
    RETURN public.issue_partner_credit(v_user_id, v_partner_id, p_amount, p_reason);
END;
$$;

-- 6. RPC: Secure Partner-facing Issue Credit
-- Only allows a partner to issue credit for THEIR OWN partner_id
CREATE OR REPLACE FUNCTION public.partner_issue_credit(
    p_user_id uuid,
    p_amount numeric,
    p_reason text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id uuid;
BEGIN
    -- 1. Find the partner_id associated with the CALLING user
    SELECT partner_id INTO v_partner_id
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF v_partner_id IS NULL THEN
        RAISE EXCEPTION 'Vous n''êtes pas enregistré comme partenaire.';
    END IF;

    -- 2. Call existing issue_partner_credit with the verified partner_id
    RETURN public.issue_partner_credit(p_user_id, v_partner_id, p_amount, p_reason);
END;
$$;

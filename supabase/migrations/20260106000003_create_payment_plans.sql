-- Migration: Create Payment Plans and Installments tables
-- Created at: 2026-01-06
-- Description: Supports 2x, 3x, 4x installment payments with strict RLS and relations.

-- 1. Create Enums for better type safety
-- 1. Create Enums for better type safety (Idempotent)
DO $$ BEGIN
    CREATE TYPE public.payment_plan_status AS ENUM ('active', 'completed', 'cancelled', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_plan_type AS ENUM ('2x', '3x', '4x');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.installment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.invoice_type AS ENUM ('installment_receipt', 'final_recap');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Payment Plans Table
CREATE TABLE IF NOT EXISTS public.payment_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type public.payment_plan_type NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'eur' NOT NULL,
    status public.payment_plan_status DEFAULT 'active' NOT NULL,
    stripe_schedule_id text, -- ID of the Subscription Schedule in Stripe
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for Payment Plans
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment plans" ON public.payment_plans;
CREATE POLICY "Users can view their own payment plans"
    ON public.payment_plans FOR SELECT
    USING (user_id = auth.uid());

-- Admin/Service Role policy (implicit for service_role, but good for explicit admin users)
DROP POLICY IF EXISTS "Admins can view all payment plans" ON public.payment_plans;
CREATE POLICY "Admins can view all payment plans"
    ON public.payment_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- 3. Payment Installments Table
CREATE TABLE IF NOT EXISTS public.payment_installments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.payment_plans(id) ON DELETE CASCADE NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date timestamptz NOT NULL,
    status public.installment_status DEFAULT 'pending' NOT NULL,
    stripe_invoice_id text, -- Generated invoice ID from Stripe
    stripe_payment_intent_id text,
    paid_at timestamptz,
    attempt_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for Installments
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own installments" ON public.payment_installments;
CREATE POLICY "Users can view their own installments"
    ON public.payment_installments FOR SELECT
    USING (
        plan_id IN (
            SELECT id FROM public.payment_plans WHERE user_id = auth.uid()
        )
    );

-- 4. Invoices Table (for generated PDFs)
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    stripe_invoice_id text,
    amount numeric(10,2) NOT NULL,
    pdf_url text,
    type public.invoice_type NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
    ON public.invoices FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM public.bookings WHERE user_id = auth.uid()
        )
    );

-- 5. Updated At Trigger
CREATE OR REPLACE FUNCTION update_payment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payment_plans_updated_at ON public.payment_plans;
CREATE TRIGGER update_payment_plans_updated_at
    BEFORE UPDATE ON public.payment_plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_payment_plans_updated_at();

DROP TRIGGER IF EXISTS update_payment_installments_updated_at ON public.payment_installments;
CREATE TRIGGER update_payment_installments_updated_at
    BEFORE UPDATE ON public.payment_installments
    FOR EACH ROW
    EXECUTE PROCEDURE update_payment_plans_updated_at(); -- Reuse same function

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_plans_user ON public.payment_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_booking ON public.payment_plans(booking_id);
CREATE INDEX IF NOT EXISTS idx_installments_plan ON public.payment_installments(plan_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.payment_installments(status);

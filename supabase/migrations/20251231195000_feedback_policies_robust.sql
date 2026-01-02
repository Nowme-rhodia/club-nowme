-- Migration: Fix Feedback Policies (Robust)
-- Created at: 2025-12-31T19:50:00.000Z

-- Ensure table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    rating INTEGER,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    
    -- Use current_setting directly to avoid auth schema issues if any
    CREATE POLICY "Users can insert their own feedback" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (
        user_id = auth.uid()
    );
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
    
    CREATE POLICY "Admins can view all feedback" 
    ON public.feedback FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles AS up
            WHERE up.user_id = auth.uid()
            AND up.is_admin = true
        )
    );
END $$;

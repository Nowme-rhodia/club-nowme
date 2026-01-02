-- Migration: Fix Feedback Policies
-- Created at: 2025-12-31T19:45:00.000Z

-- Explicitly use aliases to avoid ambiguity

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    
    -- For INSERT, context is the NEW row. We can refer to columns directly.
    -- However, sometimes ambiguity arises if local variables match.
    CREATE POLICY "Users can insert their own feedback" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);
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

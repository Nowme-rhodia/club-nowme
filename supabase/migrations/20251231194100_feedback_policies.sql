-- Migration: Create Feedback Policies
-- Created at: 2025-12-31T19:41:00.000Z

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
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
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );
END $$;

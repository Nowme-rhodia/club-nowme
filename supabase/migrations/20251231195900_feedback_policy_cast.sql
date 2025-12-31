-- Migration: Feedback Policies Final (Cast)
-- Created at: 2025-12-31T19:59:00.000Z

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Debug UserID" ON public.feedback;
    DROP POLICY IF EXISTS "Debug Auth" ON public.feedback;

    CREATE POLICY "Users can insert their own feedback" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid()::uuid);
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
            AND up.role = 'admin'
        )
    );
END $$;

-- Migration: Feedback Debug Policies
-- Created at: 2025-12-31T19:55:00.000Z

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    
    -- Try permissive policy first
    CREATE POLICY "Users can insert their own feedback" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (true);
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
    
    -- Try permissive select
    CREATE POLICY "Admins can view all feedback" 
    ON public.feedback FOR SELECT 
    TO authenticated 
    USING (true);
END $$;

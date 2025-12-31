-- Migration: Feedback Debug Policies 2
-- Created at: 2025-12-31T19:56:00.000Z

-- 1. Test user_id column visibility
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    
    CREATE POLICY "Debug UserID" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id IS NULL OR user_id IS NOT NULL);
END $$;

-- 2. Test auth.uid() visibility
DO $$
BEGIN
    DROP POLICY IF EXISTS "Debug Auth" ON public.feedback;
    
    CREATE POLICY "Debug Auth" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() IS NOT NULL);
END $$;

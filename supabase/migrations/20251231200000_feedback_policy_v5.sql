-- Migration: Feedback Policies V5 (Subquery)
-- Created at: 2025-12-31T20:00:00.000Z

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Debug UserID" ON public.feedback;
    DROP POLICY IF EXISTS "Debug Auth" ON public.feedback;

    CREATE POLICY "Users can insert their own feedback" 
    ON public.feedback FOR INSERT 
    TO authenticated 
    WITH CHECK (
        user_id = (SELECT auth.uid())
    );
END $$;

-- Create table for community suggestions
CREATE TABLE IF NOT EXISTS public.community_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(user_id),
    suggestion_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own suggestions
CREATE POLICY "Users can insert own suggestions" ON public.community_suggestions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all suggestions
CREATE POLICY "Admins can view all suggestions" ON public.community_suggestions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

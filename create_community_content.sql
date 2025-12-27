-- Create table for community content (Anouncements & Kiffs)
CREATE TABLE IF NOT EXISTS public.community_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('announcement', 'kiff')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TqqcIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all content (CRUD)
CREATE POLICY "Admins can manage community_content" ON public.community_content
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Policy: Everyone (authenticated) can view active content
CREATE POLICY "Users can view active content" ON public.community_content
    FOR SELECT
    TO authenticated
    USING (is_active = true);

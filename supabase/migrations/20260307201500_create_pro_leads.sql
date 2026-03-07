-- Create pro_leads table
CREATE TABLE IF NOT EXISTS public.pro_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    date_period TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.pro_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the contact form)
CREATE POLICY "Allow public inserts on pro_leads" 
ON public.pro_leads 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to read
CREATE POLICY "Allow admins to read pro_leads" 
ON public.pro_leads 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.is_admin = true
    )
);

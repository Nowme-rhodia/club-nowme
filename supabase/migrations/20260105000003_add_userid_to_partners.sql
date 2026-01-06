-- Add user_id to partners table to link directly to auth.users
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

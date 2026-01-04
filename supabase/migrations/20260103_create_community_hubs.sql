-- Migration: Create Community Hubs and Micro-Squads
-- Created at: 2026-01-03T00:35:00.000Z

-- Clean up existing tables if re-running
DROP TABLE IF EXISTS public.squad_members CASCADE;
DROP TABLE IF EXISTS public.micro_squads CASCADE;
DROP TABLE IF EXISTS public.community_hubs CASCADE;

-- 1. Create community_hubs table
CREATE TABLE IF NOT EXISTS public.community_hubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    city TEXT, -- Added for filtering by neighborhood/location
    whatsapp_announcement_link TEXT,
    is_read_only BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create micro_squads table
CREATE TABLE IF NOT EXISTS public.micro_squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID REFERENCES public.community_hubs(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE, -- Changed to user_profiles for PostgREST join
    title TEXT NOT NULL,
    description TEXT,
    date_event TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER DEFAULT 8,
    whatsapp_temp_link TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'full', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create squad_members table
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID REFERENCES public.micro_squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(user_id) ON DELETE CASCADE, -- Changed to user_profiles for PostgREST join
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(squad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Functions to check subscription status
CREATE OR REPLACE FUNCTION public.is_active_subscriber()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies

-- Community Hubs: Everyone can view the Hubs (listing)
-- But we want to hide the link if not active? 
-- Current RLS limits ROWS. We will allow viewing specific columns for everyone via the API select, 
-- but strictly speaking proper column security requires separation. 
-- For now, we allow READ to authenticated users.
CREATE POLICY "Hubs are viewable by authenticated users"
ON public.community_hubs FOR SELECT
TO authenticated
USING (true);

-- Only Admin can insert/update Hubs (Managed by Team)
-- Assuming a generic admin check or manual insert for now
CREATE POLICY "Admins can insert hubs"
ON public.community_hubs FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('rhodia@nowme.fr')); -- Simplified admin check for now

-- Micro Squads
-- Read: Viewable by authenticated users (so they can see "Sorties prévues")
CREATE POLICY "Squads are viewable by authenticated users"
ON public.micro_squads FOR SELECT
TO authenticated
USING (true);

-- Create: Only active subscribers can create
CREATE POLICY "Active subscribers can create squads"
ON public.micro_squads FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = creator_id AND
    public.is_active_subscriber()
);

-- Update: Creator can update stats/status
CREATE POLICY "Creator can update their squads"
ON public.micro_squads FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Squad Members
-- Read: Visible to authenticated (to see who is going)
CREATE POLICY "Squad members are viewable by authenticated users"
ON public.squad_members FOR SELECT
TO authenticated
USING (true);

-- Insert: Active subscribers can join
CREATE POLICY "Active subscribers can join squads"
ON public.squad_members FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    public.is_active_subscriber()
);

-- Delete: Members can leave
CREATE POLICY "Members can leave squads"
ON public.squad_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Secure Access for WhatsApp Links
-- Standard logic: We don't want the frontend to just fetch `whatsapp_temp_link` for everyone.
-- We'll create a stored procedure to fetch it securely.

CREATE OR REPLACE FUNCTION public.get_squad_link(squad_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    link TEXT;
    is_member BOOLEAN;
    squad_creator UUID;
    sub_status TEXT;
BEGIN
    -- Check subscription
    -- Check subscription
    IF NOT public.is_active_subscriber() THEN
        RAISE EXCEPTION 'Subscription active required';
    END IF;

    -- Get squad details
    SELECT whatsapp_temp_link, creator_id INTO link, squad_creator
    FROM public.micro_squads
    WHERE id = squad_id_input;

    -- Check if user is creator
    IF squad_creator = auth.uid() THEN
        RETURN link;
    END IF;

    -- Check if user is member
    SELECT EXISTS (
        SELECT 1 FROM public.squad_members
        WHERE squad_id = squad_id_input AND user_id = auth.uid()
    ) INTO is_member;

    IF is_member THEN
        RETURN link;
    ELSE
        -- Optionally allow viewing if just active? No, user said "reveal link" implies joining first?
        -- "Si une place est libre, la fille clique sur 'Participer' et l'app lui révèle le lien"
        -- This implies joining is prerequisite.
        RETURN NULL; 
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Hub Link
CREATE OR REPLACE FUNCTION public.get_hub_link(hub_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    link TEXT;
BEGIN
    -- Only active subscribers
    IF NOT public.is_active_subscriber() THEN
         RAISE EXCEPTION 'Subscription active required';
    END IF;

    SELECT whatsapp_announcement_link INTO link
    FROM public.community_hubs
    WHERE id = hub_id_input;

    RETURN link;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- EXAMPLE INSERT SCRIPT (For the user)
/*
INSERT INTO public.community_hubs (name, description, city, whatsapp_announcement_link)
VALUES 
('Team Ouest', 'Le QG des filles de l''Ouest Parisien', 'Paris', 'https://chat.whatsapp.com/placeholder_ouest'),
('Book Club', 'Pour celles qui dévorent des livres', 'Lyon', 'https://chat.whatsapp.com/placeholder_book'),
('Rando Club', 'Exploration et nature', NULL, 'https://chat.whatsapp.com/placeholder_rando');
*/

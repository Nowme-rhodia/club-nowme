-- Vérifier les enregistrements problématiques dans user_profiles
-- et corriger les user_id invalides

-- Corriger les enregistrements problématiques en mettant user_id à NULL
-- pour éviter la violation de contrainte de clé étrangère
UPDATE public.user_profiles
SET user_id = NULL
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Accorder les permissions nécessaires pour member_rewards
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_rewards TO service_role;

-- Créer une table pour stocker les liens de connexion générés
CREATE TABLE IF NOT EXISTS public.auth_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('signup', 'recovery')),
  action_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE
);

-- Créer un index unique pour éviter les doublons de liens actifs
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_links_active 
ON public.auth_links (email, link_type) 
WHERE used = false;

-- Activer RLS
ALTER TABLE public.auth_links ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour que seuls les service_role puissent gérer les liens
CREATE POLICY "Service role can manage auth links" ON public.auth_links
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE ON public.auth_links TO service_role;
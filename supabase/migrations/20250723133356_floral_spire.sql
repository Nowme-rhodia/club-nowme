/*
  # Fonctionnalités communautaires et newsletter

  1. Nouvelles tables
    - `community_posts` - Bons plans partagés par les membres
    - `post_likes` - Likes sur les posts
    - `post_comments` - Commentaires sur les posts
    - `post_bookmarks` - Posts sauvegardés
    - `newsletters` - Newsletters envoyées
    - `newsletter_analytics` - Statistiques des newsletters

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour les membres authentifiés
    - Accès admin pour la newsletter

  3. Fonctions
    - Compteurs automatiques pour likes/comments
    - Génération automatique de newsletter
*/

-- Table des posts communautaires (bons plans)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  location text,
  price numeric(10,2),
  discount text,
  image_url text,
  website_url text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Table des newsletters
CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  scheduled_date timestamptz NOT NULL,
  sent_date timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  recipients_count integer DEFAULT 0,
  template_type text DEFAULT 'daily_kiff',
  featured_posts jsonb DEFAULT '[]',
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Table des analytics newsletter
CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'opened', 'clicked', 'unsubscribed')),
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

-- Politiques pour community_posts
CREATE POLICY "Members can view active posts" ON community_posts
FOR SELECT TO authenticated
USING (status = 'active' AND EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND subscription_status = 'active'
));

CREATE POLICY "Members can create posts" ON community_posts
FOR INSERT TO authenticated
WITH CHECK (user_id IN (
  SELECT id FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND subscription_status = 'active'
));

CREATE POLICY "Users can update their own posts" ON community_posts
FOR UPDATE TO authenticated
USING (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
))
WITH CHECK (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

-- Politiques pour post_likes
CREATE POLICY "Members can manage their likes" ON post_likes
FOR ALL TO authenticated
USING (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
))
WITH CHECK (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

-- Politiques pour post_comments
CREATE POLICY "Members can view comments" ON post_comments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND subscription_status = 'active'
));

CREATE POLICY "Members can create comments" ON post_comments
FOR INSERT TO authenticated
WITH CHECK (user_id IN (
  SELECT id FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND subscription_status = 'active'
));

-- Politiques pour post_bookmarks
CREATE POLICY "Users can manage their bookmarks" ON post_bookmarks
FOR ALL TO authenticated
USING (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
))
WITH CHECK (user_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

-- Politiques pour newsletters (admin seulement)
CREATE POLICY "Admins can manage newsletters" ON newsletters
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_id = auth.uid() 
  AND (raw_app_meta_data->>'role' = 'admin' OR email = 'admin@nowme.fr')
));

-- Politiques pour newsletter_analytics
CREATE POLICY "Service role can manage analytics" ON newsletter_analytics
FOR ALL TO service_role
USING (true);

-- Fonctions pour les compteurs
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts 
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_post_likes_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER update_post_comments_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Trigger pour updated_at
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_likes_count ON community_posts(likes_count DESC);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled_date ON newsletters(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);

CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_newsletter_id ON newsletter_analytics(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_event_type ON newsletter_analytics(event_type);
-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for the blog page)
DROP POLICY IF EXISTS "Public read access" ON blog_posts;
CREATE POLICY "Public read access" ON blog_posts FOR SELECT USING (true);

-- Allow admins to do everything (using is_admin boolean column)
DROP POLICY IF EXISTS "Admin full access" ON blog_posts;
CREATE POLICY "Admin full access" ON blog_posts FOR ALL TO authenticated USING (
  exists (select 1 from user_profiles where user_id = auth.uid() and is_admin = true)
);

-- Create a secure function to check admin status
-- This avoids RLS recursion issues when querying user_profiles from within a policy
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid()
    and is_admin = true
  );
$$;

-- Update blog_posts policies to use the new function
drop policy if exists "Admins can manage blog posts" on public.blog_posts;

create policy "Admins can manage blog posts"
    on public.blog_posts
    for all
    using ( public.is_admin() );

-- Ensure generic public read access remains
-- (This policy should already exist, but ensuring it's not affected)
-- create policy "Blog posts are public" ... is untouched.

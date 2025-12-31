-- Create a new storage bucket for blog images
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Policy to allow public to view images
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'blog-images' );

-- Policy to allow admins to upload images
create policy "Admins can upload blog images"
on storage.objects for insert
with check (
  bucket_id = 'blog-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.user_profiles
    where user_id = auth.uid()
    and is_admin = true
  )
);

-- Policy to allow admins to update/delete images
create policy "Admins can update blog images"
on storage.objects for update
using (
  bucket_id = 'blog-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.user_profiles
    where user_id = auth.uid()
    and is_admin = true
  )
);

create policy "Admins can delete blog images"
on storage.objects for delete
using (
  bucket_id = 'blog-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.user_profiles
    where user_id = auth.uid()
    and is_admin = true
  )
);

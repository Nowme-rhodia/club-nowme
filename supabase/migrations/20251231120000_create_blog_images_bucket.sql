-- Migration skipped to avoid permission errors (42501 on storage.buckets)
-- Bucket 'blog-images' must be created manually if needed.
/*
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'blog-images' );

... policies ...
*/

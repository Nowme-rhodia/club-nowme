-- Create the storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Allow public read access to avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload avatar images
create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Policy: Allow users to update their own avatar images (based on naming convention or owner)
-- For simplicity, we allow authenticated users to update/delete in this bucket for now, 
-- ideally later restricted by folder structure user_id/*
create policy "Authenticated users can update avatars."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Authenticated users can delete avatars."
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

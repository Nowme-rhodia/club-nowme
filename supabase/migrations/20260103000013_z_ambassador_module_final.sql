-- Fix schema - Target user_profiles instead of profiles

-- 1. Add is_ambassador to user_profiles
alter table user_profiles 
add column if not exists is_ambassador boolean default false;

-- 2. Create ambassador_applications (referencing auth.users for safety)
create table if not exists ambassador_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  location text not null,
  phone text,
  availability_hours_per_week int not null,
  motivation_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Add is_official to micro_squads
alter table micro_squads 
add column if not exists is_official boolean default false;

-- 4. Enable RLS
alter table ambassador_applications enable row level security;

-- 5. Policies (Drop first to avoid errors if exist)
drop policy if exists "Users can view their own applications" on ambassador_applications;
create policy "Users can view their own applications"
  on ambassador_applications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own applications" on ambassador_applications;
create policy "Users can insert their own applications"
  on ambassador_applications for insert
  with check (auth.uid() = user_id);

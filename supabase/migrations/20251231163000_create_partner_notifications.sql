-- Create partner_notifications table
create table if not exists public.partner_notifications (
  id uuid default gen_random_uuid() primary key,
  partner_id uuid not null references public.partners(id) on delete cascade,
  type text not null, -- 'new_booking', 'cancel', 'system', etc.
  title text not null,
  content text,
  read_status boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  priority text default 'normal'
);

-- Indexes
create index if not exists idx_partner_notifications_partner_id on public.partner_notifications(partner_id);
create index if not exists idx_partner_notifications_read_status on public.partner_notifications(read_status);

-- Enable RLS
alter table public.partner_notifications enable row level security;

-- Policies

-- 1. Partners can view their own notifications
-- Re-using the logic that partners has a user_id column that links to auth.uid()
DROP POLICY IF EXISTS "Partners can view own notifications" ON public.partner_notifications;
create policy "Partners can view own notifications"
  on public.partner_notifications
  for select
  using (
    partner_id IN (
        SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- 2. Partners can update (mark as read) their own notifications
DROP POLICY IF EXISTS "Partners can update own notifications" ON public.partner_notifications;
create policy "Partners can update own notifications"
  on public.partner_notifications
  for update
  using (
    partner_id IN (
        SELECT partner_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- 3. Service Role can do everything (for Edge Functions)
-- (Implicitly true by default for service_role, confirming for good measure if needed, but usually not required to explicitly state unless restrictive policies exist)
-- Actually, inserting from Edge Function (service role) bypasses RLS.

-- Grant access
grant select, update on public.partner_notifications to authenticated;

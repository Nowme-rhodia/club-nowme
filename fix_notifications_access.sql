-- Assurez-vous que la table existe
create table if not exists public.partner_notifications (
  id uuid default gen_random_uuid() primary key,
  partner_id uuid not null references public.partners(id) on delete cascade,
  type text not null,
  title text not null,
  content text,
  read_status boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  priority text default 'normal'
);

-- Activez RLS
alter table public.partner_notifications enable row level security;

-- Accorder les permissions explicites au rôle 'authenticated'
grant select, update on public.partner_notifications to authenticated;
grant insert on public.partner_notifications to service_role;
grant usage, select on sequence partner_notifications_id_seq to authenticated; -- Si applicable, mais UUID utilise gen_random_uuid

-- Supprimer les anciennes politiques pour éviter les conflits
drop policy if exists "Partners can view own notifications" on public.partner_notifications;
drop policy if exists "Partners can update own notifications" on public.partner_notifications;

-- Recréer les politiques de sécurité (RLS)
create policy "Partners can view own notifications"
  on public.partner_notifications
  for select
  using (
    exists (
      select 1 from public.partners
      where partners.id = partner_notifications.partner_id
      and partners.user_id = auth.uid()
    )
  );

create policy "Partners can update own notifications"
  on public.partner_notifications
  for update
  using (
    exists (
      select 1 from public.partners
      where partners.id = partner_notifications.partner_id
      and partners.user_id = auth.uid()
    )
  );

-- Forcer le rafraîchissement du cache de l'API (commenté car c'est une commande système, mais le simple fait de changer le schéma aide parfois)
notify pgrst, 'reload config';

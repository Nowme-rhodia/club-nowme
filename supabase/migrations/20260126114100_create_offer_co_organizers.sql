create table public.offer_co_organizers (
  offer_id uuid not null references public.offers(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (offer_id, partner_id)
);

-- Enable RLS
alter table public.offer_co_organizers enable row level security;

-- Policies
create policy "Public can view co-organizers" on public.offer_co_organizers
  for select using (true);

create policy "Partners can manage their own co-organizers via offers" on public.offer_co_organizers
  for all using (
    exists (
      select 1 from public.offers
      where offers.id = offer_co_organizers.offer_id
      and offers.partner_id in (
        select partner_id from public.user_profiles
        where user_id = auth.uid()
      )
    )
  );

-- Admins can do everything
create policy "Admins can do everything on offer_co_organizers" on public.offer_co_organizers
  for all using (
    exists (
      select 1 from public.current_user_admin
      where user_id = auth.uid()
    )
  );

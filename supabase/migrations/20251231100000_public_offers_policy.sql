-- Enable public read access for offers (only approved ones)
drop policy if exists "Public offers are viewable by everyone" on public.offers;
create policy "Public offers are viewable by everyone"
  on public.offers for select
  using ( status = 'approved' );

-- Enable public read access for offer variants (pricing)
-- Security: We might want to filter variants if they are internal-only, but usually variants are public.
drop policy if exists "Public offer variants are viewable by everyone" on public.offer_variants;
create policy "Public offer variants are viewable by everyone"
  on public.offer_variants for select
  using ( true );

-- Enable public read access for categories
drop policy if exists "Categories are viewable by everyone" on public.offer_categories;
create policy "Categories are viewable by everyone"
  on public.offer_categories for select
  using ( true );

-- Enable public read access for offer media (images)
drop policy if exists "Offer media is viewable by everyone" on public.offer_media;
create policy "Offer media is viewable by everyone"
  on public.offer_media for select
  using ( true );

-- Ensure partners are viewable (for partner name display in public offers)
-- We only expose specific columns via frontend query, but RLS needs to allow SELECT.
-- Ideally we'd restrict this to only 'approved' partners.
drop policy if exists "Public partners are viewable by everyone" on public.partners;
create policy "Public partners are viewable by everyone"
  on public.partners for select
  using ( status = 'approved' );

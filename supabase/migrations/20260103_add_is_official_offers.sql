-- Add is_official to offers
alter table offers 
add column if not exists is_official boolean default false;

-- Auto-update existing offers from Admin/NowMe to be official
-- Assuming contact_email 'rhodia@nowme.fr' is the admin
update offers
set is_official = true
where partner_id in (
    select id from partners where contact_email = 'rhodia@nowme.fr'
);

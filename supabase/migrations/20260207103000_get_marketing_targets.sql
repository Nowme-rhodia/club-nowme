drop function if exists get_marketing_targets();

create or replace function get_marketing_targets()
returns table (
    target_user_id uuid,
    target_email text,
    target_first_name text,
    campaign_type text,
    metadata jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
    -- 1. Hésitantes: Users who signed up but haven't subscribed
    return query
    select
        up.user_id as target_user_id,
        up.email as target_email,
        up.first_name as target_first_name,
        case
            when up.created_at::date = (current_date - interval '1 day')::date then 'hesitante_j1'
            when up.created_at::date = (current_date - interval '3 days')::date then 'hesitante_j3'
            when up.created_at::date = (current_date - interval '7 days')::date then 'hesitante_j7'
        end as campaign_type,
        '{}'::jsonb as metadata
    from user_profiles up
    left join subscriptions s on up.user_id = s.user_id and (s.status = 'active' or s.status = 'trialing')
    where
        up.email is not null
        and s.id is null
        and up.partner_id is null
        and (
            up.created_at::date = (current_date - interval '1 day')::date or
            up.created_at::date = (current_date - interval '3 days')::date or
            up.created_at::date = (current_date - interval '7 days')::date
        );

    -- 2. Exploratrices J+1 achat: Customers who bought an event yesterday (not subscribers)
    return query
    select
        b.user_id as target_user_id,
        b.customer_email as target_email,
        coalesce(up.first_name, 'Explorer') as target_first_name,
        'exploratrice_j1_achat' as campaign_type,
        jsonb_build_object(
            'event_title', o.title,
            'amount', b.amount,
            'member_price', (
                select min(ov.discounted_price) 
                from offer_variants ov 
                where ov.offer_id = o.id 
                and ov.discounted_price is not null
            )
        ) as metadata
    from bookings b
    join offers o on b.offer_id = o.id
    join partners p on b.partner_id = p.id
    left join user_profiles up on b.customer_email = up.email
    left join subscriptions s on up.user_id = s.user_id and (s.status = 'active' or s.status = 'trialing')
    where
        b.customer_email is not null
        and b.status = 'paid'
        and b.created_at::date = (current_date - interval '1 day')::date
        and s.id is null -- Not a subscriber
        and (up.partner_id is null or up.id is null) -- Not a partner
        and p.contact_email = 'rhodia@nowme.fr'; -- Only Rhodia's events

    -- 3. Exploratrices J-2 événement: Event is in 2 days (reminder)
    return query
    select
        b.user_id as target_user_id,
        b.customer_email as target_email,
        coalesce(up.first_name, 'Explorer') as target_first_name,
        'exploratrice_j_minus_2_event' as campaign_type,
        jsonb_build_object(
            'event_title', o.title,
            'event_date', b.scheduled_at
        ) as metadata
    from bookings b
    join offers o on b.offer_id = o.id
    join partners p on b.partner_id = p.id
    left join user_profiles up on b.customer_email = up.email
    left join subscriptions s on up.user_id = s.user_id and (s.status = 'active' or s.status = 'trialing')
    where
        b.customer_email is not null
        and b.status = 'paid'
        and b.scheduled_at::date = (current_date + interval '2 days')::date
        and s.id is null
        and (up.partner_id is null or up.id is null) -- Not a partner
        and p.contact_email = 'rhodia@nowme.fr';

    -- 4. Exploratrices J+1 post-événement: Event was yesterday (follow-up)
    return query
    select
        b.user_id as target_user_id,
        b.customer_email as target_email,
        coalesce(up.first_name, 'Explorer') as target_first_name,
        'exploratrice_j1_post_event' as campaign_type,
        jsonb_build_object(
            'event_title', o.title,
            'amount', b.amount,
            'member_price', (
                select min(ov.discounted_price) 
                from offer_variants ov 
                where ov.offer_id = o.id 
                and ov.discounted_price is not null
            )
        ) as metadata
    from bookings b
    join offers o on b.offer_id = o.id
    join partners p on b.partner_id = p.id
    left join user_profiles up on b.customer_email = up.email
    left join subscriptions s on up.user_id = s.user_id and (s.status = 'active' or s.status = 'trialing')
    where
        b.customer_email is not null
        and b.status = 'paid'
        and b.scheduled_at::date = (current_date - interval '1 day')::date
        and s.id is null
        and (up.partner_id is null or up.id is null) -- Not a partner
        and p.contact_email = 'rhodia@nowme.fr';
end;
$$;

create table if not exists marketing_campaign_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id), -- Nullable for guest orders where we only have email
    email text not null,
    campaign_type text not null, -- 'hesitante_j1', 'exploratrice_j_minus_2', etc.
    sent_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb
);

-- Index for faster lookups
create index if not exists marketing_campaign_logs_email_type_idx on marketing_campaign_logs(email, campaign_type);

-- RLS
alter table marketing_campaign_logs enable row level security;

create policy "Service role can do everything"
    on marketing_campaign_logs
    for all
    to service_role
    using (true)
    with check (true);

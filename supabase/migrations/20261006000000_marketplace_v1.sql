-- Axelerate V1 marketplace.
-- Apply in the Supabase SQL editor, or with the Supabase CLI.
-- The browser uses the anon key only. service_role never belongs in Vite env.

create table if not exists public.profiles (
  id text primary key,
  email text,
  first_name text,
  avatar_url text,
  age_range text,
  region text,
  source_type text,
  source_context text,
  verification_level text not null default 'V1',
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id text primary key,
  user_id text not null,
  role text not null check (role in ('consumer', 'scout', 'merchant', 'admin')),
  organization_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  legal_name text,
  country text,
  website text,
  categories jsonb not null default '[]'::jsonb,
  about text,
  contact_name text,
  contact_role text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'suspended')),
  verified_at timestamptz,
  commercial jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id text primary key,
  organization_id text not null references public.organizations(id),
  user_id text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  organization_id text not null references public.organizations(id),
  name text not null,
  category text,
  subcategory text,
  retail_price numeric,
  currency text not null default 'USD',
  inventory integer,
  shipping_time text,
  checkout_url text,
  image_url text,
  attributes jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demand_clusters (
  id text primary key,
  category text,
  product_type text,
  title text not null,
  canonical_requirements jsonb not null default '[]'::jsonb,
  canonical_preferences jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  common_requirements jsonb not null default '[]'::jsonb,
  region_summary jsonb not null default '[]'::jsonb,
  budget_range jsonb,
  average_budget numeric,
  purchase_window text,
  status text not null default 'collecting',
  source_type text,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.demand_signals (
  id text primary key,
  user_id text not null,
  raw_text text not null,
  category text,
  product_type text,
  budget_min numeric,
  budget_max numeric,
  timeframe text,
  readiness text,
  must_haves jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '[]'::jsonb,
  region text,
  source_type text,
  source_context text,
  cluster_id text references public.demand_clusters(id),
  status text not null default 'submitted',
  trust_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.demand_participations (
  id text primary key,
  demand_cluster_id text not null references public.demand_clusters(id),
  user_id text not null,
  demand_signal_id text,
  readiness text,
  budget_min numeric,
  budget_max numeric,
  timeframe text,
  personal_constraints jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  verification_level text not null default 'V1',
  source_type text,
  source_context text,
  joined_at timestamptz not null default now(),
  expires_at timestamptz,
  left_at timestamptz
);

create unique index if not exists demand_participations_one_active
  on public.demand_participations (demand_cluster_id, user_id)
  where status = 'active';

create table if not exists public.offers (
  id text primary key,
  demand_cluster_id text not null references public.demand_clusters(id),
  organization_id text not null references public.organizations(id),
  product_id text references public.products(id),
  offer_price numeric not null,
  retail_price numeric,
  allocated_inventory integer,
  bundle text,
  shipping_time text,
  valid_until timestamptz,
  status text not null default 'submitted',
  why text,
  brand text,
  product_name text,
  checkout_url text,
  commercial_terms jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.attributions (
  id text primary key,
  user_id text,
  demand_cluster_id text,
  offer_id text,
  organization_id text,
  attribution_token text unique,
  status text not null default 'clicked',
  clicked_at timestamptz,
  self_reported_at timestamptz,
  verified_at timestamptz,
  order_value numeric default 0
);

create table if not exists public.purchases (
  id text primary key,
  attribution_id text references public.attributions(id),
  merchant_order_id text not null,
  organization_id text,
  user_id text,
  demand_cluster_id text,
  offer_id text,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null check (status in ('verified', 'refunded', 'cancelled')),
  verified_by text,
  purchased_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.demand_outcomes (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_settings (
  id integer primary key default 1 check (id = 1),
  thresholds jsonb not null
);

insert into public.marketplace_settings (id, thresholds)
values (1, '{"default":{"minActiveParticipants":15,"minReadyToBuy":5,"minEstimatedGmv":300,"maxFraudScore":0.5}}'::jsonb)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.products enable row level security;
alter table public.demand_clusters enable row level security;
alter table public.demand_signals enable row level security;
alter table public.demand_participations enable row level security;
alter table public.offers enable row level security;
alter table public.attributions enable row level security;
alter table public.purchases enable row level security;
alter table public.marketplace_settings enable row level security;

create or replace function public.is_marketplace_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()::text and role = 'admin'
  );
$$;

-- Anonymous participation facts. No user id, no email, no raw text.
create or replace function public.cluster_participation_facts()
returns table (
  n bigint,
  cluster_id text,
  readiness text,
  budget numeric,
  verification_level text,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over () as n,
    demand_cluster_id,
    readiness,
    budget_max,
    verification_level,
    status,
    expires_at
  from public.demand_participations
  where status <> 'left';
$$;

revoke all on function public.cluster_participation_facts() from public;
grant execute on function public.cluster_participation_facts() to anon, authenticated;

-- A merchant cannot promote their own organization or offer.
create or replace function public.lock_marketplace_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'organizations' and new.status is distinct from old.status and not public.is_marketplace_admin() then
    new.status := old.status;
  end if;
  if tg_table_name = 'offers' and new.status is distinct from old.status and not public.is_marketplace_admin() then
    new.status := old.status;
  end if;
  if tg_table_name = 'demand_clusters' and new.status is distinct from old.status and not public.is_marketplace_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_lock_status on public.organizations;
create trigger organizations_lock_status
  before update on public.organizations
  for each row execute function public.lock_marketplace_status();

drop trigger if exists offers_lock_status on public.offers;
create trigger offers_lock_status
  before update on public.offers
  for each row execute function public.lock_marketplace_status();

-- Clusters and live offers are public. Participations are not.
create policy clusters_read on public.demand_clusters for select to anon, authenticated using (status <> 'rejected');
create policy offers_read on public.offers for select to anon, authenticated using (true);
create policy products_read on public.products for select to anon, authenticated using (true);
create policy orgs_read on public.organizations for select to anon, authenticated using (true);
create policy settings_read on public.marketplace_settings for select to anon, authenticated using (true);

create policy signals_own on public.demand_signals for all to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin())
  with check (user_id = auth.uid()::text or public.is_marketplace_admin());

create policy parts_own on public.demand_participations for all to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin())
  with check (user_id = auth.uid()::text or public.is_marketplace_admin());

create policy attr_own on public.attributions for all to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin())
  with check (user_id = auth.uid()::text or public.is_marketplace_admin());

create policy purchases_own on public.purchases for select to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin());
create policy purchases_admin on public.purchases for all to authenticated
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

create policy clusters_insert on public.demand_clusters for insert to authenticated
  with check (status = 'collecting');
create policy clusters_admin on public.demand_clusters for update to authenticated
  using (public.is_marketplace_admin());

create policy offers_admin_update on public.offers for update to authenticated
  using (public.is_marketplace_admin());

create policy org_insert on public.organizations for insert to authenticated
  with check (status = 'pending');
create policy org_update on public.organizations for update to authenticated
  using (
    public.is_marketplace_admin()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = auth.uid()::text
    )
  );

create policy members_own on public.organization_members for all to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin())
  with check (user_id = auth.uid()::text or public.is_marketplace_admin());

create policy products_write on public.products for all to authenticated
  using (
    public.is_marketplace_admin()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = products.organization_id and m.user_id = auth.uid()::text
    )
  )
  with check (
    public.is_marketplace_admin()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = products.organization_id and m.user_id = auth.uid()::text
    )
  );

create policy offers_write on public.offers for insert to authenticated
  with check (
    status in ('draft', 'submitted')
    and exists (
      select 1 from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.organization_id = offers.organization_id
        and m.user_id = auth.uid()::text
        and o.status = 'verified'
    )
  );

create policy roles_own on public.user_roles for select to authenticated
  using (user_id = auth.uid()::text or public.is_marketplace_admin());
create policy roles_admin on public.user_roles for all to authenticated
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

create policy profiles_own on public.profiles for all to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

begin;

-- =====================================================
-- 1. COMPANIES
-- =====================================================

create table public.companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now()
);

-- =====================================================
-- 2. COMPANY MEMBERS
-- =====================================================

create table public.company_members (
    company_id uuid not null
        references public.companies(id) on delete cascade,

    user_id uuid not null
        references auth.users(id) on delete cascade,

    created_at timestamptz not null default now(),

    primary key (company_id, user_id)
);

create index company_members_user_id_idx
    on public.company_members(user_id);

-- =====================================================
-- 3. orders
-- =====================================================

create table public.orders (
    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references public.companies(id),

    title text not null
        check (length(trim(title)) > 0),

    amount numeric(12, 2) not null default 0
        check (amount >= 0),

    created_at timestamptz not null default now()
);

create index orders_company_id_idx
    on public.orders(company_id);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.companies
    enable row level security;

alter table public.company_members
    enable row level security;

alter table public.orders
    enable row level security;

-- =====================================================
-- 5. SQL PRIVILEGES
-- =====================================================

revoke all on public.companies
    from public, anon, authenticated;

revoke all on public.company_members
    from public, anon, authenticated;

revoke all on public.orders
    from public, anon, authenticated;

grant select on public.companies
    to authenticated;

grant select on public.company_members
    to authenticated;

grant select, insert, update, delete
    on public.orders
    to authenticated;

-- =====================================================
-- 6. COMPANY MEMBERS POLICIES
-- Users can only read their own memberships.
-- No client-side INSERT / UPDATE / DELETE.
-- =====================================================

create policy "members_read_own_memberships"
on public.company_members
for select
to authenticated
using (
    user_id = (select auth.uid())
);

-- =====================================================
-- 7. COMPANIES POLICIES
-- A user can only read companies they belong to.
-- =====================================================

create policy "members_read_own_companies"
on public.companies
for select
to authenticated
using (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = companies.id
          and cm.user_id = (select auth.uid())
    )
);

-- =====================================================
-- 8. orders: SELECT
-- =====================================================

create policy "members_select_orders"
on public.orders
for select
to authenticated
using (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = orders.company_id
          and cm.user_id = (select auth.uid())
    )
);

-- =====================================================
-- 9. orders: INSERT
-- =====================================================

create policy "members_insert_orders"
on public.orders
for insert
to authenticated
with check (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = orders.company_id
          and cm.user_id = (select auth.uid())
    )
);

-- =====================================================
-- 10. orders: UPDATE
-- Check both the existing row and the resulting row.
-- =====================================================

create policy "members_update_orders"
on public.orders
for update
to authenticated
using (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = orders.company_id
          and cm.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = orders.company_id
          and cm.user_id = (select auth.uid())
    )
);

-- =====================================================
-- 11. orders: DELETE
-- =====================================================

create policy "members_delete_orders"
on public.orders
for delete
to authenticated
using (
    exists (
        select 1
        from public.company_members cm
        where cm.company_id = orders.company_id
          and cm.user_id = (select auth.uid())
    )
);

commit;

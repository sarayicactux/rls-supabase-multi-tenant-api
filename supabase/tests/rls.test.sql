-- RLS smoke tests (run in SQL Editor as a privileged role after seed).
-- Replace :user_a_id / :user_b_id with real auth.users ids when using psql variables.
-- With Supabase, prefer exercising these via the API with each user's JWT.

-- Expect: User A sees only Company A orders when JWT is User A.
-- Expect: User A cannot update/delete Company B order (0 rows / permission denied).
-- Expect: User A cannot insert an order for Company B.

-- Verify seed memberships
select
    c.name as company_name,
    u.email,
    cm.created_at
from public.company_members cm
join public.companies c
    on c.id = cm.company_id
join auth.users u
    on u.id = cm.user_id
order by c.name;

-- Verify orders are unchanged after negative API tests
select
    id,
    company_id,
    title,
    amount
from public.orders
order by created_at;

-- Company B order must still be titled 'Company B Order' with amount 200
select exists (
    select 1
    from public.orders
    where id = '22222222-2222-4222-8222-222222222222'
      and title = 'Company B Order'
      and amount = 200
) as company_b_order_intact;

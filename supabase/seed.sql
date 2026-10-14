-- =====================================================
-- Seed data for multi-tenant RLS tests
-- Run in Supabase SQL Editor as the default (postgres) role.
--
-- Creates Auth users if missing, then companies / members / orders.
-- Default login password for both users: Password123!
-- =====================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  email_a constant text := 'user-a@example.com';
  email_b constant text := 'user-b@example.com';
  -- Same password for both test users (change if you want)
  test_password constant text := 'Password123!';

  user_a_id constant uuid := 'aa000000-0000-4000-8000-000000000001';
  user_b_id constant uuid := 'bb000000-0000-4000-8000-000000000002';
  company_a_id constant uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  company_b_id constant uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  order_a_id   constant uuid := '11111111-1111-4111-8111-111111111111';
  order_b_id   constant uuid := '22222222-2222-4222-8222-222222222222';

  resolved_a uuid;
  resolved_b uuid;
  encrypted_pw text;
begin
  encrypted_pw := extensions.crypt(test_password, extensions.gen_salt('bf'));

  -- ---------- User A ----------
  select id into resolved_a
  from auth.users
  where lower(email) = lower(email_a)
  limit 1;

  if resolved_a is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      user_a_id,
      'authenticated',
      'authenticated',
      email_a,
      encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      user_a_id,
      user_a_id,
      jsonb_build_object(
        'sub', user_a_id::text,
        'email', email_a,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      user_a_id::text,
      now(),
      now(),
      now()
    );

    resolved_a := user_a_id;
    raise notice 'Created Auth user % (%)', email_a, resolved_a;
  else
    raise notice 'Using existing Auth user % (%)', email_a, resolved_a;
  end if;

  -- ---------- User B ----------
  select id into resolved_b
  from auth.users
  where lower(email) = lower(email_b)
  limit 1;

  if resolved_b is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      user_b_id,
      'authenticated',
      'authenticated',
      email_b,
      encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      user_b_id,
      user_b_id,
      jsonb_build_object(
        'sub', user_b_id::text,
        'email', email_b,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      user_b_id::text,
      now(),
      now(),
      now()
    );

    resolved_b := user_b_id;
    raise notice 'Created Auth user % (%)', email_b, resolved_b;
  else
    raise notice 'Using existing Auth user % (%)', email_b, resolved_b;
  end if;

  if resolved_a = resolved_b then
    raise exception 'Seed aborted: both emails resolved to the same user id (%)', resolved_a;
  end if;

  -- ---------- Companies ----------
  insert into public.companies (id, name)
  values
    (company_a_id, 'Company A'),
    (company_b_id, 'Company B')
  on conflict (id) do update
  set name = excluded.name;

  -- ---------- Memberships ----------
  insert into public.company_members (company_id, user_id)
  values
    (company_a_id, resolved_a),
    (company_b_id, resolved_b)
  on conflict (company_id, user_id) do nothing;

  -- ---------- Orders ----------
  insert into public.orders (id, company_id, title, amount)
  values
    (order_a_id, company_a_id, 'Company A Order', 100),
    (order_b_id, company_b_id, 'Company B Order', 200)
  on conflict (id) do update
  set
    company_id = excluded.company_id,
    title = excluded.title,
    amount = excluded.amount;

  raise notice 'Seed OK';
  raise notice '  Login A: % / %', email_a, test_password;
  raise notice '  Login B: % / %', email_b, test_password;
end $$;

-- Verification
select id, email, email_confirmed_at is not null as confirmed
from auth.users
where lower(email) in ('user-a@example.com', 'user-b@example.com')
order by email;

select
  c.name as company_name,
  u.email,
  cm.user_id
from public.company_members cm
join public.companies c
  on c.id = cm.company_id
join auth.users u
  on u.id = cm.user_id
order by c.name;

select
  id,
  company_id,
  title,
  amount
from public.orders
order by created_at;

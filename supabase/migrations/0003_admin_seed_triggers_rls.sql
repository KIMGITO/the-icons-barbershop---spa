-- ============================================================
-- 9. DEFAULT BUSINESS SEED
-- ============================================================
insert into public.businesses (id, name, description, city, country)
values ('00000000-0000-0000-0000-000000000001', 'The Icons Barber & Spa', 'Premium barber and spa sanctuary in Kilimani, Nairobi.', 'Nairobi', 'Kenya')
on conflict (id) do nothing;

-- ============================================================
-- 10. DEFAULT ADMIN ACCOUNT (auto-created)
--     Email: admin@theicons.co.ke  |  Password: Admin@123
--     must_change_password = true → UI forces update on first login
-- ============================================================
do $$
declare
  admin_user_id uuid;
  admin_provider_id uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.service_providers (
    id, slug, first_name, last_name, full_name, email, phone,
    provider_type, bio, avatar_url, status, years_experience, rating, business_id
  )
  values (
    '00000000-0000-0000-0000-00000000000a', 'dennis-kimanthi',
    'Dennis', 'Kimanthi', 'Dennis Kimanthi', 'admin@theicons.co.ke', '+254 743 952 173',
    'barber', 'Founder, Executive Director & Master Stylist.', 
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    'active', 14, 5.00, default_business_id
  )
  on conflict (id) do nothing
  returning id into admin_provider_id;

  -- Explicitly populate GoTrue's NOT-NULL token columns (defaults may be
  -- NULL on some schemas, which makes GoTrue's login query error with 500).
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
  )
  values (
    '00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-000000000000',
    'admin@theicons.co.ke', extensions.crypt('Admin@123', extensions.gen_salt('bf', 10)), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dennis Kimanthi","role":"admin","provider_id":"00000000-0000-0000-0000-00000000000a"}',
    now(), now(), 'authenticated', 'authenticated'
  )
  on conflict (id) do nothing
  returning id into admin_user_id;

  if admin_user_id is null then
    select id into admin_user_id from auth.users where email = 'admin@theicons.co.ke' limit 1;
  end if;

  insert into public.staff_profiles (id, email, full_name, role, provider_id, must_change_password, business_id)
  values (
    admin_user_id, 'admin@theicons.co.ke', 'Dennis Kimanthi', 'admin', admin_provider_id, true, default_business_id
  )
  on conflict (id) do nothing;
end $$;

-- ============================================================
-- 11. updated_at TRIGGERS
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$ begin create trigger set_updated_at before update on public.businesses for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.service_providers for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.services for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.customers for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger set_updated_at before update on public.bookings for each row execute procedure public.handle_updated_at(); exception when duplicate_object then null; end $$;

-- ============================================================
-- 12. TRIGGER: auto-create staff_profiles on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
  values (new.id, coalesce(new.email, ''), coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), user_role, user_provider_id, default_business_id, true)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.businesses enable row level security;
alter table public.service_providers enable row level security;
alter table public.services enable row level security;
alter table public.provider_services enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_profiles enable row level security;

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer;

create or replace function public.is_staff() returns boolean as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid());
$$ language sql stable security definer;

create or replace function public.get_my_provider_id() returns uuid as $$
  select provider_id from public.staff_profiles where id = auth.uid();
$$ language sql stable security definer;
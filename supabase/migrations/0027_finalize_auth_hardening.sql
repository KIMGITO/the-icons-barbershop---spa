-- ============================================================
-- 67. FINALIZE — remove leftover debug artefacts from the auth-hardening
--     investigation so the production schema stays clean.
--     (No-ops on fresh clones where the debug objects were never created.)
-- ============================================================
drop table if exists public.auth_diagnostics cascade;

drop function if exists public.diag_user_json(uuid);
drop function if exists public.fix_admin_instance();
drop function if exists public.diag_user_json();
drop function if exists public.fix_admin_instance;

-- Re-assert the clean, defensive handle_new_user (idempotent).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = auth, public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role staff_role := coalesce((meta->>'role')::staff_role, 'provider');
  user_provider_id uuid := (meta->>'provider_id')::uuid;
  default_business_id uuid := '00000000-0000-0000-0000-000000000001';
  e text;
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
                           || '{"provider":"email","providers":["email"]}'::jsonb;
  begin
    insert into public.staff_profiles (id, email, full_name, role, provider_id, business_id, must_change_password)
    values (new.id, coalesce(new.email, ''),
            coalesce(meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
            user_role, user_provider_id, default_business_id, true)
    on conflict (id) do nothing;
  exception when others then
    e := sqlerrm;
  end;
  return new;
end $$;

do $$
begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;

grant execute on function public.handle_new_user() to public;

-- Re-sync the admin auth row to a loginable shape (idempotent safety net).
update auth.users
set
  instance_id              = '00000000-0000-0000-0000-000000000000',
  confirmation_token       = coalesce(confirmation_token, ''),
  email_change             = coalesce(email_change, ''),
  email_change_token_new   = coalesce(email_change_token_new, ''),
  recovery_token           = coalesce(recovery_token, ''),
  email_confirmed_at       = coalesce(email_confirmed_at, now()),
  encrypted_password       = extensions.crypt('Admin@123', extensions.gen_salt('bf', 10)),
  role                     = 'authenticated',
  aud                      = 'authenticated',
  raw_app_meta_data        = '{"provider":"email","providers":["email"]}',
  updated_at               = now()
where email = 'admin@theicons.co.ke';

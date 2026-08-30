-- 14. RLS POLICIES
create policy "Staff can view business" on public.businesses for select using (public.is_staff());
create policy "Admin can manage business" on public.businesses for all using (public.is_admin());

create policy "Staff can view service providers" on public.service_providers for select using (public.is_staff());
create policy "Admin can manage service providers" on public.service_providers for all using (public.is_admin());

create policy "Staff can view services" on public.services for select using (public.is_staff());
create policy "Admin can manage services" on public.services for all using (public.is_admin());

create policy "Staff can view provider_services" on public.provider_services for select using (public.is_staff());
create policy "Admin can manage provider_services" on public.provider_services for all using (public.is_admin());

create policy "Staff can view customers" on public.customers for select using (public.is_staff());
create policy "Staff can create customers" on public.customers for insert with check (public.is_staff());
create policy "Staff can update customers" on public.customers for update using (public.is_staff());

create policy "Staff can view bookings" on public.bookings for select using (
  public.is_admin() or provider_id = public.get_my_provider_id()
);
create policy "Staff can create bookings" on public.bookings for insert with check (
  public.is_admin() or provider_id = public.get_my_provider_id()
);
create policy "Admin can update bookings" on public.bookings for update using (public.is_admin());
create policy "Provider can update own bookings" on public.bookings for update using (
  provider_id = public.get_my_provider_id() and status in ('pending', 'confirmed')
);

create policy "Staff can view staff profiles" on public.staff_profiles for select using (public.is_staff());
create policy "Admin can manage staff profiles" on public.staff_profiles for all using (public.is_admin());
create policy "Users can update own profile" on public.staff_profiles for update using (auth.uid() = id);

-- 15. CONFLICT DETECTION TRIGGER
create or replace function public.prevent_provider_overlap()
returns trigger as $$
declare
  existing_start timestamptz; existing_end timestamptz;
  new_start timestamptz; new_end timestamptz;
begin
  if new.status = 'cancelled' or new.status = 'no-show' then return new; end if;
  new_start := (new.date::text || ' ' || new.time_slot)::timestamptz;
  new_end := new_start + (new.duration_minutes || ' minutes')::interval;
  select (b.date::text || ' ' || b.time_slot)::timestamptz,
         (b.date::text || ' ' || b.time_slot)::timestamptz + (b.duration_minutes || ' minutes')::interval
  into existing_start, existing_end
  from public.bookings b
  where b.provider_id = new.provider_id and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000')
    and b.status in ('pending', 'confirmed') and b.date = new.date
  limit 1;
  if existing_start is not null and new_start < existing_end and new_end > existing_start then
    raise exception 'Provider unavailable at this time. Existing booking overlaps.';
  end if;
  return new;
end;
$$ language plpgsql;

do $$ begin
  create trigger prevent_double_booking before insert or update on public.bookings
    for each row execute procedure public.prevent_provider_overlap();
exception when duplicate_object then null;
end $$;

-- 16. STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('services', 'services', true), ('business', 'business', true)
on conflict (id) do nothing;

create policy "Staff can read images" on storage.objects for select using (bucket_id in ('avatars', 'services', 'business'));
create policy "Staff can upload images" on storage.objects for insert with check (
  bucket_id in ('avatars', 'services', 'business') and public.is_staff()
);
create policy "Admin can delete images" on storage.objects for delete using (public.is_admin());

-- 17. REALTIME
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.service_providers;
alter publication supabase_realtime add table public.services;
alter publication supabase_realtime add table public.customers;
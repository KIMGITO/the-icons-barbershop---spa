-- ============================================================
-- 58. BOOKING ENGINE — RLS POLICIES
--     Security for new normalized tables.
-- ============================================================

-- Enable RLS on new tables
alter table public.staff_roles enable row level security;
alter table public.service_requirements enable row level security;
alter table public.staff_schedules enable row level security;
alter table public.staff_breaks enable row level security;
alter table public.staff_schedule_exceptions enable row level security;
alter table public.booking_resources enable row level security;
alter table public.business_hours enable row level security;

-- ============================================================
-- PUBLIC / ANONYMOUS (needed for booking flow)
-- ============================================================

-- Anyone can view staff roles (needed for service requirements display)
drop policy if exists "Public can view staff roles" on public.staff_roles;
create policy "Public can view staff roles" on public.staff_roles
  for select using (true);

-- Anyone can view service requirements (needed for booking flow)
drop policy if exists "Public can view service requirements" on public.service_requirements;
create policy "Public can view service requirements" on public.service_requirements
  for select using (true);

-- Anyone can view business hours (needed for booking flow)
drop policy if exists "Public can view business hours" on public.business_hours;
create policy "Public can view business hours" on public.business_hours
  for select using (true);

-- ============================================================
-- STAFF (logged-in portal users)
-- ============================================================

-- Staff can view all staff schedules
drop policy if exists "Staff can view staff schedules" on public.staff_schedules;
create policy "Staff can view staff schedules" on public.staff_schedules
  for select using (public.is_staff());

-- Admin can manage staff schedules
drop policy if exists "Admin can manage staff schedules" on public.staff_schedules;
create policy "Admin can manage staff schedules" on public.staff_schedules
  for all using (public.is_admin());

-- Staff can view all staff breaks
drop policy if exists "Staff can view staff breaks" on public.staff_breaks;
create policy "Staff can view staff breaks" on public.staff_breaks
  for select using (public.is_staff());

-- Admin can manage staff breaks
drop policy if exists "Admin can manage staff breaks" on public.staff_breaks;
create policy "Admin can manage staff breaks" on public.staff_breaks
  for all using (public.is_admin());

-- Staff can view all schedule exceptions
drop policy if exists "Staff can view schedule exceptions" on public.staff_schedule_exceptions;
create policy "Staff can view schedule exceptions" on public.staff_schedule_exceptions
  for select using (public.is_staff());

-- Admin can manage schedule exceptions
drop policy if exists "Admin can manage schedule exceptions" on public.staff_schedule_exceptions;
create policy "Admin can manage schedule exceptions" on public.staff_schedule_exceptions
  for all using (public.is_admin());

-- Staff can view booking resources
drop policy if exists "Staff can view booking resources" on public.booking_resources;
create policy "Staff can view booking resources" on public.booking_resources
  for select using (public.is_staff());

-- Admin can manage booking resources
drop policy if exists "Admin can manage booking resources" on public.booking_resources;
create policy "Admin can manage booking resources" on public.booking_resources
  for all using (public.is_admin());

-- Admin can manage staff roles
drop policy if exists "Admin can manage staff roles" on public.staff_roles;
create policy "Admin can manage staff roles" on public.staff_roles
  for all using (public.is_admin());

-- Admin can manage service requirements
drop policy if exists "Admin can manage service requirements" on public.service_requirements;
create policy "Admin can manage service requirements" on public.service_requirements
  for all using (public.is_admin());

-- Admin can manage business hours
drop policy if exists "Admin can manage business hours" on public.business_hours;
create policy "Admin can manage business hours" on public.business_hours
  for all using (public.is_admin());
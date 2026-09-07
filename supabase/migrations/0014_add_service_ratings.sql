-- Add rating and review_count to services table
alter table public.services 
add column if not exists rating numeric(3,2) not null default 5.0,
add column if not exists review_count int not null default 0;

-- Optional: Add a check constraint for rating
alter table public.services 
drop constraint if exists chk_services_rating;

alter table public.services 
add constraint chk_services_rating check (rating between 1 and 5);

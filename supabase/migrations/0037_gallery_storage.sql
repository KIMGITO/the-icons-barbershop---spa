-- Gallery storage bucket for admin image uploads
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "Public can read gallery images"
on storage.objects for select
using (bucket_id = 'gallery');

create policy "Admin can upload gallery images"
on storage.objects for insert
with check (bucket_id = 'gallery' and public.is_admin());

create policy "Admin can update gallery images"
on storage.objects for update
using (bucket_id = 'gallery' and public.is_admin());

create policy "Admin can delete gallery images"
on storage.objects for delete
using (bucket_id = 'gallery' and public.is_admin());
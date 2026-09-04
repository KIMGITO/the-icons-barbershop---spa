-- ============================================================
-- 56. EMAIL MESSAGES LOG TABLE
--     Records every Email sent with recipient, subject,
--     status, and audit fields.
-- ============================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  body_html text not null,
  email_type text not null default 'notification', -- 'invitation', 'receipt', 'alert'
  status text not null default 'pending', -- 'pending', 'sent', 'failed'
  provider text not null default 'resend',
  provider_message_id text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  sent_by uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade default '00000000-0000-0000-0000-000000000001',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_email_logs_recipient on public.email_logs(recipient_email);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created on public.email_logs(created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists "Staff can view email_logs" on public.email_logs;
create policy "Staff can view email_logs" on public.email_logs
  for select using (public.is_staff());

drop policy if exists "Admin can manage email_logs" on public.email_logs;
create policy "Admin can manage email_logs" on public.email_logs
  for all using (public.is_admin());

-- ============================================================
-- 57. HELPER: Store an Email log row
-- ============================================================
create or replace function public.log_email_message(
  p_recipient_email text,
  p_subject text,
  p_body_html text,
  p_email_type text default 'notification',
  p_status text default 'pending',
  p_provider text default 'resend',
  p_provider_message_id text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.email_logs (
    recipient_email, subject, body_html, email_type, 
    status, provider, provider_message_id, error_message,
    metadata, sent_by, business_id, sent_at
  )
  values (
    p_recipient_email, p_subject, p_body_html, p_email_type,
    p_status, p_provider, p_provider_message_id, p_error_message,
    p_metadata, auth.uid(), v_business_id,
    case when p_status = 'sent' then now() else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_email_message(text, text, text, text, text, text, text, text, jsonb) to authenticated;

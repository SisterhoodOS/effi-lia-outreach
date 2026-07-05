-- Effi Lia - Outreach — one-time setup script
-- Run this ONCE in the Supabase Dashboard → SQL Editor (Project: same one used
-- by monika-mission-control).
--
-- Before running: enable the pg_cron extension via
-- Database → Extensions → search "pg_cron" → Enable.
-- Then paste this whole file into the SQL Editor and click Run.

create table if not exists effi_clients (
  id uuid primary key default gen_random_uuid(),
  project text not null check (project in ('saha_synergy','bwb','bfp')),
  name text not null,
  source text,
  profile_link text,
  status text not null default 'no_response'
    check (status in ('no_response','response','interest','not_interest','booked')),
  note text,
  handled_by text,
  meeting_at timestamptz,
  research_text text,
  research_validated boolean not null default false,
  chat_transcript text,
  report_text text,
  report_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists effi_daily_targets (
  id uuid primary key default gen_random_uuid(),
  project text not null check (project in ('saha_synergy','bwb','bfp')),
  target_date date not null,
  slot_number int not null check (slot_number between 1 and 50),
  client_name text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project, target_date, slot_number)
);

create table if not exists effi_notifications (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  client_id uuid references effi_clients(id) on delete cascade,
  audience text not null check (audience in ('team','sophia')),
  kind text not null check (kind in ('reminder_6h','reminder_1h','new_report')),
  message text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, audience, kind)
);

create table if not exists effi_templates (
  id uuid primary key default gen_random_uuid(),
  project text, -- null = applies to all projects (default)
  kind text not null check (kind in ('client_6h','client_1h','sophia_6h')),
  body text not null,
  updated_at timestamptz not null default now()
);

alter table effi_clients enable row level security;
alter table effi_daily_targets enable row level security;
alter table effi_notifications enable row level security;
alter table effi_templates enable row level security;

drop policy if exists "anon full access" on effi_clients;
drop policy if exists "anon full access" on effi_daily_targets;
drop policy if exists "anon full access" on effi_notifications;
drop policy if exists "anon full access" on effi_templates;

create policy "anon full access" on effi_clients for all using (true) with check (true);
create policy "anon full access" on effi_daily_targets for all using (true) with check (true);
create policy "anon full access" on effi_notifications for all using (true) with check (true);
create policy "anon full access" on effi_templates for all using (true) with check (true);

insert into effi_templates (project, kind, body)
select null, 'client_6h', 'Hai {{name}}! Cuma mau ingetin, kita ada meeting hari ini jam {{time}}. Sampai ketemu nanti ya 🤍'
where not exists (select 1 from effi_templates where project is null and kind = 'client_6h');

insert into effi_templates (project, kind, body)
select null, 'client_1h', 'Hai {{name}}, 1 jam lagi meeting kita jam {{time}}. Sampai jumpa sebentar lagi!'
where not exists (select 1 from effi_templates where project is null and kind = 'client_1h');

insert into effi_templates (project, kind, body)
select null, 'sophia_6h', 'Reminder: meeting sama {{name}} ({{project}}) jam {{time}} (6 jam lagi). Report lengkap ada di Effi Lia - Outreach.'
where not exists (select 1 from effi_templates where project is null and kind = 'sophia_6h');

-- Reminder scan: every 15 minutes, insert notification rows for booked
-- clients entering the 6h or 1h window before their meeting.
select cron.unschedule('effi-reminder-scan') where exists (
  select 1 from cron.job where jobname = 'effi-reminder-scan'
);

select cron.schedule(
  'effi-reminder-scan',
  '*/15 * * * *',
  $$
  insert into effi_notifications (project, client_id, audience, kind, message)
  select c.project, c.id, 'team', 'reminder_6h',
    replace(replace(
      (select body from effi_templates where kind = 'client_6h' and (project is null or project = c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI'))
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '5 hours 45 min' and interval '6 hours 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_6h' and n.audience = 'team')
  union all
  select c.project, c.id, 'sophia', 'reminder_6h',
    replace(replace(replace(
      (select body from effi_templates where kind = 'sophia_6h' and (project is null or project = c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI')), '{{project}}', c.project)
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '5 hours 45 min' and interval '6 hours 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_6h' and n.audience = 'sophia')
  union all
  select c.project, c.id, 'team', 'reminder_1h',
    replace(replace(
      (select body from effi_templates where kind = 'client_1h' and (project is null or project = c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI'))
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '45 min' and interval '1 hour 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_1h' and n.audience = 'team');
  $$
);

# 02-RESEARCH — Effi Lia - Outreach

## Repo & deploy (matches existing convention)

`monika-mission-control` deploys via: `git push` to
`https://github.com/SisterhoodOS/monika-mission-control.git` → served on
**GitHub Pages** at `https://sisterhoodos.github.io/monika-mission-control/`.
The `GITHUB_TOKEN` in `~/.env` authenticates as the `SisterhoodOS` GitHub
account (confirmed via API). We'll follow the exact same pattern:

- New repo: `github.com/SisterhoodOS/effi-lia-outreach` (public — same as
  monika-mission-control; no secrets committed beyond the anon key, which is
  safe to expose client-side the same way it already is in that repo).
- GitHub Pages served from `main` branch root.
- Live URL: `https://sisterhoodos.github.io/effi-lia-outreach/`
- Keyword **"EFFI"** → open that URL in Safari (added as a memory feedback
  note at the end, same mechanism as MONIKA/BUILDER/LENY keywords).
- Will confirm with Monika before actually creating the repo/pushing (external
  action), everything up to that point is local file work.

## Supabase

Reusing the existing project (same one as monika-mission-control):
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` already in `~/.env`.
- No service-role key / DB password available — DDL (tables, extensions,
  functions, cron schedule) can't be run via the anon REST key. `supabase/schema.sql`
  is a one-shot script Monika pastes into the Supabase Dashboard → SQL Editor
  once. This is a normal one-time setup step for this kind of project.
- RLS: enable on all `effi_*` tables with permissive policies for the `anon`
  role (same trust model already in place for `mc_settings` — the app's own
  password gate is the access control, not row-level auth).

### Schema (`supabase/schema.sql`)

```sql
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
  kind text not null check (kind in ('reminder_6h','reminder_1h')),
  message text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, audience, kind)
);

create table if not exists effi_templates (
  id uuid primary key default gen_random_uuid(),
  project text, -- null = applies to all projects
  kind text not null check (kind in ('client_6h','client_1h','sophia_6h')),
  body text not null,
  updated_at timestamptz not null default now()
);

alter table effi_clients enable row level security;
alter table effi_daily_targets enable row level security;
alter table effi_notifications enable row level security;
alter table effi_templates enable row level security;

create policy "anon full access" on effi_clients for all using (true) with check (true);
create policy "anon full access" on effi_daily_targets for all using (true) with check (true);
create policy "anon full access" on effi_notifications for all using (true) with check (true);
create policy "anon full access" on effi_templates for all using (true) with check (true);

-- default templates
insert into effi_templates (project, kind, body) values
  (null, 'client_6h', 'Hai {{name}}! Cuma mau ingetin, kita ada meeting hari ini jam {{time}}. Sampai ketemu nanti ya 🤍'),
  (null, 'client_1h', 'Hai {{name}}, 1 jam lagi meeting kita jam {{time}}. Sampai jumpa sebentar lagi!'),
  (null, 'sophia_6h', 'Reminder: meeting sama {{name}} ({{project}}) jam {{time}} (6 jam lagi). Report lengkap ada di Effi Lia - Outreach.')
on conflict do nothing;

-- pg_cron: needs the pg_cron extension enabled once via
-- Database > Extensions > pg_cron in the Supabase dashboard, then:
select cron.schedule(
  'effi-reminder-scan',
  '*/15 * * * *',
  $$
  insert into effi_notifications (project, client_id, audience, kind, message)
  select c.project, c.id, 'team', 'reminder_6h',
    replace(replace((select body from effi_templates where kind='client_6h' and (project is null or project=c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI'))
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '5 hours 45 min' and interval '6 hours 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_6h' and n.audience = 'team')
  union all
  select c.project, c.id, 'sophia', 'reminder_6h',
    replace(replace(replace((select body from effi_templates where kind='sophia_6h' and (project is null or project=c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI')), '{{project}}', c.project)
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '5 hours 45 min' and interval '6 hours 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_6h' and n.audience = 'sophia')
  union all
  select c.project, c.id, 'team', 'reminder_1h',
    replace(replace((select body from effi_templates where kind='client_1h' and (project is null or project=c.project) order by project nulls last limit 1),
      '{{name}}', c.name), '{{time}}', to_char(c.meeting_at, 'HH24:MI'))
  from effi_clients c
  where c.status = 'booked' and c.meeting_at is not null
    and c.meeting_at - now() between interval '45 min' and interval '1 hour 15 min'
    and not exists (select 1 from effi_notifications n where n.client_id = c.id and n.kind = 'reminder_1h' and n.audience = 'team');
  $$
);
```

## File structure

```
effi-lia-outreach/
  index.html                    shell: header, password gate, project tabs, view containers
  assets/
    css/
      tokens.css                 color + font variables
      layout.css                  shell/nav/tab/card/modal layout
      components.css               buttons, badges, forms, banners, notif bell
    js/
      supabase-client.js           supabase init + generic CRUD helpers
      auth-gate.js                  password gate (localStorage flag)
      clients.js                     client tracker: list, add, edit, status pipeline
      daily-targets.js                Start the Day Queen: 50-slot daily view
      booked-flow.js                   meeting datetime, research (semi-manual), chat, send-to-sophia
      reminders.js                      notification bell/banner + template editor
      pdf-report.js                      jsPDF branded client report export
      app.js                              tab routing, bootstraps all modules
  supabase/
    schema.sql                    one-time SQL Editor script (tables, RLS, templates, cron)
  render.yaml                    (kept for parity, not the active deploy path)
  README.md
  .planning/
```

CDN libs (script tags, no build step — same approach as monika-mission-control):
- `@supabase/supabase-js@2` via `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `jspdf` via `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- Google Fonts: `Fraunces` (display serif, headers) + `Quicksand` (rounded sans, body/UI) —
  matches "neat and cute + aesthetic" brief without clashing with Sisterhood OS's
  own earth-tone brand kit (this tool intentionally uses its own palette).

## Visual design tokens

```css
--blush-50:   #fdf6f8;   /* page background */
--pink-100:   #fbe4ee;   /* section/card background */
--pink-300:   #f0b8cc;   /* soft pink accent, active tab */
--purple-200: #e3cdec;   /* lavender accent, tags */
--purple-500: #a97bc4;   /* purple accent, links/badges */
--maroon-700: #8c2f4a;   /* button hover, secondary CTA */
--maroon-900: #5c1a2e;   /* primary buttons, headers, "booked" badge */
--ink:        #3a1424;   /* primary text */
--ink-soft:   #7a4a5e;   /* secondary/muted text */
```

Status badge colors: no_response = `--ink-soft` on `--pink-100`; response =
`--purple-500` on `--purple-200`; interest = `#e0709a` on `--pink-100`;
not_interest = `#9c6b78` on `--pink-100` (struck-through label); booked =
white on `--maroon-900` (solid, stands out as the milestone state).

## Open decision before Execute

Need to confirm the GitHub repo name/visibility plan above before the deploy
step actually runs `git push` (creating a public repo under the SisterhoodOS
account). Everything before that (all local file creation) can proceed now.

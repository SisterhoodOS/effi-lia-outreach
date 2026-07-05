# Effi Lia - Outreach

Shared outreach tracking site for the team across three business lines:
Saha Synergy, BWB, and Best Friend Production. Client pipeline (no response →
response → interest/not interest → booked), booked-client research + chat log
+ report handoff to Sophia, 6h/1h meeting reminders, daily "Start the Day
Queen" 50-target board, and branded PDF report export.

No build step — plain HTML/CSS/JS, data lives in Supabase.

## Preview locally

```
cd /Users/monikapurba/projects/effi-lia-outreach
python3 -m http.server 8080
# open http://localhost:8080
```

## First-time setup

1. **Supabase**: enable the `pg_cron` extension (Database → Extensions →
   pg_cron → Enable), then paste all of `supabase/schema.sql` into the SQL
   Editor and run it once. This creates the tables, RLS policies, default
   message templates, and the 15-minute reminder-scan cron job.
2. **Password**: the shared team password is set in
   `assets/js/auth-gate.js` (`EFFI_PASSWORD`). Change it there before handing
   the link to the team if needed.
3. **Deploy**: push to the `SisterhoodOS/effi-lia-outreach` GitHub repo,
   served via GitHub Pages at
   `https://sisterhoodos.github.io/effi-lia-outreach/`.

## How it fits together

`index.html` is the shell (auth gate, tabs, section containers, modal
shells). Each `assets/js/*.js` file owns one feature area and reads/writes
its own Supabase tables; `app.js` boots everything after the password gate
unlocks and re-renders the active sections when a project tab is switched.
`supabase/schema.sql` is the single source of truth for the data model —
keep it in sync if the app's fields change.

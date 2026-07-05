# 06-UAT — Acceptance checklist

Live: https://sisterhoodos.github.io/effi-lia-outreach/
Password: OUTREACH

Blocked until Monika runs `supabase/schema.sql` once (Supabase Dashboard →
SQL Editor) and enables the `pg_cron` extension first — without this, no
data will save (tables don't exist yet).

- [ ] Password gate unlocks with OUTREACH, persists after refresh
- [ ] All 3 project tabs switch (Saha Synergy / BWB / Best Friend Production)
- [ ] Add a client, edit it, delete it
- [ ] Move a client through no_response → interest → booked (meeting time prompt appears)
- [ ] Booked client: open detail, copy research prompt, paste research, mark valid, paste chat, Send to Sophia, Download PDF
- [ ] Start the Day Queen shows 50 numbered slots + today's date, persists on reload
- [ ] Notification bell shows the "new report" notification after Send to Sophia
- [ ] Edit Template modal saves without errors
- [ ] (After ~15 min, once a booked meeting is within 6h/1h) reminder notification appears via pg_cron

Not yet tested live in a browser (no Chrome extension connection this
session) — verified via syntax check + full cross-file contract audit
(DOM ids, table/column names, event names) instead. Recommend Monika do a
real click-through and report back anything broken.

# 06-1-PLAN — Wave 5: Integration + deploy prep

Depends on all prior waves (all module files must exist).

<task type="auto">
  <name>App bootstrap + tab routing + integration pass</name>
  <files>assets/js/app.js, index.html, README.md</files>
  <action>
    Implement app.js: on DOMContentLoaded, after auth-gate unlocks, initialize
    supabase-client, then clients.js/daily-targets.js/booked-flow.js/
    reminders.js for the default active project tab (saha_synergy). Wire tab
    click handlers to switch the active project and re-render clients +
    daily-targets + reminders scoped to the newly selected project (booked-
    flow modal stays project-agnostic, opened per-client). Do a full read-
    through of index.html and all assets/js/*.js files to confirm: no
    duplicate ID collisions between the 3 project tab instances, no leftover
    placeholder/empty JS files, all custom events (`effi:client-booked`) are
    both dispatched and listened to, and the script load order in index.html
    still matches each module's actual dependencies. Fix any integration bugs
    found. Update README.md with a final "How it all fits together" section
    (one short paragraph) and a "First-time setup" checklist: run
    supabase/schema.sql, enable pg_cron extension, replace the placeholder
    EFFI_PASSWORD in auth-gate.js, then deploy.
  </action>
  <verify>Serve the site locally (`python3 -m http.server`), walk through the full flow end to end: unlock with password → switch between all 3 tabs → add a client → move it to booked with a meeting time → open detail, paste research, validate, paste chat, send to Sophia, download PDF → click Start the Day Queen and fill a few slots → confirm no console errors throughout.</verify>
  <done>Full click-through works end to end locally with no console errors; README has accurate setup steps.</done>
</task>

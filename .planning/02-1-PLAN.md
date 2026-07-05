# 02-1-PLAN — Wave 1: Foundation (schema, shell, supabase client)

All three tasks in this wave have no dependencies on each other and run in parallel.

<task type="auto">
  <name>Supabase schema script</name>
  <files>supabase/schema.sql</files>
  <action>
    Write the exact SQL from 02-RESEARCH.md's "Schema" section into
    supabase/schema.sql: effi_clients, effi_daily_targets, effi_notifications,
    effi_templates tables, RLS enable + permissive anon policies, default
    template rows, and the pg_cron schedule for the 6h/1h reminder scan.
    Add a short header comment explaining this must be run once in the
    Supabase Dashboard SQL Editor, and that the pg_cron extension must be
    enabled first via Database > Extensions.
  </action>
  <verify>File is valid SQL (no syntax errors) — check by reading it back and confirming every CREATE TABLE has matching parens and every statement ends with a semicolon.</verify>
  <done>supabase/schema.sql exists, contains all 4 tables + RLS policies + default templates + the cron.schedule call, matches 02-RESEARCH.md exactly.</done>
</task>

<task type="auto">
  <name>Site shell + design tokens</name>
  <files>index.html, assets/css/tokens.css, assets/css/layout.css, assets/css/components.css, README.md, render.yaml</files>
  <action>
    Build the static shell following the file structure and design tokens in
    02-RESEARCH.md. index.html: header reading "Effi Lia - Outreach", a
    password-gate overlay (id="auth-gate") shown until unlocked, a top nav
    with 3 project tabs (Saha Synergy / BWB / Best Friend Production), a
    per-project view containing empty containers with clear IDs for:
    - "Start the Day Queen" button + target grid container
    - client tracker table/list container + "add client" form container
    - a notification bell/banner container (top-right, for reminders)
    Include a hidden client-detail modal container (for the booked flow) and
    a hidden template-editor modal container (for reminders), both empty for
    now — later waves fill these in via JS.
    Load CDN scripts (@supabase/supabase-js@2, jspdf) and Google Fonts
    (Fraunces + Quicksand) in <head>. Load all assets/js/*.js files at the
    end of <body> in this order: supabase-client.js, auth-gate.js, clients.js,
    daily-targets.js, booked-flow.js, reminders.js, pdf-report.js, app.js
    (later waves will create the not-yet-existing ones — use empty placeholder
    files with a one-line comment so the site doesn't 404 on missing scripts).
    tokens.css: exactly the CSS variables from 02-RESEARCH.md's "Visual design
    tokens" section. layout.css: shell/nav/tab/card/modal layout using those
    tokens. components.css: buttons, status badges (colors per RESEARCH doc),
    form inputs, the notification banner/bell, all styled to the soft
    purple/pink/maroon aesthetic — rounded corners, soft shadows, generous
    whitespace, Fraunces for headings, Quicksand for body/UI text.
    README.md: short project description, local preview instructions
    (python3 -m http.server), and a "Supabase setup" section telling the
    reader to run supabase/schema.sql once in the SQL Editor and enable
    pg_cron first.
    render.yaml: static site config (staticPublishPath: ., no build command),
    same shape as monika-mission-control's, kept for parity even though the
    active deploy path is GitHub Pages.
  </action>
  <verify>Open index.html directly in a browser (or via `python3 -m http.server`) — the password gate overlay renders, the header text and 3 tabs are visible, no console errors from missing CSS files.</verify>
  <done>index.html + all 3 CSS files + README.md + render.yaml exist; page renders the gate + header + tabs with the intended palette; placeholder JS files exist so no 404s.</done>
</task>

<task type="auto">
  <name>Supabase client + auth gate</name>
  <files>assets/js/supabase-client.js, assets/js/auth-gate.js</files>
  <action>
    supabase-client.js: initialize the Supabase client using the URL/anon key
    (read the actual values from ~/.env's SUPABASE_URL / SUPABASE_ANON_KEY and
    hard-code them here, same pattern as monika-mission-control's index.html —
    anon key is meant to be public client-side). Export small generic helpers:
    getRows(table, filters), insertRow(table, row), updateRow(table, id, patch),
    deleteRow(table, id) wrapping the supabase-js query builder with basic
    try/catch + console.warn on failure (mirror the sbSave/sbLoad error-handling
    style already used in monika-mission-control).
    auth-gate.js: a single shared password check. Prompt for a password on
    first load, compare (client-side) against a password Monika will supply;
    for now use a placeholder constant EFFI_PASSWORD = "CHANGE_ME" clearly
    marked with a comment to update before going live. On correct entry, set
    localStorage flag and hide the #auth-gate overlay; wrong entry shows an
    inline error, no lockout needed.
  </action>
  <verify>Load index.html, confirm the password gate blocks the content until the placeholder password is entered, and that a wrong password shows an error without hiding the gate.</verify>
  <done>Entering the correct placeholder password unlocks the app and persists via localStorage across reloads; supabase client helpers are callable from the console without throwing.</done>
</task>

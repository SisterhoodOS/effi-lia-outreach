# 05-1-PLAN — Wave 4: Reminders + templates

Depends on Wave 3 (effi_notifications rows must be produced by booked-flow.js
and by the pg_cron job once schema.sql is run).

<task type="auto">
  <name>Notification bell + template editor</name>
  <files>assets/js/reminders.js</files>
  <action>
    Implement a notification bell in the header (unseen count badge). On
    click, show a dropdown/panel listing unseen effi_notifications for the
    active project (and a separate always-visible "Sophia" section showing
    audience='sophia' entries regardless of project tab, since Sophia should
    see cross-project reminders). Each entry shows the message text, a
    timestamp, and a "mark as seen" action (sets seen=true). Poll Supabase
    every ~60s (setInterval + getRows) to pick up new rows inserted by the
    pg_cron job without requiring a page reload.
    Also implement a template editor modal (triggered from a small "Edit
    templates" button near the bell): lists the 3 template kinds
    (client_6h, client_1h, sophia_6h) with their body text in editable
    textareas showing the available placeholders ({{name}}, {{time}},
    {{project}}) as a hint below each field, save via updateRow to
    effi_templates. Support per-project overrides: if a project-specific
    template row doesn't exist yet when the user edits one for a specific
    project tab, insert a new row scoped to that project instead of
    overwriting the global (project=null) default.
  </action>
  <verify>Manually insert a test row into effi_notifications via the Supabase table editor (or via console using the app's insertRow helper) and confirm the bell badge count updates within ~60s and the entry appears with correct text; edit a template and confirm it saves without touching the global default.</verify>
  <done>Bell shows live unseen notifications (polling), Sophia's cross-project reminders are visible regardless of active tab, and templates are editable with working project-level overrides.</done>
</task>

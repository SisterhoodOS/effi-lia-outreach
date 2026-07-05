# 03-1-PLAN — Wave 2: Client tracker + Daily targets

Depends on Wave 1 (shell + supabase client must exist). Both tasks touch
different files and run in parallel.

<task type="auto">
  <name>Client tracker</name>
  <files>assets/js/clients.js</files>
  <action>
    Implement full client tracker CRUD against the effi_clients table, scoped
    to the active project tab. Render as a card/table list with: name,
    source, profile link (clickable, opens new tab), status badge (colored
    per tokens), note preview, "handled by" (optional free-text). "Add
    client" form: name, source, profile link, note, handled_by — status
    defaults to no_response. Inline status dropdown to change status through
    the pipeline (no_response → response → interest / not_interest → booked).
    When status is changed TO "booked": prompt (simple modal/inline form) for
    meeting date + time, save into meeting_at, then open the client-detail
    modal (booked-flow.js will own the modal's content — for this task, just
    dispatch a custom event `effi:client-booked` with the client id/row so
    booked-flow.js can pick it up in the next wave; also render a "View
    details" button on booked clients that fires the same event).
    Add simple filters: by status, and a text search on name.
  </action>
  <verify>Add a test client, move it through no_response → interest → booked (entering a meeting time when prompted), confirm the row updates live and the status badge color changes correctly; refresh the page and confirm the client persists (loaded from Supabase).</verify>
  <done>Full CRUD works per project tab, status pipeline enforced, booked clients capture meeting_at and expose a "View details" trigger.</done>
</task>

<task type="auto">
  <name>Start the Day Queen — daily targets</name>
  <files>assets/js/daily-targets.js</files>
  <action>
    Implement the "Start the Day Queen" button: on click, show today's date
    and a grid of 50 numbered slots (1-50) for the active project. Each slot
    is a text input (client name to reach out to) + a small checkbox for
    "done". On first click for a given project+date with no existing rows,
    insert 50 empty effi_daily_targets rows (slot_number 1-50, target_date =
    today) via upsert; on later opens same day, load the existing 50 rows.
    Debounced auto-save on input/checkbox change (updateRow). Add a small
    date picker or "previous days" dropdown to browse history (read-only view
    of past dates' slots) without creating new rows for past dates. Show a
    simple progress count ("12/50 done") at the top of the grid.
  </action>
  <verify>Click "Start the Day Queen", fill a few slots and check some as done, reload the page — the same day's data persists. Browse to a previous date (if any test data exists) and confirm it's read-only / doesn't create new rows.</verify>
  <done>50 numbered slots appear per project per day, persist to Supabase, reset fresh each new date, and history is browsable without duplicating rows.</done>
</task>

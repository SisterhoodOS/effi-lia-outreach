# 04-1-PLAN — Wave 3: Booked flow + PDF report

Depends on Wave 2 (clients.js must exist and dispatch `effi:client-booked`).
Both tasks touch different files and run in parallel; pdf-report.js can be
built against the documented report data shape without waiting on
booked-flow.js's exact implementation.

<task type="auto">
  <name>Booked client detail flow</name>
  <files>assets/js/booked-flow.js</files>
  <action>
    Listen for the `effi:client-booked` custom event dispatched by clients.js
    and open a detail modal for that client showing:
    - Read-only header: name, source, profile link, meeting date/time.
    - "Research" section: a button "Open profile + copy research prompt" that
      opens the profile_link in a new tab AND copies to clipboard a ready-made
      prompt like: "Research this person/profile for an upcoming sales
      meeting: {{profile_link}}. Summarize: who they are, their
      business/work, likely interests or pain points relevant to
      {{project_label}}, and one suggested conversation angle." Below it, a
      textarea bound to research_text (team pastes their AI research result
      here), and a "Mark research as valid" checkbox bound to
      research_validated.
    - "Chat sync" section: a textarea bound to chat_transcript for pasting
      the WhatsApp conversation with this client.
    - "Send to Sophia" button: enabled only when research_validated is true
      AND chat_transcript is non-empty. On click, compose report_text as a
      short structured report (profile summary, research insight, chat
      summary — just include the raw research_text/chat_transcript under
      clear headings, no extra AI summarization needed since research is
      already human-validated text), save it to report_text + set
      report_sent_at = now(), and insert an effi_notifications row
      (audience='sophia', kind can reuse 'reminder_6h' semantics OR add a
      simple client-side-only in-app "reports" feed — implement a lightweight
      dedicated notification bell entry so Sophia sees "New report ready:
      {{name}}" the next time she opens the site, marked seen=false).
    - "Download PDF" button calling pdf-report.js's exported generateClientPDF(client).
    Modal has a close button; all fields auto-save (debounced) as they're
    edited even before "Send to Sophia" is clicked.
  </action>
  <verify>Move a test client to "booked", open its detail view, paste sample research + chat text, mark research valid, click "Send to Sophia" — confirm report_text and report_sent_at are saved, and a new-report notification appears (check reminders.js's bell container or, if not built yet, confirm the row lands in effi_notifications via a direct Supabase query).</verify>
  <done>Booked clients get a working detail flow: research prompt-and-paste, validation checkbox, chat paste, and a working "Send to Sophia" that saves the report and raises a notification.</done>
</task>

<task type="auto">
  <name>Branded PDF report export</name>
  <files>assets/js/pdf-report.js</files>
  <action>
    Using the jsPDF UMD build already loaded in index.html, implement
    generateClientPDF(client) that renders a one-page report matching the
    soft purple/pink/maroon aesthetic: a colored header band (maroon-900
    background, cream text) with "Effi Lia - Outreach" + project name, then
    sections for Profile (name, source, profile link, meeting time), Research
    Insight (client.research_text), Chat Summary (client.chat_transcript,
    truncated/wrapped sensibly), and Suggested Approach (a short static
    closing line, e.g. derived from status/notes — keep simple, no live AI
    call). Use jsPDF's built-in fonts (Fraunces/Quicksand aren't embeddable
    without extra font-loading work, so approximate with jsPDF's serif/sans
    equivalents) and the same hex colors as tokens.css. Trigger a download
    named like `effi-lia-{clientname}-report.pdf`. Export the function on
    `window.EffiPDF.generateClientPDF` so booked-flow.js can call it.
  </action>
  <verify>Call window.EffiPDF.generateClientPDF(sampleClientObject) from the console with a mock client object — confirm a styled PDF downloads with all sections populated and readable.</verify>
  <done>generateClientPDF produces a branded, readable one-page PDF for any client record and is wired to the "Download PDF" button in the detail modal.</done>
</task>

# 01-CONTEXT — Effi Lia - Outreach

## Vision

A shared outreach tracking site for the team ("TEAM KU") to manage potential-client
outreach across three business lines: **Saha Synergy**, **BWB**, and **Best Friend
Production**. Each business line is its own workspace/folder with the same feature
set but independent data. Header on every page: "Effi Lia - Outreach". Visual style:
soft purple / pink / maroon mixed aesthetic, neat + cute typography.

Keyword to open: **"EFFI"** → opens the deployed site in Safari.

## Decisions from Discuss phase

1. **Hosting/architecture**: Static HTML/CSS/JS frontend (same pattern as
   `monika-mission-control`), deployed to Render as a static site. Backend =
   Supabase (reuse the **existing** Supabase project already wired for
   monika-mission-control — credentials already in `~/.env` as
   `SUPABASE_URL` / `SUPABASE_ANON_KEY`), with new tables namespaced for this app
   so all data stays in one Supabase project. This gives real-time shared data
   across the whole team without standing up new infra.
2. **Auth**: Single shared password gate for the whole team (no individual logins).
3. **Workspaces**: 3 tabs/folders — Saha Synergy, BWB, Best Friend Production.
   Same UI/features, data scoped by a `project` column.
4. **Client tracker fields**: name, source (dari mana), profile link, status
   (`no_response` / `response` / `interest` / `not_interest` / `booked`), note.
5. **On status → Booked**:
   - Prompt for meeting date + time (manual input, not calendar sync).
   - Auto-create a client detail "folder" (detail view) with:
     - AI research pulled from the profile link (best-effort scrape/read —
       Instagram, LinkedIn, website, or whatever link type is given).
       **v1 approach: semi-manual.** The "Research" button opens the profile
       link in a new tab plus copies a ready-made research prompt to the
       clipboard; a team member pastes that prompt into their own Claude
       access, then pastes the result back into the research textarea for
       validation. No Anthropic API key / Edge Function automation in v1 —
       avoids new cost and setup. Can upgrade to one-click automated research
       later if Sophia provisions an API key for a Supabase Edge Function.
     - Team reviews the AI research and marks it **valid** (or edits it).
     - A field to paste the WhatsApp chat transcript with that client (manual
       copy/paste, not a live WA integration).
     - Once research is validated + chat pasted, a **"Send to Sophia"** action
       generates a report: short profile + research insight + chat summary +
       suggested approach for the meeting. Report appears as an **in-app
       notification/report view for Sophia** (not emailed — she reads it in-site).
6. **Reminders**: 6 hours and 1 hour before the booked meeting time —
   - Client-facing reminder: a message drafted from an editable template
     (placeholders like `{{name}}`, `{{time}}`), team copies it to send via
     WhatsApp manually. No auto-send (no WA Business API setup).
   - Sophia-facing reminder: in-app notification 6h before, bundled with the
     client report so she's briefed before the meeting.
   - Since this is a static site, reminders need a scheduled check even when
     nobody has the tab open. **v1 approach**: enable `pg_cron` on the
     **existing** Supabase project (same one used by monika-mission-control —
     confirmed OK to reuse, isolated to new `effi_*` tables, no impact on
     Mission Control's own data), running a scheduled SQL job every ~15 min
     that inserts into an `effi_notifications` table whenever a booked
     meeting enters the 6h or 1h window. The app displays these as a
     banner/bell whenever opened.
7. **Message templates**: Editable reminder templates, similar structure to the
   existing `~/sisterhood-os/wa-templates.json` pattern (`{{TIMING}}` /
   `{{DAY}}` / `{{DATE}}`-style placeholders).
8. **"Start the Day Queen" button**: Reveals today's date + 50 numbered empty
   slots (1-50) per workspace, for the team to manually fill in that day's
   outreach targets (names of people to reach out to). Saved so progress
   persists through the day and history is kept per date.
9. **Downloadable report**: Styled PDF export (purple/pink/maroon branded),
   generated client-side (e.g. via a JS PDF lib) — one PDF per client, containing
   the same content as the in-app report.
10. **Data retention**: All client records, research, chat transcripts, reports,
    and daily target history are saved permanently in Supabase (never deleted
    automatically).

## Out of scope for v1

- Automatic WhatsApp sending (would require WA Business API/Twilio setup + cost).
- Automatic Google Calendar sync for meeting times.
- Per-person individual logins/accounts.
- Automated pulling of live WhatsApp chat history (manual paste only).

## Resolved open items

- **Daily targets**: fresh 50 empty slots every day. Previous days' slots stay
  in history (queryable by date) but never carry over/stack onto today.

## Deferred (not blocking Plan phase)

- Exact list of team member names — not required for login since access is
  shared password only. Can add an optional free-text "handled by" field per
  client without needing the full roster now.

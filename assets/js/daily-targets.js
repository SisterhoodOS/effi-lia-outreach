// Effi Lia - Outreach — "Start the Day Queen" 50-slot daily target board.

Effi.dailyTargets = (function () {
  const SLOT_COUNT = 50;
  let currentDate = null;
  let slots = [];
  let saveTimers = {};
  let sessionStartedAt = null;
  let sessionFinishedAt = null;

  function fmtDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fmtElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }

  async function loadOrCreateSession(project, dateStr) {
    sessionStartedAt = null;
    sessionFinishedAt = null;
    const existing = await Effi.db.getRows('effi_daily_sessions', { project, target_date: dateStr });
    if (existing.length > 0) {
      sessionStartedAt = new Date(existing[0].started_at);
      sessionFinishedAt = existing[0].finished_at ? new Date(existing[0].finished_at) : null;
      return;
    }
    // If effi_daily_sessions doesn't exist yet (optional schema addition),
    // insertRow fails silently and returns null — fall back to an
    // in-memory-only timer for this tab so the feature still works.
    const created = await Effi.db.insertRow('effi_daily_sessions', { project, target_date: dateStr });
    sessionStartedAt = created ? new Date(created.started_at) : new Date();
  }

  async function ensureSlotsExist(project, dateStr) {
    const existing = await Effi.db.getRows('effi_daily_targets', { project, target_date: dateStr });
    if (existing.length > 0) return existing;

    const inserts = [];
    for (let i = 1; i <= SLOT_COUNT; i++) {
      inserts.push({ project, target_date: dateStr, slot_number: i, client_name: '', done: false });
    }
    try {
      const { data, error } = await Effi.sb.from('effi_daily_targets').insert(inserts).select();
      if (error) throw error;
      return data;
    } catch (e) {
      // Likely a race: another team member created today's slots at the same
      // moment (unique constraint on project+date+slot_number). Re-fetch
      // instead of returning an empty grid.
      console.warn('Effi.dailyTargets: insert failed, re-fetching (likely a concurrent create)', e);
      return Effi.db.getRows('effi_daily_targets', { project, target_date: dateStr });
    }
  }

  function renderProgress() {
    const progressEl = document.getElementById('targets-progress');
    if (slots.length === 0) {
      progressEl.textContent = '';
      return;
    }
    const done = slots.filter(s => s.done).length;
    progressEl.textContent = `${done}/${slots.length} done`;
  }

  const STATUS_OPTIONS = ['pending', 'contacted', 'response', 'interest', 'booked'];
  const STATUS_LABELS = {
    pending: 'Pending',
    contacted: 'Contacted',
    response: 'Response',
    interest: 'Interest',
    booked: 'Booked'
  };

  function statusOptionsHtml(current) {
    return STATUS_OPTIONS.map(s =>
      `<option value="${s}" ${s === (current || 'pending') ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');
  }

  function platformOptionsHtml(current) {
    return Effi.PLATFORMS.map(p =>
      `<option value="${p}" ${p === current ? 'selected' : ''}>${Effi.PLATFORM_LABELS[p]}</option>`
    ).join('');
  }

  function renderGrid(readOnly) {
    const grid = document.getElementById('targets-grid');

    if (slots.length === 0) {
      grid.innerHTML = `<p class="targets-empty-note">No targets were logged for this date.</p>`;
      renderProgress();
      return;
    }

    const rows = slots.sort((a, b) => a.slot_number - b.slot_number).map(s => `
      <tr class="target-row ${s.done ? 'done' : ''}" data-id="${s.id}">
        <td class="target-row-num">${s.slot_number}</td>
        <td>
          <input type="text" class="target-name-input" value="${Effi.util.escapeHtml(s.client_name || '')}" placeholder="Who are you reaching out to?" data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
        </td>
        <td>
          <select class="target-status-select status-select-${s.status || 'pending'}" data-id="${s.id}" ${readOnly ? 'disabled' : ''}>${statusOptionsHtml(s.status)}</select>
        </td>
        <td>
          <select class="target-platform-select" data-id="${s.id}" ${readOnly ? 'disabled' : ''}><option value="">-</option>${platformOptionsHtml(s.platform)}</select>
        </td>
        <td>
          <input type="text" class="target-link-input" value="${Effi.util.escapeHtml(s.profile_link || '')}" placeholder="Link to profile..." data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="target-notes-input" value="${Effi.util.escapeHtml(s.notes || '')}" placeholder="Notes..." data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
        </td>
        <td class="target-row-done">
          <input type="checkbox" ${s.done ? 'checked' : ''} data-id="${s.id}" ${readOnly ? 'disabled' : ''} title="Mark done">
        </td>
      </tr>
    `).join('');

    grid.innerHTML = `
      <table class="targets-table">
        <thead>
          <tr>
            <th class="col-num">#</th><th>Target Name</th><th class="col-status">Status</th>
            <th class="col-platform">Platform</th><th>Link to Profile</th><th>Notes</th><th class="col-done">Done</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    renderProgress();
  }

  async function openForDate(project, dateStr) {
    currentDate = dateStr;
    const isToday = dateStr === Effi.util.todayISODate();
    document.getElementById('targets-date-label').textContent = fmtDateLabel(dateStr);
    document.getElementById('targets-panel').hidden = false;
    const datePicker = document.getElementById('targets-date-picker');
    if (datePicker.value !== dateStr) datePicker.value = dateStr;

    slots = isToday
      ? await ensureSlotsExist(project, dateStr)
      : await Effi.db.getRows('effi_daily_targets', { project, target_date: dateStr });

    const finishBtn = document.getElementById('targets-finish-btn');
    const completedBadge = document.getElementById('targets-completed-badge');

    if (!isToday) {
      finishBtn.hidden = true;
      completedBadge.hidden = true;
      document.getElementById('targets-readonly-badge').hidden = false;
      renderGrid(true);
      return;
    }

    document.getElementById('targets-readonly-badge').hidden = true;
    await loadOrCreateSession(project, dateStr);

    if (sessionFinishedAt) {
      finishBtn.hidden = true;
      completedBadge.hidden = false;
      completedBadge.textContent = `✅ Day completed in ${fmtElapsed(sessionFinishedAt.getTime() - sessionStartedAt.getTime())}`;
      renderGrid(true);
    } else {
      completedBadge.hidden = true;
      finishBtn.hidden = false;
      renderGrid(false);
    }
  }

  async function handleFinishDay(project, dateStr) {
    const emptyCount = slots.filter(s => !s.client_name || !s.client_name.trim()).length;
    if (emptyCount > 0) {
      alert(`You still have ${emptyCount} empty target${emptyCount === 1 ? '' : 's'} out of ${slots.length}. Fill in all targets before finishing the day.`);
      return;
    }
    sessionFinishedAt = new Date();
    const existing = await Effi.db.getRows('effi_daily_sessions', { project, target_date: dateStr });
    if (existing.length > 0) {
      await Effi.db.updateRow('effi_daily_sessions', existing[0].id, { finished_at: sessionFinishedAt.toISOString() });
    }
    // If effi_daily_sessions doesn't exist yet, the above is a no-op — the
    // "completed" state below still applies for this tab/session.
    document.getElementById('targets-finish-btn').hidden = true;
    const completedBadge = document.getElementById('targets-completed-badge');
    completedBadge.hidden = false;
    completedBadge.textContent = `✅ Day completed in ${fmtElapsed(sessionFinishedAt.getTime() - sessionStartedAt.getTime())}`;
    renderGrid(true);
  }

  function debouncedSave(id, patch) {
    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(() => {
      Effi.db.updateRow('effi_daily_targets', id, patch);
    }, 500);
  }

  async function initForProject(project) {
    document.getElementById('targets-panel').hidden = true;
    document.getElementById('targets-date-picker').value = Effi.util.todayISODate();
  }

  function wireEvents() {
    document.getElementById('start-day-btn').addEventListener('click', () => {
      openForDate(Effi.state.activeProject, Effi.util.todayISODate());
    });

    document.getElementById('targets-jump-today').addEventListener('click', () => {
      openForDate(Effi.state.activeProject, Effi.util.todayISODate());
    });

    document.getElementById('targets-date-picker').addEventListener('change', (e) => {
      if (e.target.value) openForDate(Effi.state.activeProject, e.target.value);
    });

    document.getElementById('targets-finish-btn').addEventListener('click', () => {
      handleFinishDay(Effi.state.activeProject, currentDate);
    });

    const FIELD_BY_CLASS = {
      'target-name-input': 'client_name',
      'target-link-input': 'profile_link',
      'target-notes-input': 'notes'
    };

    document.getElementById('targets-grid').addEventListener('input', (e) => {
      const field = Object.keys(FIELD_BY_CLASS).find(cls => e.target.classList.contains(cls));
      if (!field) return;
      const column = FIELD_BY_CLASS[field];
      const id = e.target.dataset.id;
      const slot = slots.find(s => s.id === id);
      if (slot) slot[column] = e.target.value;
      // `profile_link`/`notes` predate-column note: same graceful-fail as
      // `status` below — fine to save even before the optional schema
      // addition in supabase/schema.sql is applied.
      debouncedSave(id, { [column]: e.target.value });
    });

    document.getElementById('targets-grid').addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const id = e.target.dataset.id;
        const slot = slots.find(s => s.id === id);
        if (slot) slot.done = e.target.checked;
        e.target.closest('.target-row').classList.toggle('done', e.target.checked);
        renderProgress();
        Effi.db.updateRow('effi_daily_targets', id, { done: e.target.checked });
        return;
      }
      if (e.target.classList.contains('target-status-select')) {
        const id = e.target.dataset.id;
        const slot = slots.find(s => s.id === id);
        if (slot) slot.status = e.target.value;
        e.target.className = `target-status-select status-select-${e.target.value}`;
        // Older effi_daily_targets rows may predate the `status` column —
        // fails gracefully (via Effi.db.updateRow's own error handling) until
        // the optional schema addition in supabase/schema.sql is applied.
        Effi.db.updateRow('effi_daily_targets', id, { status: e.target.value });
        return;
      }
      if (e.target.classList.contains('target-platform-select')) {
        const id = e.target.dataset.id;
        const slot = slots.find(s => s.id === id);
        if (slot) slot.platform = e.target.value;
        Effi.db.updateRow('effi_daily_targets', id, { platform: e.target.value });
      }
    });
  }

  return { initForProject, wireEvents };
})();

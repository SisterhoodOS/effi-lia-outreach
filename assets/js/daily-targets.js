// Effi Lia - Outreach — "Start the Day Queen" 50-slot daily target board.

Effi.dailyTargets = (function () {
  const SLOT_COUNT = 50;
  let currentDate = null;
  let slots = [];
  let saveTimers = {};

  function fmtDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
    const done = slots.filter(s => s.done).length;
    document.getElementById('targets-progress').textContent = `${done}/${SLOT_COUNT} done`;
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

  function renderGrid(readOnly) {
    const grid = document.getElementById('targets-grid');
    const rows = slots.sort((a, b) => a.slot_number - b.slot_number).map(s => `
      <tr class="target-row ${s.done ? 'done' : ''}" data-id="${s.id}">
        <td class="target-row-num">${s.slot_number}</td>
        <td>
          <input type="text" class="target-name-input" value="${Effi.util.escapeHtml(s.client_name || '')}" placeholder="Who are you reaching out to?" data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
        </td>
        <td>
          <select class="target-status-select status-select-${s.status || 'pending'}" data-id="${s.id}" ${readOnly ? 'disabled' : ''}>${statusOptionsHtml(s.status)}</select>
        </td>
        <td class="target-row-done">
          <input type="checkbox" ${s.done ? 'checked' : ''} data-id="${s.id}" ${readOnly ? 'disabled' : ''} title="Mark done">
        </td>
      </tr>
    `).join('');

    grid.innerHTML = `
      <table class="targets-table">
        <thead>
          <tr><th class="col-num">#</th><th>Target Name</th><th class="col-status">Status</th><th class="col-done">Done</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    renderProgress();
  }

  async function loadHistoryOptions(project) {
    const select = document.getElementById('targets-history-select');
    const rows = await Effi.db.getRows('effi_daily_targets', { project });
    const dates = [...new Set(rows.map(r => r.target_date))].sort().reverse();
    const today = Effi.util.todayISODate();
    select.innerHTML = dates.map(d =>
      `<option value="${d}">${d === today ? 'Today' : d}</option>`
    ).join('') || `<option value="${today}">Today</option>`;
    select.value = today;
  }

  async function openForDate(project, dateStr) {
    currentDate = dateStr;
    const isToday = dateStr === Effi.util.todayISODate();
    document.getElementById('targets-date-label').textContent = fmtDateLabel(dateStr);
    document.getElementById('targets-panel').hidden = false;

    slots = isToday
      ? await ensureSlotsExist(project, dateStr)
      : await Effi.db.getRows('effi_daily_targets', { project, target_date: dateStr });

    renderGrid(!isToday);
  }

  function debouncedSave(id, patch) {
    clearTimeout(saveTimers[id]);
    saveTimers[id] = setTimeout(() => {
      Effi.db.updateRow('effi_daily_targets', id, patch);
    }, 500);
  }

  async function initForProject(project) {
    document.getElementById('targets-panel').hidden = true;
    await loadHistoryOptions(project);
  }

  function wireEvents() {
    document.getElementById('start-day-btn').addEventListener('click', () => {
      openForDate(Effi.state.activeProject, Effi.util.todayISODate());
    });

    document.getElementById('targets-history-select').addEventListener('change', (e) => {
      if (e.target.value) openForDate(Effi.state.activeProject, e.target.value);
    });

    document.getElementById('targets-grid').addEventListener('input', (e) => {
      if (!e.target.classList.contains('target-name-input')) return;
      const id = e.target.dataset.id;
      const slot = slots.find(s => s.id === id);
      if (slot) slot.client_name = e.target.value;
      debouncedSave(id, { client_name: e.target.value });
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
      }
    });
  }

  return { initForProject, wireEvents };
})();

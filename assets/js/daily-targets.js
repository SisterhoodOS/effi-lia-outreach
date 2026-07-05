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

  function renderGrid(readOnly) {
    const grid = document.getElementById('targets-grid');
    grid.innerHTML = slots
      .sort((a, b) => a.slot_number - b.slot_number)
      .map(s => `
        <div class="target-slot ${s.done ? 'done' : ''}" data-id="${s.id}">
          <span class="target-slot-num">${s.slot_number}</span>
          <input type="text" value="${Effi.util.escapeHtml(s.client_name || '')}" placeholder="target name..." data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
          <input type="checkbox" ${s.done ? 'checked' : ''} data-id="${s.id}" ${readOnly ? 'disabled' : ''}>
        </div>
      `).join('');
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
      if (e.target.type !== 'text') return;
      const id = e.target.dataset.id;
      const slot = slots.find(s => s.id === id);
      if (slot) slot.client_name = e.target.value;
      debouncedSave(id, { client_name: e.target.value });
    });

    document.getElementById('targets-grid').addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      const id = e.target.dataset.id;
      const slot = slots.find(s => s.id === id);
      if (slot) slot.done = e.target.checked;
      e.target.closest('.target-slot').classList.toggle('done', e.target.checked);
      renderProgress();
      Effi.db.updateRow('effi_daily_targets', id, { done: e.target.checked });
    });
  }

  return { initForProject, wireEvents };
})();

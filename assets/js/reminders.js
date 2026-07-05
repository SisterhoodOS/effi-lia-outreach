// Effi Lia - Outreach — notification bell (team + Sophia reminders) and
// editable message templates.

Effi.reminders = (function () {
  const TEMPLATE_KINDS = [
    { kind: 'client_6h', label: 'Client — 6 hours before meeting' },
    { kind: 'client_1h', label: 'Client — 1 hour before meeting' },
    { kind: 'sophia_6h', label: 'Sophia — 6 hours before meeting' }
  ];

  let pollTimer = null;
  let notifications = [];

  async function refresh() {
    const project = Effi.state.activeProject;
    const teamRows = await Effi.db.getRows('effi_notifications', { project, audience: 'team' });
    const sophiaRows = await Effi.db.getRows('effi_notifications', { audience: 'sophia' });
    notifications = [...teamRows, ...sophiaRows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    render();
  }

  function render() {
    const unseen = notifications.filter(n => !n.seen);
    const badge = document.getElementById('notif-bell-badge');
    badge.hidden = unseen.length === 0;
    badge.textContent = unseen.length;

    const list = document.getElementById('notif-list');
    if (notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }
    list.innerHTML = notifications.slice(0, 30).map(n => `
      <div class="notif-item" data-id="${n.id}">
        <div>${n.audience === 'sophia' ? '👑 ' : ''}${Effi.util.escapeHtml(n.message)}</div>
        <div class="notif-item-time">${Effi.util.formatDateTime(n.created_at)}</div>
        ${!n.seen ? `<button class="notif-item-mark" data-id="${n.id}">Mark as read</button>` : ''}
      </div>
    `).join('');
  }

  async function markSeen(id) {
    await Effi.db.updateRow('effi_notifications', id, { seen: true });
    const n = notifications.find(x => x.id === id);
    if (n) n.seen = true;
    render();
  }

  function templateBodyHtml(templates) {
    return `
      <h2 class="detail-title">Edit Message Templates</h2>
      <p class="field-hint">Placeholders you can use: {{name}}, {{time}}, {{project}}</p>
      ${TEMPLATE_KINDS.map(({ kind, label }) => {
        const existing = templates.find(t => t.kind === kind && t.project === Effi.state.activeProject)
          || templates.find(t => t.kind === kind && !t.project);
        return `
          <label>${label}</label>
          <textarea class="tpl-textarea" data-kind="${kind}" data-id="${existing ? existing.id : ''}">${Effi.util.escapeHtml(existing ? existing.body : '')}</textarea>
        `;
      }).join('')}
      <div class="action-row">
        <button class="btn btn-primary" id="tpl-save">Save Templates</button>
      </div>
    `;
  }

  async function openTemplateEditor() {
    const templates = await Effi.db.getRows('effi_templates', {});
    document.getElementById('template-editor-body').innerHTML = templateBodyHtml(templates);
    Effi.util.openModal('template-editor-modal');

    document.getElementById('tpl-save').addEventListener('click', async () => {
      const textareas = document.querySelectorAll('.tpl-textarea');
      for (const ta of textareas) {
        const kind = ta.dataset.kind;
        const body = ta.value;
        const existingId = ta.dataset.id;
        const globalTpl = templates.find(t => t.kind === kind && !t.project);
        const isEditingGlobalButProjectActive = existingId && globalTpl && existingId === globalTpl.id;

        if (existingId && !isEditingGlobalButProjectActive) {
          await Effi.db.updateRow('effi_templates', existingId, { body, updated_at: new Date().toISOString() });
        } else {
          // no project-specific override yet (or only the global exists) —
          // create a new project-scoped row instead of overwriting global default
          await Effi.db.insertRow('effi_templates', { project: Effi.state.activeProject, kind, body });
        }
      }
      Effi.util.closeModal('template-editor-modal');
    });
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, 60000);
  }

  function wireEvents() {
    document.getElementById('notif-bell-btn').addEventListener('click', () => {
      const panel = document.getElementById('notif-panel');
      panel.hidden = !panel.hidden;
    });

    document.getElementById('notif-list').addEventListener('click', (e) => {
      const btn = e.target.closest('.notif-item-mark');
      if (btn) markSeen(btn.dataset.id);
    });

    document.getElementById('template-editor-btn').addEventListener('click', openTemplateEditor);

    document.addEventListener('click', (e) => {
      const panel = document.getElementById('notif-panel');
      const bell = document.getElementById('notif-bell-btn');
      if (!panel.hidden && !panel.contains(e.target) && e.target !== bell) {
        panel.hidden = true;
      }
    });

    startPolling();
  }

  return { refresh, wireEvents };
})();

// Effi Lia - Outreach — client tracker: list, add/edit, status pipeline.

Effi.clients = (function () {
  const STATUSES = ['no_response', 'response', 'interest', 'not_interest', 'booked'];
  const STATUS_LABELS = {
    no_response: 'No Response',
    response: 'Response',
    interest: 'Interest',
    not_interest: 'Not Interest',
    booked: 'Booked'
  };

  let rows = [];
  let editingId = null;

  async function load() {
    rows = await Effi.db.getRows('effi_clients', { project: Effi.state.activeProject });
    render();
  }

  function filtered() {
    const search = (document.getElementById('clients-search').value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('clients-status-filter').value;
    return rows
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !search || r.name.toLowerCase().includes(search))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  function statusOptionsHtml(current) {
    return STATUSES.map(s =>
      `<option value="${s}" ${s === current ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');
  }

  function render() {
    const list = document.getElementById('clients-list');
    const empty = document.getElementById('clients-empty');
    const items = filtered();

    empty.hidden = rows.length !== 0;
    list.innerHTML = items.map(c => `
      <div class="client-card" data-id="${c.id}">
        <div class="client-card-main">
          <div class="client-card-name">${Effi.util.escapeHtml(c.name)}</div>
          <div class="client-card-meta">
            ${Effi.util.escapeHtml(c.source || '-')}
            ${c.profile_link ? ` &middot; <a href="${Effi.util.escapeHtml(c.profile_link)}" target="_blank" rel="noopener">profile link</a>` : ''}
            ${c.handled_by ? ` &middot; handled by ${Effi.util.escapeHtml(c.handled_by)}` : ''}
            ${c.meeting_at ? ` &middot; meeting: ${Effi.util.formatDateTime(c.meeting_at)}` : ''}
          </div>
          ${c.note ? `<div class="client-card-note">${Effi.util.escapeHtml(c.note)}</div>` : ''}
        </div>
        <div class="client-card-actions">
          <span class="status-badge status-${c.status}">${STATUS_LABELS[c.status]}</span>
          <select class="client-status-select" data-id="${c.id}">${statusOptionsHtml(c.status)}</select>
          ${c.status === 'booked' ? `<button class="btn btn-ghost btn-sm client-view-detail" data-id="${c.id}">View Detail</button>` : ''}
          <button class="btn btn-ghost btn-sm client-edit" data-id="${c.id}">Edit</button>
        </div>
      </div>
    `).join('');
  }

  function formHtml(client) {
    const c = client || { name: '', source: '', profile_link: '', note: '', handled_by: '' };
    return `
      <h2 class="detail-title">${client ? 'Edit' : 'Add'} Client</h2>
      <label>Name</label>
      <input type="text" id="cf-name" value="${Effi.util.escapeHtml(c.name)}">
      <label>Source</label>
      <input type="text" id="cf-source" value="${Effi.util.escapeHtml(c.source)}">
      <label>Profile link</label>
      <input type="text" id="cf-link" value="${Effi.util.escapeHtml(c.profile_link)}" placeholder="https://instagram.com/...">
      <label>Handled by (optional)</label>
      <input type="text" id="cf-handled" value="${Effi.util.escapeHtml(c.handled_by)}">
      <label>Note</label>
      <textarea id="cf-note">${Effi.util.escapeHtml(c.note)}</textarea>
      <div class="action-row">
        <button class="btn btn-primary" id="cf-save">Save</button>
        ${client ? '<button class="btn btn-danger" id="cf-delete">Delete</button>' : ''}
      </div>
    `;
  }

  function openForm(client) {
    editingId = client ? client.id : null;
    document.getElementById('client-form-body').innerHTML = formHtml(client);
    Effi.util.openModal('client-form-modal');

    document.getElementById('cf-save').addEventListener('click', async () => {
      const payload = {
        project: Effi.state.activeProject,
        name: document.getElementById('cf-name').value.trim(),
        source: document.getElementById('cf-source').value.trim(),
        profile_link: document.getElementById('cf-link').value.trim(),
        handled_by: document.getElementById('cf-handled').value.trim(),
        note: document.getElementById('cf-note').value.trim()
      };
      if (!payload.name) return;
      if (editingId) {
        await Effi.db.updateRow('effi_clients', editingId, payload);
      } else {
        await Effi.db.insertRow('effi_clients', payload);
      }
      Effi.util.closeModal('client-form-modal');
      await load();
    });

    const delBtn = document.getElementById('cf-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        await Effi.db.deleteRow('effi_clients', editingId);
        Effi.util.closeModal('client-form-modal');
        await load();
      });
    }
  }

  async function handleStatusChange(id, newStatus) {
    const client = rows.find(r => r.id === id);
    if (!client) return;

    if (newStatus === 'booked') {
      const dt = prompt('What time is the meeting with this client? (format: YYYY-MM-DD HH:MM, e.g. 2026-07-10 14:00)');
      if (!dt) return; // cancel = don't change status
      const meetingAt = new Date(dt.replace(' ', 'T'));
      if (isNaN(meetingAt.getTime())) {
        alert('Invalid date/time format, please try again.');
        return;
      }
      const updated = await Effi.db.updateRow('effi_clients', id, {
        status: 'booked',
        meeting_at: meetingAt.toISOString()
      });
      await load();
      if (updated) {
        document.dispatchEvent(new CustomEvent('effi:client-booked', { detail: updated }));
      }
      return;
    }

    await Effi.db.updateRow('effi_clients', id, { status: newStatus });
    await load();
  }

  function wireEvents() {
    document.getElementById('add-client-btn').addEventListener('click', () => openForm(null));
    document.getElementById('clients-search').addEventListener('input', render);
    document.getElementById('clients-status-filter').addEventListener('change', render);

    document.getElementById('clients-list').addEventListener('change', (e) => {
      if (e.target.classList.contains('client-status-select')) {
        handleStatusChange(e.target.dataset.id, e.target.value);
      }
    });

    document.getElementById('clients-list').addEventListener('click', (e) => {
      const editBtn = e.target.closest('.client-edit');
      if (editBtn) {
        const c = rows.find(r => r.id === editBtn.dataset.id);
        openForm(c);
        return;
      }
      const viewBtn = e.target.closest('.client-view-detail');
      if (viewBtn) {
        const c = rows.find(r => r.id === viewBtn.dataset.id);
        if (c) document.dispatchEvent(new CustomEvent('effi:client-booked', { detail: c }));
      }
    });
  }

  return { load, wireEvents };
})();

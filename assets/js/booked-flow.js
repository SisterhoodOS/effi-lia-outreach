// Effi Lia - Outreach — booked client detail: research (semi-manual),
// chat sync, send-to-Sophia report.

Effi.bookedFlow = (function () {
  let current = null;
  let saveTimer = null;

  function researchPrompt(client) {
    const projectLabel = Effi.PROJECT_LABELS[client.project] || client.project;
    return `Research this person/profile for an upcoming sales meeting: ${client.profile_link || '(no link given)'}. ` +
      `Summarize: who they are, their business/work, likely interests or pain points relevant to ${projectLabel}, ` +
      `and one suggested conversation angle.`;
  }

  function bodyHtml(c) {
    return `
      <h2 class="detail-title">${Effi.util.escapeHtml(c.name)}</h2>
      <div class="detail-meta">
        ${Effi.util.escapeHtml(c.source || '-')}
        ${c.profile_link ? ` &middot; <a href="${Effi.util.escapeHtml(c.profile_link)}" target="_blank" rel="noopener">link profile</a>` : ''}
        &middot; Meeting: ${Effi.util.formatDateTime(c.meeting_at)}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Riset (AI-assisted)</div>
        <button class="btn btn-ghost btn-sm" id="bf-copy-prompt">Buka profile + copy prompt riset</button>
        <label>Hasil riset</label>
        <textarea id="bf-research" placeholder="Paste hasil riset AI di sini...">${Effi.util.escapeHtml(c.research_text)}</textarea>
        <div class="checkbox-row">
          <input type="checkbox" id="bf-validated" ${c.research_validated ? 'checked' : ''}>
          <label style="margin:0">Riset sudah divalidasi</label>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Sync Chat</div>
        <label>Transkrip chat WhatsApp</label>
        <textarea id="bf-chat" placeholder="Paste isi chat WA dengan client di sini...">${Effi.util.escapeHtml(c.chat_transcript)}</textarea>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Report</div>
        ${c.report_sent_at
          ? `<p class="field-hint">Report sudah dikirim ke Sophia (${Effi.util.formatDateTime(c.report_sent_at)}).</p>`
          : `<p class="field-hint">Validasi riset + isi chat dulu, baru bisa kirim report ke Sophia.</p>`}
        <div class="action-row">
          <button class="btn btn-primary" id="bf-send-sophia">Send to Sophia</button>
          <button class="btn btn-ghost" id="bf-download-pdf">Download PDF</button>
        </div>
      </div>
    `;
  }

  function reportText(c) {
    const projectLabel = Effi.PROJECT_LABELS[c.project] || c.project;
    return [
      `PROFIL: ${c.name} (${projectLabel})`,
      `Sumber: ${c.source || '-'}`,
      `Link profile: ${c.profile_link || '-'}`,
      `Meeting: ${Effi.util.formatDateTime(c.meeting_at)}`,
      '',
      'RISET:',
      c.research_text || '-',
      '',
      'RINGKASAN CHAT:',
      c.chat_transcript || '-',
      '',
      'SARAN APPROACH:',
      c.note ? c.note : 'Approach dengan ramah, dengarkan kebutuhan mereka, dan sampaikan value sesuai hasil riset di atas.'
    ].join('\n');
  }

  function currentFieldValues() {
    return {
      research_text: document.getElementById('bf-research').value,
      research_validated: document.getElementById('bf-validated').checked,
      chat_transcript: document.getElementById('bf-chat').value
    };
  }

  function debouncedAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!current) return;
      const patch = currentFieldValues();
      const updated = await Effi.db.updateRow('effi_clients', current.id, patch);
      if (updated) current = updated;
    }, 600);
  }

  function open(client) {
    current = client;
    document.getElementById('client-detail-body').innerHTML = bodyHtml(client);
    Effi.util.openModal('client-detail-modal');

    document.getElementById('bf-copy-prompt').addEventListener('click', () => {
      if (client.profile_link) window.open(client.profile_link, '_blank', 'noopener');
      const text = researchPrompt(client);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      alert('Link profile dibuka + prompt riset udah ke-copy. Tinggal paste ke Claude, lalu paste hasilnya di kotak riset.');
    });

    document.getElementById('bf-research').addEventListener('input', debouncedAutosave);
    document.getElementById('bf-validated').addEventListener('change', debouncedAutosave);
    document.getElementById('bf-chat').addEventListener('input', debouncedAutosave);

    document.getElementById('bf-send-sophia').addEventListener('click', async () => {
      const fields = currentFieldValues();
      if (!fields.research_validated || !fields.chat_transcript.trim()) {
        alert('Validasi riset dulu dan pastikan chat sudah di-paste sebelum kirim ke Sophia ya.');
        return;
      }
      const merged = { ...current, ...fields };
      const report = reportText(merged);
      const updated = await Effi.db.updateRow('effi_clients', current.id, {
        ...fields,
        report_text: report,
        report_sent_at: new Date().toISOString()
      });
      if (updated) {
        current = updated;
        await Effi.db.insertRow('effi_notifications', {
          project: updated.project,
          client_id: updated.id,
          audience: 'sophia',
          kind: 'new_report',
          message: `Report baru siap: ${updated.name} (${Effi.PROJECT_LABELS[updated.project] || updated.project})`
        }).catch(() => {});
        if (Effi.reminders && Effi.reminders.refresh) Effi.reminders.refresh();
        open(current);
      }
    });

    document.getElementById('bf-download-pdf').addEventListener('click', () => {
      if (window.EffiPDF) window.EffiPDF.generateClientPDF(current);
    });
  }

  function wireEvents() {
    document.addEventListener('effi:client-booked', (e) => open(e.detail));
  }

  return { wireEvents, reportText };
})();

// Effi Lia - Outreach — booked client detail: research (semi-manual),
// chat sync, send-to-Sophia report.

Effi.bookedFlow = (function () {
  let current = null;
  let saveTimer = null;
  let unlocked = false;

  function researchPrompt(client) {
    const projectLabel = Effi.PROJECT_LABELS[client.project] || client.project;
    return `Research this person/profile for an upcoming sales meeting: ${client.profile_link || '(no link given)'}. ` +
      `Summarize: who they are, their business/work, likely interests or pain points relevant to ${projectLabel}, ` +
      `and one suggested conversation angle.`;
  }

  function bodyHtml(c) {
    const isLocked = !!c.report_sent_at && !unlocked;

    const researchChatSection = isLocked ? `
      <div class="detail-section">
        <div class="detail-section-title">Research &amp; Chat</div>
        <p class="field-hint">Locked — this report was already sent to Sophia. Click "Unlock to Edit" below to make changes.</p>
      </div>
    ` : `
      <div class="detail-section">
        <div class="detail-section-title">Research (AI-assisted)</div>
        <button class="btn btn-ghost btn-sm" id="bf-copy-prompt">Open profile + copy research prompt</button>
        <label>Research result</label>
        <textarea id="bf-research" placeholder="Paste the AI research result here...">${Effi.util.escapeHtml(c.research_text)}</textarea>
        <div class="checkbox-row">
          <input type="checkbox" id="bf-validated" ${c.research_validated ? 'checked' : ''}>
          <label style="margin:0">Research validated</label>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Sync Chat</div>
        <label>WhatsApp chat transcript</label>
        <textarea id="bf-chat" placeholder="Paste the WhatsApp chat with the client here...">${Effi.util.escapeHtml(c.chat_transcript)}</textarea>
      </div>
    `;

    const reportSection = isLocked ? `
      <div class="detail-section">
        <div class="detail-section-title">Report 🔒 Sent to Sophia</div>
        <p class="field-hint">Sent ${Effi.util.formatDateTime(c.report_sent_at)} — view only.</p>
        <textarea id="bf-report-view" class="report-locked-view" readonly disabled>${Effi.util.escapeHtml(c.report_text)}</textarea>
        <div class="action-row">
          <button class="btn btn-ghost" id="bf-unlock">Unlock to Edit</button>
          <button class="btn btn-ghost" id="bf-download-pdf">Download PDF</button>
        </div>
      </div>
    ` : `
      <div class="detail-section">
        <div class="detail-section-title">Report</div>
        ${c.report_sent_at
          ? `<p class="field-hint">Editing an already-sent report. Click "Send to Sophia" again to update it.</p>`
          : `<p class="field-hint">Validate the research and fill in the chat first before you can send the report to Sophia.</p>`}
        <div class="action-row">
          <button class="btn btn-primary" id="bf-send-sophia">Send to Sophia</button>
          <button class="btn btn-ghost" id="bf-download-pdf">Download PDF</button>
        </div>
      </div>
    `;

    return `
      <h2 class="detail-title">${Effi.util.escapeHtml(c.name)}</h2>
      <div class="detail-meta">
        ${Effi.util.escapeHtml(Effi.util.platformLabel(c.source))}
        ${c.profile_link ? ` &middot; <a href="${Effi.util.escapeHtml(c.profile_link)}" target="_blank" rel="noopener">profile link</a>` : ''}
        &middot; Meeting: ${Effi.util.formatDateTime(c.meeting_at)}
      </div>
      ${researchChatSection}
      ${reportSection}
    `;
  }

  function reportText(c) {
    const projectLabel = Effi.PROJECT_LABELS[c.project] || c.project;
    return [
      `PROFILE: ${c.name} (${projectLabel})`,
      `Platform: ${Effi.util.platformLabel(c.source)}`,
      `Profile link: ${c.profile_link || '-'}`,
      `Meeting: ${Effi.util.formatDateTime(c.meeting_at)}`,
      '',
      'RESEARCH:',
      c.research_text || '-',
      '',
      'CHAT SUMMARY:',
      c.chat_transcript || '-',
      '',
      'SUGGESTED APPROACH:',
      c.note ? c.note : 'Approach warmly, listen to their needs, and communicate value based on the research above.'
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

    document.getElementById('bf-copy-prompt')?.addEventListener('click', () => {
      if (client.profile_link) window.open(client.profile_link, '_blank', 'noopener');
      const text = researchPrompt(client);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      alert('Profile link opened and the research prompt was copied. Paste it into Claude, then paste the result into the research box.');
    });

    document.getElementById('bf-research')?.addEventListener('input', debouncedAutosave);
    document.getElementById('bf-validated')?.addEventListener('change', debouncedAutosave);
    document.getElementById('bf-chat')?.addEventListener('input', debouncedAutosave);

    document.getElementById('bf-send-sophia')?.addEventListener('click', async () => {
      const fields = currentFieldValues();
      if (!fields.research_validated || !fields.chat_transcript.trim()) {
        alert('Validate the research and make sure the chat is pasted before sending to Sophia.');
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
        unlocked = false;
        await Effi.db.insertRow('effi_notifications', {
          project: updated.project,
          client_id: updated.id,
          audience: 'sophia',
          kind: 'new_report',
          message: `New report ready: ${updated.name} (${Effi.PROJECT_LABELS[updated.project] || updated.project})`
        }).catch(() => {});
        if (Effi.reminders && Effi.reminders.refresh) Effi.reminders.refresh();
        open(current);
      }
    });

    document.getElementById('bf-unlock')?.addEventListener('click', () => {
      unlocked = true;
      open(current);
    });

    document.getElementById('bf-download-pdf')?.addEventListener('click', () => {
      if (window.EffiPDF) window.EffiPDF.generateClientPDF(current);
    });
  }

  function wireEvents() {
    document.addEventListener('effi:client-booked', (e) => {
      unlocked = false;
      open(e.detail);
    });
  }

  return { wireEvents, reportText };
})();

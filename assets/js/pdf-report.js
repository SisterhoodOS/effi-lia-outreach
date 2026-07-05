// Effi Lia - Outreach — branded PDF client report export via jsPDF.

window.EffiPDF = (function () {
  const MAROON_900 = [92, 26, 46];
  const MAROON_700 = [140, 47, 74];
  const PINK_100 = [251, 228, 238];
  const INK = [58, 20, 36];
  const CREAM = [255, 248, 250];

  function wrapText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text || '-', maxWidth);
    lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight));
    return y + lines.length * lineHeight;
  }

  function generateClientPDF(client) {
    if (!window.jspdf) {
      console.warn('jsPDF not loaded');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 0;

    // Header band
    doc.setFillColor(...MAROON_900);
    doc.rect(0, 0, pageWidth, 90, 'F');
    doc.setTextColor(...CREAM);
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.text('Effi Lia - Outreach', margin, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const projectLabel = (Effi && Effi.PROJECT_LABELS && Effi.PROJECT_LABELS[client.project]) || client.project || '';
    doc.text(`Client Report — ${projectLabel}`, margin, 64);

    y = 120;
    doc.setTextColor(...INK);

    function sectionTitle(title) {
      doc.setFillColor(...PINK_100);
      doc.rect(margin - 8, y - 14, pageWidth - margin * 2 + 16, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...MAROON_700);
      doc.text(title.toUpperCase(), margin, y);
      doc.setTextColor(...INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      y += 22;
    }

    sectionTitle('Profile');
    y = wrapText(doc, `Name: ${client.name || '-'}`, margin, y, pageWidth - margin * 2, 14);
    y = wrapText(doc, `Platform: ${Effi.util.platformLabel(client.source)}`, margin, y, pageWidth - margin * 2, 14);
    y = wrapText(doc, `Profile link: ${client.profile_link || '-'}`, margin, y, pageWidth - margin * 2, 14);
    const meetingStr = client.meeting_at
      ? new Date(client.meeting_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : '-';
    y = wrapText(doc, `Meeting: ${meetingStr}`, margin, y, pageWidth - margin * 2, 14);
    y += 10;

    sectionTitle('Research Insight');
    y = wrapText(doc, client.research_text || '-', margin, y, pageWidth - margin * 2, 14);
    y += 10;

    if (y > 680) { doc.addPage(); y = 60; }

    sectionTitle('Chat Summary');
    y = wrapText(doc, client.chat_transcript || '-', margin, y, pageWidth - margin * 2, 14);
    y += 10;

    if (y > 680) { doc.addPage(); y = 60; }

    sectionTitle('Suggested Approach');
    const approach = client.note
      ? client.note
      : 'Approach warmly, listen to their needs, and communicate value based on the research above.';
    y = wrapText(doc, approach, margin, y, pageWidth - margin * 2, 14);

    const safeName = (client.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    doc.save(`effi-lia-${safeName}-report.pdf`);
  }

  return { generateClientPDF };
})();

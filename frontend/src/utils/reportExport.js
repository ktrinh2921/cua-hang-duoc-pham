const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const csvCell = (value) => {
  let normalized = value == null ? '' : String(value);
  // Ngăn Excel thực thi công thức từ dữ liệu do người dùng nhập.
  if (/^[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
};

export function sectionsToRows(sections) {
  return sections.flatMap((section) => section.rows.map((row) => ({
    'Nhóm dữ liệu': section.title,
    ...row,
  })));
}

export function buildCsv(sections) {
  const rows = sectionsToRows(sections);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ].join('\r\n');
}

export function downloadReportCsv(filename, sections) {
  const blob = new Blob([`\uFEFF${buildCsv(sections)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildReportHtml({ title, subtitle, sections }) {
  const content = sections.map((section) => {
    const headers = [...new Set(section.rows.flatMap((row) => Object.keys(row)))];
    const body = section.rows.map((row) => `
      <tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('');
    return `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${body || `<tr><td colspan="${Math.max(1, headers.length)}">Không có dữ liệu</td></tr>`}</tbody>
        </table>
      </section>`;
  }).join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { color:#111827; font:12px/1.4 Arial,sans-serif; margin:0; }
      header { border-bottom:2px solid #166534; margin-bottom:16px; padding-bottom:10px; }
      h1 { color:#166534; font-size:22px; margin:0; } h2 { font-size:15px; margin:18px 0 6px; }
      p { color:#4b5563; margin:4px 0 0; } table { border-collapse:collapse; width:100%; }
      th,td { border:1px solid #d1d5db; padding:6px; text-align:left; vertical-align:top; }
      th { background:#f3f4f6; } section { break-inside:avoid; }
      footer { color:#6b7280; margin-top:18px; text-align:right; }
    </style></head><body>
    <header><h1>SECUREPHARMA — ${escapeHtml(title)}</h1><p>${escapeHtml(subtitle || '')}</p></header>
    ${content}<footer>Xuất lúc ${escapeHtml(new Date().toLocaleString('vi-VN'))}</footer>
    </body></html>`;
}

export function printReport(report) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  printWindow.document.open();
  printWindow.document.write(buildReportHtml(report));
  printWindow.document.close();
  printWindow.focus();
  return true;
}

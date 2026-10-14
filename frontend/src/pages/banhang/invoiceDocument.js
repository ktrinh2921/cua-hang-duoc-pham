const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`;
const vietnamDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dateTime = (value) => {
  const parts = vietnamDateTime.formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${byType.day}/${byType.month}/${byType.year} ${byType.hour}:${byType.minute}`;
};

export function buildInvoiceHtml(invoice) {
  const rows = (invoice.ChiTiet || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.TenThuoc)}</strong><br><small>${escapeHtml(item.TenDM || '')}</small></td>
      <td class="number">${escapeHtml(item.SoLuongBan)}</td>
      <td class="number">${money(item.GiaBanThucTe)}</td>
      <td class="number">${money(item.ThanhTien)}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hóa đơn ${escapeHtml(invoice.MaHD)}</title>
  <style>
    @page { size: A5 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font: 14px/1.45 Arial, sans-serif; }
    header { text-align: center; margin-bottom: 18px; }
    h1 { margin: 0; color: #166534; font-size: 22px; }
    h2 { margin: 14px 0 4px; font-size: 18px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 18px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 5px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 12px; text-transform: uppercase; }
    .number { text-align: right; white-space: nowrap; }
    .totals { margin: 14px 0 0 auto; width: min(100%, 320px); }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { border-top: 2px solid #166534; margin-top: 6px; padding-top: 8px !important; color: #166534; font-size: 17px; font-weight: 700; }
    footer { margin-top: 28px; text-align: center; color: #6b7280; font-size: 12px; }
    small { color: #6b7280; }
  </style>
</head>
<body>
  <header>
    <h1>SECUREPHARMA</h1>
    <h2>HÓA ĐƠN BÁN HÀNG #${escapeHtml(invoice.MaHD)}</h2>
  </header>
  <section class="meta">
    <span><strong>Ngày lập:</strong> ${dateTime(invoice.NgayGioLap)}</span>
    <span><strong>Trạng thái:</strong> ${invoice.TrangThai === 'DaThanhToan' ? 'Đã thanh toán' : 'Đã hủy'}</span>
    <span><strong>Khách hàng:</strong> ${escapeHtml(invoice.TenKH || 'Khách lẻ')}</span>
    <span><strong>Nhân viên:</strong> ${escapeHtml(invoice.TenNV || '')}</span>
  </section>
  <table>
    <thead><tr><th>#</th><th>Thuốc</th><th class="number">SL</th><th class="number">Đơn giá</th><th class="number">Thành tiền</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <section class="totals">
    <div><span>Giảm giá</span><strong>${money(invoice.GiamGia)}</strong></div>
    <div class="grand"><span>Tổng cộng</span><span>${money(invoice.TongTien)}</span></div>
    <div><span>Tiền khách đưa</span><strong>${money(invoice.TienKhachDua)}</strong></div>
    <div><span>Tiền trả lại</span><strong>${money(invoice.TienTraLai)}</strong></div>
  </section>
  <footer>Cảm ơn quý khách. Vui lòng kiểm tra hàng trước khi rời quầy.</footer>
</body>
</html>`;
}

export function printInvoice(invoice) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  printWindow.document.open();
  printWindow.document.write(buildInvoiceHtml(invoice));
  printWindow.document.close();
  printWindow.focus();
  return true;
}

export function downloadInvoiceHtml(invoice) {
  const blob = new Blob([buildInvoiceHtml(invoice)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hoa-don-${invoice.MaHD}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

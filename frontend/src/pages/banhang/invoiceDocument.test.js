import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInvoiceHtml } from './invoiceDocument.js';

test('invoice HTML escapes user-controlled fields and contains totals', () => {
  const html = buildInvoiceHtml({
    MaHD: 7,
    NgayGioLap: '2026-09-16T10:00:00Z',
    TenKH: '<script>alert(1)</script>',
    TenNV: 'Lan',
    TrangThai: 'DaThanhToan',
    TongTien: 120000,
    GiamGia: 0,
    TienKhachDua: 150000,
    TienTraLai: 30000,
    ChiTiet: [{ TenThuoc: 'Vitamin & C', TenDM: 'Vitamin', SoLuongBan: 2, GiaBanThucTe: 60000, ThanhTien: 120000 }],
  });
  assert.match(html, /HÓA ĐƠN BÁN HÀNG #7/);
  assert.match(html, /120\.000 ₫/);
  assert.match(html, /Vitamin &amp; C/);
  assert.doesNotMatch(html, /<script>alert/);
});

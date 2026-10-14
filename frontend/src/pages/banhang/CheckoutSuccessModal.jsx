/**
 * CheckoutSuccessModal — Modal "Thanh toán thành công"
 *
 * Hiển thị ngay sau khi bán thuốc tại BanHangPage, cho phép:
 *  - Xem tóm tắt hóa đơn vừa tạo
 *  - In / tải HTML hóa đơn ngay (không phải navigate đi đâu)
 *  - Đóng modal để tiếp tục bán (giỏ đã được reset từ parent)
 *  - Mở trang chi tiết hóa đơn (nếu user muốn xem đầy đủ)
 *
 * Tách thành component riêng để:
 *  - BanHangPage gọn nhẹ (giảm ~80 dòng logic)
 *  - Dễ test (props rõ ràng)
 *  - Tái sử dụng nếu sau này có "Bán từ trang khác" (vd: tạo HĐ cho đơn đặt trước)
 *
 * @example
 *   <CheckoutSuccessModal
 *     open={!!lastInvoice}
 *     invoice={lastInvoice}
 *     customerName={selectedKH?.TenKH}
 *     onClose={() => setLastInvoice(null)}
 *     onViewDetail={() => navigate('/hoa-don', { state: { viewId } })}
 *   />
 */
import { CheckCircle2, Printer, Download, Eye, ShoppingCart, X, Wallet, Coins } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/format';
import { downloadInvoiceHtml, printInvoice } from './invoiceDocument';

/**
 * Mã hóa đơn theo format dễ đọc: HD-YYYY-NNNN
 * Nếu sau này DB có mã riêng (vd: SoHoaDon) thì thay bằng field đó.
 */
function formatInvoiceCode(maHD) {
  if (!maHD) return '#?';
  const year = new Date().getFullYear();
  return `HD-${year}-${String(maHD).padStart(4, '0')}`;
}

export default function CheckoutSuccessModal({
  open,
  invoice,
  customerName,
  onClose,
  onViewDetail,
}) {
  if (!invoice) return null;

  // Đếm số mặt hàng (FIFO có thể sinh nhiều dòng ChiTietLo cho cùng 1 thuốc)
  const itemCount = (invoice.ChiTiet || []).length;
  const tongTien = Number(invoice.TongTien) || 0;
  const giamGia = Number(invoice.GiamGia) || 0;
  const tienDua = Number(invoice.TienKhachDua) || 0;
  const tienLai = Number(invoice.TienTraLai) || 0;

  const handlePrint = () => {
    // printInvoice tự mở popup; nếu bị chặn sẽ trả false.
    // Không toast ở đây — modal độc lập với toast provider; user có thể thử lại.
    printInvoice(invoice);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      className="overflow-hidden"
    >
      <div className="-m-6">
        {/* ── HERO HEADER (gradient xanh dương brand) ─────────────────── */}
        <div className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 px-6 py-8 text-white text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>

          <h2 className="text-h2 font-bold">Thanh toán thành công!</h2>
          <p className="mt-1 text-caption text-white/90 font-mono">
            {formatInvoiceCode(invoice.MaHD)}
          </p>
        </div>

        {/* ── SUMMARY BODY ────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-4">
          {/* 3 stat boxes */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-primary-50 rounded-card">
              <ShoppingCart className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              <p className="text-h3 font-bold font-mono text-primary-700">{itemCount}</p>
              <p className="text-caption text-neutral-600">Mặt hàng</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-card">
              <Wallet className="w-5 h-5 text-primary-600 mx-auto mb-1" />
              <p className="text-h3 font-bold font-mono text-primary-700">
                {formatCurrency(tongTien)}
              </p>
              <p className="text-caption text-neutral-600">Tổng thu</p>
            </div>
            <div className="text-center p-3 bg-info-50 rounded-card">
              <Coins className="w-5 h-5 text-info-600 mx-auto mb-1" />
              <p className="text-h3 font-bold font-mono text-info-700">
                {formatCurrency(tienLai)}
              </p>
              <p className="text-caption text-neutral-600">Tiền thừa</p>
            </div>
          </div>

          {/* Chi tiết dòng tiền */}
          <div className="border border-neutral-200 rounded-card divide-y divide-neutral-100 text-body">
            <div className="flex justify-between px-4 py-2">
              <span className="text-neutral-600">Khách hàng</span>
              <span className="font-medium text-neutral-900 truncate ml-2">
                {customerName || 'Khách lẻ'}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-neutral-600">Tiền khách đưa</span>
              <span className="font-mono text-neutral-900">{formatCurrency(tienDua)}</span>
            </div>
            {giamGia > 0 && (
              <div className="flex justify-between px-4 py-2">
                <span className="text-neutral-600">Giảm giá</span>
                <span className="font-mono text-success-700">
                  −{formatCurrency(giamGia)}
                </span>
              </div>
            )}
          </div>

          {/* Lời nhắc nhỏ */}
          <p className="text-caption text-neutral-500 text-center">
            Hóa đơn đã được lưu vào hệ thống và ghi nhận thu tiền tự động.
          </p>
        </div>

        {/* ── ACTION FOOTER ───────────────────────────────────── */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" icon={<Printer />} onClick={handlePrint}>
            In hóa đơn
          </Button>
          <Button
            variant="secondary"
            icon={<Download />}
            onClick={() => downloadInvoiceHtml(invoice)}
          >
            Tải HTML
          </Button>
          {onViewDetail && (
            <Button variant="ghost" icon={<Eye />} onClick={onViewDetail}>
              Xem chi tiết
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Bán tiếp
          </Button>
        </div>
      </div>
    </Modal>
  );
}
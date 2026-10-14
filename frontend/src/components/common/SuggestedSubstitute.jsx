/**
 * SuggestedSubstitute — Gợi ý thuốc thay thế cùng hoạt chất khi thuốc nguồn hết hàng
 *
 * Sử dụng ở POS (BanHangPage): khi NV tìm thuốc hết hàng hoặc click thuốc hết trong Quick Picks,
 * component này hiển thị danh sách thuốc cùng hoạt chất, đang còn hàng, để NV chọn bán thay thế.
 *
 * Props:
 *  - thuocNguon: object thuốc đang tìm (chứa TenThuoc, HoatChat, MaThuoc) — optional, để hiển thị context
 *  - substitutes: array thuốc thay thế (từ API /thuoc/:id/similar)
 *  - loading: boolean
 *  - onPick(thuoc): callback khi user chọn 1 thuốc thay thế → add vào giỏ
 *  - onDismiss(): callback để đóng banner
 *  - className: optional Tailwind class
 */
import { Shuffle, Pill, Plus, X, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import StockBadge from '../ui/StockBadge';

export default function SuggestedSubstitute({
  thuocNguon,
  substitutes = [],
  loading = false,
  onPick,
  onDismiss,
  className = '',
}) {
  // Không hiển thị khi chưa có data hoặc rỗng
  if (!loading && substitutes.length === 0) return null;

  return (
    <div
      className={`rounded-card border border-warning-200 bg-warning-50/60 p-3 ${className}`}
      role="region"
      aria-label="Gợi ý thuốc thay thế"
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn bg-warning-100 text-warning-700">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-body font-semibold text-warning-900">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Thuốc đang hết — Gợi ý thay thế
            </p>
            {thuocNguon && (
              <p className="truncate text-caption text-warning-800">
                {thuocNguon.TenThuoc}
                {thuocNguon.HoatChat && (
                  <span className="text-warning-700"> · Hoạt chất: {thuocNguon.HoatChat}</span>
                )}
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-warning-700 hover:bg-warning-100"
            aria-label="Đóng gợi ý"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-card bg-warning-100/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {substitutes.map((sub) => {
            const tuongDuong = Boolean(sub.TuongDuong);
            const tonKho = Number(sub.SoLuongTonKho) || 0;
            return (
              <button
                key={sub.MaThuoc}
                type="button"
                onClick={() => onPick?.(sub)}
                className="group flex flex-col gap-1.5 rounded-card border border-warning-200 bg-white p-2.5 text-left transition-all hover:border-warning-400 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-500"
              >
                {/* Badge tương đương */}
                <div className="flex items-center justify-between gap-1">
                  {tuongDuong ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-success-100 px-1.5 py-0.5 text-caption font-medium text-success-700">
                      Tương đương
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-neutral-100 px-1.5 py-0.5 text-caption font-medium text-neutral-600">
                      Khác hàm lượng
                    </span>
                  )}
                  <StockBadge stock={tonKho} />
                </div>

                {/* Tên thuốc */}
                <p className="line-clamp-2 text-body font-semibold text-neutral-900 group-hover:text-warning-800">
                  {sub.TenThuoc}
                </p>

                {/* Hàm lượng + giá */}
                <div className="flex items-center justify-between">
                  {sub.KhoiLuong && (
                    <span className="truncate text-caption text-neutral-500">
                      {sub.KhoiLuong}
                    </span>
                  )}
                  <span className="text-body font-bold font-mono text-primary-700">
                    {formatCurrency(sub.GiaBanThamKhao)}
                  </span>
                </div>

                {/* CTA */}
                <span className="mt-0.5 inline-flex items-center justify-center gap-1 rounded-btn bg-warning-600 py-1 text-caption font-semibold text-white group-hover:bg-warning-700">
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Bán thay thế
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 flex items-center gap-1 text-caption text-warning-700">
        <Pill className="h-3 w-3" aria-hidden="true" />
        {substitutes.length} thuốc cùng hoạt chất đang còn hàng
      </p>
    </div>
  );
}

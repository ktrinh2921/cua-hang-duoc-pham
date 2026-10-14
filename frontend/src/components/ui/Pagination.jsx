/**
 * Pagination — Phân trang chuẩn hoá
 *
 * @example
 *   <Pagination page={1} totalPages={10} total={120} onChange={setPage} />
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Pagination({
  page = 1,
  totalPages = 0,
  total = 0,
  onChange = () => {},
  loading = false,
  className,
}) {
  const safeTotalPages = Math.max(0, Number(totalPages) || 0);
  const safePage = Math.min(
    Math.max(1, Number(page) || 1),
    Math.max(1, safeTotalPages)
  );
  const safeTotal = Math.max(0, Number(total) || 0);

  if (safeTotalPages <= 1) return null;

  const canPrev = safePage > 1 && !loading;
  const canNext = safePage < safeTotalPages && !loading;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4',
        'bg-white rounded-card shadow-card border border-neutral-200/60 px-4 py-3',
        className
      )}
      role="navigation"
      aria-label="Phân trang"
      aria-busy={loading}
    >
      <div className="text-caption text-neutral-600" aria-live="polite">
        Trang <span className="font-semibold text-neutral-900">{safePage}</span> / {safeTotalPages}
        <span className="ml-2">• {safeTotal.toLocaleString('vi-VN')} kết quả</span>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onChange(safePage - 1)}
          disabled={!canPrev}
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-btn border border-neutral-300 bg-white',
            'text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          )}
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(safePage + 1)}
          disabled={!canNext}
          className={cn(
            'h-11 w-11 flex items-center justify-center rounded-btn border border-neutral-300 bg-white',
            'text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          )}
          aria-label="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

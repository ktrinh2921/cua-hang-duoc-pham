/**
 * SearchBar — Thanh tìm kiếm + filter toolbar
 *
 * Hỗ trợ 2 layout:
 *   - Mặc định: ô search + slot children (filter, nút)
 *   - Compact: chỉ render children nếu hideSearch=true
 *
 * @example
 *   <SearchBar value={s} onChange={setS} placeholder="Tìm thuốc...">
 *     <Select .../>
 *   </SearchBar>
 */
import { useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  children,
  className,
  hideSearch = false,
  label,
  title,
  description,
  meta,
}) {
  const searchId = useId();
  const enhancedLayout = Boolean(label || title || description || meta);

  return (
    <section
      aria-label={title || 'Tìm kiếm và bộ lọc'}
      className={cn(
        'rounded-card shadow-card border border-neutral-200/80',
        enhancedLayout ? 'bg-white' : 'bg-gradient-to-br from-white to-neutral-50/50',
        'p-4 sm:p-5',
        className
      )}
    >
      {(title || description || meta) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-body font-semibold text-neutral-900">{title}</h2>}
            {description && <p className="mt-0.5 text-caption text-neutral-600">{description}</p>}
          </div>
          {meta && (
            <span
              className="flex-shrink-0 rounded-pill bg-primary-50 px-2.5 py-1 text-caption font-medium text-primary-700"
              aria-live="polite"
            >
              {meta}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex gap-3',
          enhancedLayout ? 'flex-col lg:flex-row lg:items-end' : 'flex-wrap items-center'
        )}
      >
        {!hideSearch && (
          <div className={cn('flex-1', enhancedLayout ? 'min-w-0' : 'min-w-[220px]')}>
            {label && (
              <label htmlFor={searchId} className="mb-1.5 block text-body font-medium text-neutral-700">
                {label}
              </label>
            )}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label || placeholder}
                className={cn(
                  'h-11 w-full appearance-none rounded-btn border border-neutral-300 bg-white pl-11 pr-11 text-body text-neutral-900 shadow-sm',
                  'placeholder:text-neutral-500',
                  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                  'transition-colors duration-150'
                )}
              />
              {value && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className={cn(
                    'absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center',
                    'cursor-pointer rounded-btn text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 active:bg-neutral-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    'transition-colors'
                  )}
                  aria-label="Xóa từ khóa tìm kiếm"
                  title="Xóa từ khóa"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
        {children && (
          <div
            className={cn(
              'flex gap-2',
              enhancedLayout
                ? 'w-full flex-col gap-3 sm:flex-row sm:items-end'
                : 'flex-wrap items-center',
              enhancedLayout && !hideSearch && 'lg:w-auto'
            )}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

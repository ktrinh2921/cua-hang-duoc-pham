/**
 * Modal — Dialog dùng Headless UI (ESC, focus trap, click outside)
 *
 * Tính năng:
 *  - ESC đóng modal
 *  - Click outside đóng
 *  - Focus trap tự động (Headless UI)
 *  - Body scroll lock khi mở
 *  - Gradient header theo tone (primary | success | danger | warning | info)
 *  - Optional icon trên title (trực quan hoá loại modal)
 *  - Optional badge (vd: "Thành công", "Nguy hiểm")
 *  - Sticky footer slot (nút hành động luôn hiển thị khi body dài)
 *  - Animation vào/ra mượt (slide-up + fade-in)
 *  - Responsive max-height
 *
 * Gradient header pattern: 3 điểm — đậm ở góc trên-trái, nhạt dần ra các cạnh.
 * Màu chính: primary (Navy Blue #2196F3 family) — đồng nhất với design system dự án.
 *
 * Tone → Use case:
 *  primary  → form tạo/sửa, thông tin chung
 *  success  → thành công, phiếu thu
 *  danger   → hủy, xóa, phiếu chi
 *  warning  → cảnh báo, kiểm kê
 *  info     → chi tiết, lịch sử, drill-down
 *  neutral  → không phân loại
 *
 * @example
 *   <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Thêm thuốc" size="lg">
 *     <form>...</form>
 *   </Modal>
 *
 *   <Modal
 *     open={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     title="Điều chỉnh tồn kho"
 *     icon={<Sliders />}
 *     tone="warning"
 *     size="lg"
 *     footer={
 *       <>
 *         <Button variant="secondary" onClick={onClose}>Hủy</Button>
 *         <Button variant="primary" onClick={onSubmit}>Lưu</Button>
 *       </>
 *     }
 *   >
 *     ...
 *   </Modal>
 */
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
};

const TONE_CLASSES = {
  // ── Brand primary: xanh dương Navy Blue — dùng cho form tạo/sửa, thông tin chung
  primary: {
    header: 'bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-primary-500/30',
    badge: 'bg-white/15 text-white ring-white/30',
  },
  // ── Thành công: primary đậm → primary nhạt — dùng cho Phiếu thu
  success: {
    header: 'bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-primary-500/30',
    badge: 'bg-white/15 text-white ring-white/30',
  },
  // ── Nguy hiểm: primary đậm → info — dùng cho Phiếu chi, hủy hóa đơn
  danger: {
    header: 'bg-gradient-to-br from-primary-800 via-primary-700 to-info-500',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-primary-500/30',
    badge: 'bg-white/15 text-white ring-white/30',
  },
  // ── Cảnh báo: primary đậm → primary nhạt — dùng cho kiểm kê, điều chỉnh tồn
  warning: {
    header: 'bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-primary-500/30',
    badge: 'bg-white/15 text-primary-50 ring-white/30',
  },
  // ── Thông tin: primary đậm → primary nhạt — dùng cho chi tiết, lịch sử
  info: {
    header: 'bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-primary-500/30',
    badge: 'bg-white/15 text-white ring-white/30',
  },
  // ── Trung lập: neutral xám — dùng cho modal không phân loại cảm xúc
  neutral: {
    header: 'bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-600',
    icon: 'bg-white/15 ring-white/20',
    ring: 'ring-neutral-500/30',
    badge: 'bg-white/15 text-white ring-white/30',
  },
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  badge,
  tone = 'primary',
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  /** Style header mặc định (gradient). Set false nếu muốn header trắng. */
  gradientHeader = true,
  className,
  bodyClassName,
  footerClassName,
}) {
  const toneStyles = TONE_CLASSES[tone] || TONE_CLASSES.primary;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
            aria-hidden="true"
          />
        </Transition.Child>

        {/* Container */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full bg-white rounded-modal shadow-modal ring-1 ring-black/5',
                  'transform transition-all',
                  SIZE_CLASSES[size],
                  'max-h-[92vh] overflow-hidden flex flex-col',
                  toneStyles.ring,
                  className
                )}
              >
                {/* ─────────── HEADER ─────────── */}
                {(title || showCloseButton || icon || badge) && (
                  <div
                    className={cn(
                      'relative px-6 py-5 overflow-hidden',
                      gradientHeader
                        ? cn('text-white', toneStyles.header)
                        : 'bg-white text-neutral-900 border-b border-neutral-200'
                    )}
                  >
                    {/* Decorative blobs (chỉ khi gradient) */}
                    {gradientHeader && (
                      <>
                        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute -bottom-12 right-20 h-24 w-24 rounded-full bg-white/5" />
                      </>
                    )}

                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        {icon && (
                          <div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-card flex items-center justify-center',
                              gradientHeader
                                ? cn(toneStyles.icon, 'ring-1')
                                : 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
                            )}
                            aria-hidden="true"
                          >
                            {icon}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {title && (
                              <Dialog.Title
                                className={cn(
                                  'text-h2 font-semibold truncate',
                                  gradientHeader ? 'text-white' : 'text-neutral-900'
                                )}
                              >
                                {title}
                              </Dialog.Title>
                            )}
                            {badge && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-pill text-caption font-medium ring-1 ring-inset',
                                  gradientHeader
                                    ? toneStyles.badge
                                    : 'bg-primary-50 text-primary-700 ring-primary-100'
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </div>
                          {description && (
                            <p
                              className={cn(
                                'mt-1 text-caption',
                                gradientHeader ? 'text-white/85' : 'text-neutral-500'
                              )}
                            >
                              {description}
                            </p>
                          )}
                        </div>
                      </div>

                      {showCloseButton && (
                        <button
                          type="button"
                          onClick={onClose}
                          className={cn(
                            'flex-shrink-0 p-1.5 rounded-btn transition-colors',
                            gradientHeader
                              ? 'text-white/80 hover:text-white hover:bg-white/15'
                              : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                          )}
                          aria-label="Đóng"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ─────────── BODY ─────────── */}
                <div
                  className={cn(
                    'flex-1 overflow-y-auto',
                    footer ? 'px-6 py-5' : 'px-6 py-5',
                    bodyClassName
                  )}
                >
                  {children}
                </div>

                {/* ─────────── FOOTER (sticky) ─────────── */}
                {footer && (
                  <div
                    className={cn(
                      'flex-shrink-0 px-6 py-4 bg-neutral-50 border-t border-neutral-200',
                      'flex flex-wrap items-center gap-2 justify-end',
                      footerClassName
                    )}
                  >
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

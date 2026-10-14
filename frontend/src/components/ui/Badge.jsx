/**
 * Badge — Nhãn trạng thái (semantic colors theo design system)
 *
 * Variants: success | warning | danger | info | neutral | primary
 * Sizes:    sm | md
 * Tuỳ chọn: dot (chấm tròn), icon
 *
 * @example
 *   <Badge variant="success" dot>Đang làm</Badge>
 *   <Badge variant="warning" icon={<Clock/>}>Sắp hết hạn</Badge>
 */
import { cn } from '../../utils/cn';

const VARIANT_CLASSES = {
  success: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-100',
  danger:  'bg-danger-50  text-danger-700  ring-1 ring-inset ring-danger-100',
  info:    'bg-info-50    text-info-700    ring-1 ring-inset ring-info-100',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-100',
  neutral: 'bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-caption gap-1',
  md: 'px-2.5 py-1 text-body gap-1.5',
};

export default function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className,
  children,
  ...rest
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-pill whitespace-nowrap',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', {
            'bg-success-500': variant === 'success',
            'bg-warning-500': variant === 'warning',
            'bg-danger-500':  variant === 'danger',
            'bg-info-500':    variant === 'info',
            'bg-primary-500': variant === 'primary',
            'bg-neutral-400': variant === 'neutral',
          })}
          aria-hidden="true"
        />
      )}
      {icon && <span className="inline-flex">{icon}</span>}
      {children && <span>{children}</span>}
    </span>
  );
}

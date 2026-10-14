/**
 * ProgressBar — Thanh tiến độ cho phase/milestone
 *
 * Variants: primary | success | warning | danger
 *
 * @example
 *   <ProgressBar value={75} variant="primary" label="Phase 3" />
 */
import { cn } from '../../utils/cn';

const COLOR_CLASSES = {
  primary: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger:  'bg-danger-600',
  accent:  'bg-accent-500',
};

export default function ProgressBar({
  value,                // 0 - 100
  variant = 'primary',
  label,
  showValue = true,
  className,
  barClassName,
}) {
  const safeValue = Math.min(100, Math.max(0, value || 0));

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-caption font-medium text-neutral-700 truncate">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-caption font-semibold text-neutral-900">
              {Math.round(safeValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-2 bg-neutral-100 rounded-pill overflow-hidden"
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Tiến độ'}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-all duration-500 ease-out',
            COLOR_CLASSES[variant],
            barClassName
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

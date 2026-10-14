/**
 * MiniStat — Stat thu nhỏ cho dashboard sub-row (compact)
 *
 * Khác StatCard: nhỏ hơn, không có icon box riêng, không có shadow-card.
 * Dùng trong panel "Hôm nay" / "Tuần này" của Dashboard.
 *
 * @example
 *   <MiniStat label="Đơn hàng" value="23" icon={<ShoppingCart className="w-4 h-4"/>} color="primary" delta="+5" />
 */
import { cn } from '../../utils/cn';

const COLOR_CLASSES = {
  primary: 'text-primary-600 bg-primary-50',
  success: 'text-success-600 bg-success-50',
  warning: 'text-warning-600 bg-warning-50',
  danger:  'text-danger-600  bg-danger-50',
  info:    'text-info-600    bg-info-50',
};

export default function MiniStat({
  label,
  value,
  icon,
  delta,        // string: "+12", "-3"
  deltaTone,    // 'up' | 'down' | undefined
  color = 'primary',
  className,
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-btn hover:bg-neutral-50 transition-colors',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-card flex items-center justify-center flex-shrink-0',
            COLOR_CLASSES[color]
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-caption text-neutral-500 truncate">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-h3 text-neutral-900 font-semibold truncate">{value}</p>
          {delta && (
            <span
              className={cn(
                'text-caption font-medium',
                deltaTone === 'up' && 'text-success-600',
                deltaTone === 'down' && 'text-danger-600',
                !deltaTone && 'text-neutral-500'
              )}
            >
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

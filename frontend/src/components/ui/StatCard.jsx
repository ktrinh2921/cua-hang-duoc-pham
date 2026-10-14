/**
 * StatCard — Thẻ thống kê cho Dashboard
 *
 * @example
 *   <StatCard
 *     icon={<DollarSign/>}
 *     label="Doanh thu hôm nay"
 *     value="2.450.000 ₫"
 *     trend={{ value: 12.5, label: 'so với hôm qua' }}
 *     color="primary"
 *   />
 */
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { renderIcon } from '../../utils/renderIcon';

const COLOR_CLASSES = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger:  'bg-danger-50  text-danger-600',
  info:    'bg-info-50    text-info-600',
};

export default function StatCard({
  icon,
  label,
  value,
  trend, // { value: number, label: string } — số dương = tăng, âm = giảm
  color = 'primary',
  className,
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-card border border-neutral-200/60 p-6',
        'transition-shadow duration-150 hover:shadow-card-hover',
        // Chiều cao đồng đều giữa các card trong cùng 1 hàng grid
        'h-full min-h-[120px] flex flex-col',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-11 h-11 rounded-card flex items-center justify-center',
            COLOR_CLASSES[color]
          )}
          aria-hidden="true"
        >
          {renderIcon(icon)}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-caption font-medium px-2 py-0.5 rounded-pill',
              trend.value >= 0
                ? 'bg-success-50 text-success-700'
                : 'bg-danger-50 text-danger-700'
            )}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-caption text-neutral-500 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-h2 text-neutral-900 font-semibold">{value}</p>
        {trend?.label && <p className="mt-1 text-caption text-neutral-500">{trend.label}</p>}
      </div>
    </div>
  );
}

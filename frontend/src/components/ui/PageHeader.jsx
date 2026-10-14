/**
 * PageHeader — Tiêu đề trang thống nhất (icon + title + subtitle + actions)
 *
 * @example
 *   <PageHeader icon={<Pill/>} title="Quản lý thuốc" subtitle="Tổng 120 thuốc">
 *     <Button icon={<Plus/>} onClick={openCreate}>Thêm thuốc</Button>
 *   </PageHeader>
 */
import { cn } from '../../utils/cn';
import { renderIcon } from '../../utils/renderIcon';

export default function PageHeader({ icon, title, subtitle, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className={cn(
              'flex-shrink-0 w-11 h-11 rounded-card',
              'bg-primary-50 text-primary-600',
              'flex items-center justify-center'
            )}
            aria-hidden="true"
          >
            {renderIcon(icon)}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-h1 text-neutral-900 truncate">{title}</h1>
          {subtitle && <p className="mt-1 text-caption text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

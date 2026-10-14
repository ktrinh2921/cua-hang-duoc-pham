/**
 * EmptyState — Khi danh sách rỗng
 *
 * @example
 *   <EmptyState icon={<Package/>} title="Chưa có thuốc" description="Thêm thuốc đầu tiên" />
 */
import { Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function EmptyState({
  icon,
  title = 'Không có dữ liệu',
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mb-4',
          'bg-neutral-100 text-neutral-400'
        )}
        aria-hidden="true"
      >
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-h3 text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-body text-neutral-500 max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}

/**
 * LoadingState — Spinner + label, dùng khi đang fetch data
 */
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function LoadingState({ label = 'Đang tải...', className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center py-16 gap-3',
        className
      )}
    >
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" aria-hidden="true" />
      <span className="text-caption text-neutral-500">{label}</span>
    </div>
  );
}

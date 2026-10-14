/**
 * Card — Khung nội dung chuẩn hoá
 *
 * @example
 *   <Card title="Tồn kho" actions={<Button>...</Button>}>
 *     Nội dung...
 *   </Card>
 *
 *   <Card hoverable title="Liên kết" onClick={...}>
 *     Click me
 *   </Card>
 */
import { cn } from '../../utils/cn';

export default function Card({
  title,
  subtitle,
  actions,
  padding = true,
  hoverable = false,
  className,
  children,
  onClick,
  ...rest
}) {
  const isInteractive = hoverable || !!onClick;

  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-card border border-neutral-200/60 overflow-hidden',
        isInteractive && 'cursor-pointer transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-200">
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-h3 text-neutral-900 truncate">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-caption text-neutral-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={cn(padding && 'p-6')}>{children}</div>
    </div>
  );
}

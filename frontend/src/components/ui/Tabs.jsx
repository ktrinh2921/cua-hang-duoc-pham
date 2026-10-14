/**
 * Tabs - Simple accessible tabs component
 *
 * @example
 *   const [tab, setTab] = useState('kho');
 *   <Tabs
 *     activeKey={tab}
 *     onChange={setTab}
 *     items={[
 *       { key: 'kho', label: 'Kho', icon: <Warehouse/> },
 *       { key: 'hoadon', label: 'Hóa đơn', icon: <Receipt/> },
 *     ]}
 *   />
 */
import { cn } from '../../utils/cn';

export default function Tabs({
  activeKey,
  onChange,
  items = [],
  variant = 'underline', // 'underline' | 'pills'
  className,
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'flex flex-wrap items-center gap-1',
        variant === 'underline'
          ? 'border-b border-neutral-200'
          : 'rounded-card bg-neutral-100 p-1',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const disabled = !!item.disabled;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.key}`}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange?.(item.key)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-body font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              variant === 'underline'
                ? cn(
                    'border-b-2 -mb-px rounded-none',
                    isActive
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                  )
                : cn(
                    'rounded-btn',
                    isActive
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  )
            )}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-caption font-bold rounded-pill',
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-700'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

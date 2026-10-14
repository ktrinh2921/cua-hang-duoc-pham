/**
 * RadioGroup — Nhóm radio button dùng cho enum ngắn (giới tính, vai trò...)
 */
import { cn } from '../../utils/cn';

export default function RadioGroup({
  name,
  label,
  required = false,
  value,
  onChange,
  options = [],
  error,
  className,
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-body font-medium text-neutral-700 mb-2">
          {label}
          {required && <span className="text-danger-600 ml-0.5">*</span>}
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const checked = String(value) === String(opt.value);
          return (
            <label
              key={opt.value}
              className={cn(
                'inline-flex items-center gap-2 px-3 h-10 rounded-btn border cursor-pointer select-none',
                'transition-colors duration-150',
                checked
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
                'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  checked ? 'border-primary-600' : 'border-neutral-400'
                )}
              >
                {checked && <span className="w-2 h-2 rounded-full bg-primary-600" />}
              </span>
              <span className="text-body">{opt.label}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="mt-1 text-caption text-danger-600">{error}</p>}
    </div>
  );
}

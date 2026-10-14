/**
 * Select — Dropdown đơn dùng native <select> + style chuẩn
 * (Dùng Listbox của Headless UI khi cần custom render option phức tạp)
 */
import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    required = false,
    disabled = false,
    options = [],
    placeholder = '-- Chọn --',
    className,
    selectClassName,
    id,
    onChange,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;

  // Native <select> onChange truyền event; ta unwrap thành raw value để các
  // caller dùng được `onChange={(v) => setX(v)}` thay vì phải tự .target.value.
  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-body font-medium text-neutral-700 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-600 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          onChange={handleChange}
          className={cn(
            'w-full h-10 pl-3 pr-10 text-body text-neutral-900 bg-white',
            'border rounded-btn appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-colors duration-150',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
              : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20',
            disabled && 'bg-neutral-50 text-neutral-500 cursor-not-allowed',
            selectClassName
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {error && <p className="mt-1 text-caption text-danger-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-caption text-neutral-500">{hint}</p>}
    </div>
  );
});

export default Select;

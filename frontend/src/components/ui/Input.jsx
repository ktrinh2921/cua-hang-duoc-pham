/**
 * Input — Ô nhập liệu có label, icon, error, hint
 *
 * @example
 *   <Input label="Tên thuốc" required icon={<Pill/>} value={...} onChange={...} />
 *   <Input label="Giá" type="number" error="Giá phải ≥ 0" />
 */
import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { renderIcon } from '../../utils/renderIcon';

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    icon,
    iconRight,
    required = false,
    disabled = false,
    className,
    inputClassName,
    id,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-body font-medium text-neutral-700 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-600 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {renderIcon(icon, 18)}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full h-10 px-3 text-body text-neutral-900 bg-white',
            'border rounded-btn transition-colors duration-150',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            icon && 'pl-10',
            iconRight && 'pr-10',
            error
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
              : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20',
            disabled && 'bg-neutral-50 text-neutral-500 cursor-not-allowed',
            inputClassName
          )}
          {...rest}
        />

        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {renderIcon(iconRight, 18)}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-caption text-danger-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-caption text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;

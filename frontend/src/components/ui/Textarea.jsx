/**
 * Textarea — Ô nhập văn bản nhiều dòng
 */
import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea(
  { label, hint, error, required = false, rows = 3, className, id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-body font-medium text-neutral-700 mb-1.5">
          {label}
          {required && <span className="text-danger-600 ml-0.5">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full px-3 py-2 text-body text-neutral-900 bg-white',
          'border rounded-btn resize-y',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'transition-colors duration-150',
          error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
        )}
        {...rest}
      />

      {error && <p id={`${inputId}-error`} className="mt-1 text-caption text-danger-600">{error}</p>}
      {!error && hint && <p id={`${inputId}-hint`} className="mt-1 text-caption text-neutral-600">{hint}</p>}
    </div>
  );
});

export default Textarea;

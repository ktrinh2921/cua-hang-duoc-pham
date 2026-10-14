/**
 * Button — Nút bấm dùng chung toàn app
 *
 * Variants: primary | success | secondary | danger | ghost | outline
 * Sizes:    sm | md | lg
 *
 * @example
 *   <Button variant="primary" icon={<Plus/>} onClick={openCreate}>Thêm</Button>
 *   <Button variant="danger" size="sm" loading>Đang xóa...</Button>
 */
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANT_CLASSES = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 shadow-sm disabled:bg-primary-300',
  success:
    'bg-success-600 text-white hover:bg-success-700 active:bg-success-700 shadow-sm disabled:bg-success-300',
  secondary:
    'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 shadow-sm disabled:bg-danger-300',
  ghost:
    'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400',
  outline:
    'bg-transparent text-primary-700 border border-primary-300 hover:bg-primary-50 active:bg-primary-100',
};

const SIZE_CLASSES = {
  sm: 'h-9 px-3 text-body gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        // Base
        'inline-flex cursor-pointer items-center justify-center font-medium rounded-btn whitespace-nowrap',
        'transition-colors duration-150 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed',
        // Variants & sizes
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : icon ? (
        <span className="inline-flex" aria-hidden="true">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="inline-flex" aria-hidden="true">{iconRight}</span>}
    </button>
  );
}

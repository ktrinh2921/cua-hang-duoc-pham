/**
 * cn() - Class name utility
 * Gộp class có điều kiện, falsy value tự bị loại bỏ.
 * Thay thế pattern `clsx('a', condition && 'b')` dài dòng.
 *
 * @example
 *   cn('btn', isPrimary && 'btn-primary', className)
 */
import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

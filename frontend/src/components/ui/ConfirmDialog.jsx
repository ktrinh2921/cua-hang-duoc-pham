/**
 * ConfirmDialog — Hộp thoại xác nhận (thay thế window.confirm)
 *
 * @example
 *   <ConfirmDialog
 *     open={confirmId !== null}
 *     onClose={() => setConfirmId(null)}
 *     onConfirm={() => handleDelete(confirmId)}
 *     title="Xóa thuốc"
 *     message="Bạn có chắc chắn muốn xóa thuốc Paracetamol?"
 *     variant="danger"
 *     confirmLabel="Xóa"
 *     loading={deleting}
 *   />
 */
import { AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false,
}) {
  const Icon = variant === 'danger' ? AlertTriangle : Info;
  const iconBg =
    variant === 'danger'
      ? 'bg-danger-50 text-danger-600'
      : variant === 'warning'
      ? 'bg-warning-50 text-warning-600'
      : 'bg-info-50 text-info-600';

  return (
    <Modal open={open} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-h3 text-neutral-900">{title}</h3>
          {message && <p className="mt-2 text-body text-neutral-600">{message}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

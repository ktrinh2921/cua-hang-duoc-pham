/**
 * AdjustLotStockModal - Modal điều chỉnh tồn kho của một lô sau kiểm kê
 *
 * Nghiệp vụ:
 *  - Sau kiểm kê, thực tế có thể chênh so với hệ thống (thất thoát, hư hỏng, nhập dư…)
 *  - User nhập số lượng THỰC TẾ mới + lý do (bắt buộc, 3-500 ký tự theo rule BE)
 *  - BE chạy transaction SERIALIZABLE + ghi log vào bảng DieuChinhTonKho
 *
 * Props:
 *  - open: boolean
 *  - onClose(): void
 *  - onSuccess(updatedLot): callback sau khi điều chỉnh thành công
 *  - lot: { MaLo, MaThuoc, TenThuoc, SoLuongTonKho, SoLuongNhap, HanSD, GiaNhap }
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, X, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import ExpiryBadge from './ExpiryBadge';
import { formatCurrency } from '../../utils/format';
import khoService from '../../services/khoService';

const MIN_LYDO = 3;
const MAX_LYDO = 500;

export default function AdjustLotStockModal({ open, onClose, onSuccess, lot }) {
  const [soLuongMoi, setSoLuongMoi] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset khi mở/đóng modal
  useEffect(() => {
    if (open && lot) {
      // Đợi 1 tick để đảm bảo parent đã truyền lot đầy đủ
      setSoLuongMoi(String(Number(lot.SoLuongTonKho) || 0));
      setLyDo('');
      setError('');
    }
  }, [open, lot]);

  if (!lot) return null;

  const current = Number(lot.SoLuongTonKho) || 0;
  const nextRaw = soLuongMoi === '' ? NaN : Number(soLuongMoi);
  const next = Number.isFinite(nextRaw) ? nextRaw : NaN;
  const chenhlech = Number.isFinite(next) ? next - current : NaN;

  const validNumber =
    Number.isInteger(next) && next >= 0 && next <= 1_000_000_000;
  const validLyDo = lyDo.trim().length >= MIN_LYDO && lyDo.trim().length <= MAX_LYDO;
  const changed = validNumber && next !== current;
  const canSubmit = validNumber && validLyDo && changed && !submitting;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await khoService.adjustLotStock(lot.MaLo, {
        soLuongMoi: next,
        lyDo: lyDo.trim(),
      });
      toast.success(
        `Đã điều chỉnh lô #${lot.MaLo}: ${current} → ${next} (${chenhlech > 0 ? '+' : ''}${chenhlech})`
      );
      onSuccess?.(res.data);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Điều chỉnh tồn kho thất bại';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Điều chỉnh tồn kho (Kiểm kê)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Thông tin lô */}
        <div className="p-4 bg-neutral-50 rounded-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-neutral-500">Mã lô</p>
              <p className="font-mono text-body font-semibold text-neutral-900">
                #{lot.MaLo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-caption text-neutral-500">Hạn sử dụng</p>
              <ExpiryBadge expiryDate={lot.HanSD} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
            <div>
              <p className="text-caption text-neutral-500">Thuốc</p>
              <p className="text-body font-medium text-neutral-900">{lot.TenThuoc}</p>
            </div>
            <div>
              <p className="text-caption text-neutral-500">Giá nhập</p>
              <p className="text-body font-mono text-neutral-700">
                {formatCurrency(Number(lot.GiaNhap) || 0)}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-500">SL nhập ban đầu</p>
              <p className="text-body font-mono text-neutral-700">
                {lot.SoLuongNhap}
              </p>
            </div>
            <div>
              <p className="text-caption text-neutral-500">Tồn hiện tại (hệ thống)</p>
              <p className="text-body font-mono font-semibold text-primary-700">
                {current}
              </p>
            </div>
          </div>
        </div>

        {/* Form điều chỉnh */}
        <Input
          label="Số lượng thực tế sau kiểm kê"
          required
          type="number"
          min={0}
          max={1000000000}
          step={1}
          value={soLuongMoi}
          onChange={(e) => setSoLuongMoi(e.target.value)}
          hint={
            changed
              ? `Chênh lệch: ${chenhlech > 0 ? '+' : ''}${chenhlech} (${chenhLechLabel(chenhlech)})`
              : Number.isFinite(next)
                ? 'Số lượng mới trùng với tồn hiện tại — không có thay đổi'
                : 'Nhập số lượng mới (khác tồn hiện tại)'
          }
          error={
            soLuongMoi !== '' && !validNumber
              ? 'Số lượng phải là số nguyên từ 0 đến 1.000.000.000'
              : ''
          }
        />

        <Textarea
          label="Lý do điều chỉnh"
          required
          rows={3}
          value={lyDo}
          onChange={(e) => setLyDo(e.target.value)}
          placeholder="VD: Thất thoát do vỡ lọ khi vận chuyển / phát hiện hàng hư hỏng / kiểm kê cuối kỳ..."
          hint={`${lyDo.trim().length}/${MAX_LYDO} ký tự — tối thiểu ${MIN_LYDO}`}
          error={
            lyDo && !validLyDo
              ? `Lý do phải có từ ${MIN_LYDO} đến ${MAX_LYDO} ký tự`
              : ''
          }
        />

        {/* Cảnh báo */}
        <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded-card">
          <AlertTriangle className="w-4 h-4 text-warning-700 flex-shrink-0 mt-0.5" />
          <p className="text-caption text-warning-800">
            Hành động này sẽ được <strong>ghi vào lịch sử kiểm kê</strong> và{' '}
            <strong>không thể hoàn tác</strong>. Số lượng nhập ban đầu sẽ giữ nguyên để
            bảo toàn chứng từ gốc.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-card">
            <p className="text-caption text-danger-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            icon={<X />}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            loading={submitting}
            icon={<Save />}
          >
            Xác nhận điều chỉnh
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function chenhLechLabel(delta) {
  if (delta === 0) return 'không đổi';
  if (delta > 0) return 'tăng';
  return 'giảm';
}
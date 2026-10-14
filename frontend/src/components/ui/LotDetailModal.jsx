/**
 * LotDetailModal - Drill-down lô của 1 thuốc
 *
 * Hiển thị:
 *  1. Header: tên thuốc + tổng tồn + tổng số lô
 *  2. Bảng các lô còn hàng theo FIFO (lô cũ nhất - HSD sớm nhất - lên đầu)
 *     - Mỗi lô có nút "Điều chỉnh" (chỉ Admin/NV_Kho) → mở AdjustLotStockModal
 *  3. Lịch sử điều chỉnh tồn (gần nhất) — audit trail minh bạch
 *
 * Props:
 *  - open: boolean
 *  - onClose(): void
 *  - thuoc: { MaThuoc, TenThuoc, TenDM, GiaBanThamKhao } — null nghĩa là chưa chọn
 *  - onAdjusted(): callback khi một lô được điều chỉnh thành công (vd: refresh parent)
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Warehouse,
  Package,
  Edit3,
  History,
  RefreshCw,
  Truck,
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Table from './Table';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import Badge from './Badge';
import StockBadge from './StockBadge';
import ExpiryBadge from './ExpiryBadge';
import RoleGuard from './RoleGuard';
import AdjustLotStockModal from './AdjustLotStockModal';
import { formatCurrency } from '../../utils/format';
import khoService from '../../services/khoService';

export default function LotDetailModal({ open, onClose, thuoc, onAdjusted }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [tonKho, setTonKho] = useState(0);
  const [adjustments, setAdjustments] = useState([]);

  const [adjustTarget, setAdjustTarget] = useState(null);

  const fetchData = async (maThuoc) => {
    if (!maThuoc) return;
    setLoading(true);
    try {
      const res = await khoService.getLoByThuoc(maThuoc);
      setItems(res.data?.items || []);
      setTonKho(Number(res.data?.tonKho) || 0);
      setAdjustments(res.data?.adjustments || []);
    } catch {
      toast.error('Không thể tải danh sách lô');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && thuoc?.MaThuoc) {
      fetchData(thuoc.MaThuoc);
    }
    if (!open) {
      // reset khi đóng
      setItems([]);
      setTonKho(0);
      setAdjustments([]);
      setAdjustTarget(null);
    }
  }, [open, thuoc?.MaThuoc]);

  const handleAdjusted = async (updated) => {
    toast.success('Đã cập nhật lịch sử điều chỉnh');
    setAdjustTarget(null);
    // refresh lại list để cập nhật tồn
    if (thuoc?.MaThuoc) await fetchData(thuoc.MaThuoc);
    onAdjusted?.(updated);
  };

  const lotColumns = [
    {
      key: 'malo',
      label: 'Mã lô',
      width: '90px',
      render: (l) => <span className="font-mono text-neutral-500">#{l.MaLo}</span>,
    },
    {
      key: 'ngaynhap',
      label: 'Ngày nhập',
      width: '120px',
      render: (l) => (
        <span className="text-caption text-neutral-700">
          {l.NgayNhap ? dayjs(l.NgayNhap).format('DD/MM/YYYY') : '—'}
        </span>
      ),
    },
    {
      key: 'ncc',
      label: 'Nhà cung cấp',
      render: (l) => (
        <span className="text-body text-neutral-700">{l.TenNCC || '—'}</span>
      ),
    },
    {
      key: 'slnhap',
      label: 'SL nhập',
      width: '90px',
      align: 'right',
      render: (l) => (
        <span className="font-mono text-neutral-700">{l.SoLuongNhap}</span>
      ),
    },
    {
      key: 'sltk',
      label: 'Tồn',
      width: '110px',
      align: 'center',
      render: (l) => <StockBadge stock={l.SoLuongTonKho} />,
    },
    {
      key: 'hsd',
      label: 'HSD',
      width: '150px',
      align: 'center',
      render: (l) => (
        <div className="flex flex-col items-center gap-0.5">
          <ExpiryBadge expiryDate={l.HanSD} />
          {typeof l.SoNgayConLai === 'number' && (
            <span className="text-caption text-neutral-400">
              {l.SoNgayConLai} ngày
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'gianhap',
      label: 'Giá nhập',
      width: '130px',
      align: 'right',
      render: (l) => (
        <span className="font-mono text-neutral-700">
          {formatCurrency(Number(l.GiaNhap) || 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '130px',
      align: 'right',
      render: (l) => (
        <RoleGuard roles={['Admin', 'NV_Kho']}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => setAdjustTarget(l)}
          >
            Điều chỉnh
          </Button>
        </RoleGuard>
      ),
    },
  ];

  const adjColumns = [
    {
      key: 'ngay',
      label: 'Thời điểm',
      width: '160px',
      render: (a) => (
        <span className="text-caption text-neutral-700">
          {dayjs(a.CreatedAt).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      key: 'malo',
      label: 'Lô',
      width: '90px',
      render: (a) => <span className="font-mono text-neutral-500">#{a.MaLo}</span>,
    },
    {
      key: 'thaydoi',
      label: 'Trước → Sau',
      width: '180px',
      render: (a) => (
        <span className="font-mono text-neutral-700">
          {a.SoLuongTruoc} → {a.SoLuongSau}{' '}
          <Badge
            variant={a.ChenhLech > 0 ? 'success' : a.ChenhLech < 0 ? 'danger' : 'neutral'}
            size="sm"
          >
            {a.ChenhLech > 0 ? '+' : ''}
            {a.ChenhLech}
          </Badge>
        </span>
      ),
    },
    {
      key: 'lydo',
      label: 'Lý do',
      render: (a) => (
        <span className="text-body text-neutral-700 line-clamp-2" title={a.LyDo}>
          {a.LyDo}
        </span>
      ),
    },
    {
      key: 'nv',
      label: 'Người thực hiện',
      width: '160px',
      render: (a) => (
        <span className="text-body text-neutral-700">{a.TenNV || `NV #${a.MaNV}`}</span>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open && !adjustTarget}
        onClose={onClose}
        size="2xl"
        title={
          thuoc ? (
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" />
              Lô thuốc — {thuoc.TenThuoc}
            </span>
          ) : (
            'Lô thuốc'
          )
        }
        description={
          thuoc && (
            <span>
              {thuoc.TenDM ? `${thuoc.TenDM} · ` : ''}
              Tồn: <strong>{tonKho}</strong> · Số lô: <strong>{items.length}</strong>
            </span>
          )
        }
      >
        {loading ? (
          <LoadingState label="Đang tải danh sách lô..." />
        ) : !thuoc ? null : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-primary-50 rounded-card">
                <p className="text-caption text-neutral-500">Tổng tồn</p>
                <p className="text-h3 font-bold text-primary-700">{tonKho}</p>
              </div>
              <div className="p-3 bg-info-50 rounded-card">
                <p className="text-caption text-neutral-500">Số lô còn hàng</p>
                <p className="text-h3 font-bold text-info-700">{items.length}</p>
              </div>
              <div className="p-3 bg-accent-50 rounded-card">
                <p className="text-caption text-neutral-500">Giá bán tham khảo</p>
                <p className="text-h3 font-bold text-accent-700">
                  {formatCurrency(Number(thuoc.GiaBanThamKhao) || 0)}
                </p>
              </div>
            </div>

            {/* Lots FIFO */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-h3 text-neutral-900 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-primary-600" />
                  Danh sách lô (FIFO — lô cũ trước)
                </h4>
                <RoleGuard roles={['Admin', 'NV_Kho']}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => fetchData(thuoc.MaThuoc)}
                  >
                    Làm mới
                  </Button>
                </RoleGuard>
              </div>

              {items.length === 0 ? (
                <EmptyState
                  icon={<Package />}
                  title="Chưa có lô nào"
                  description="Thuốc này hiện chưa có lô còn hàng hợp lệ"
                />
              ) : (
                <Table
                  columns={lotColumns}
                  data={items}
                  rowKey="MaLo"
                  striped
                />
              )}
            </div>

            {/* Adjustment history */}
            {adjustments.length > 0 && (
              <div>
                <h4 className="text-h3 text-neutral-900 flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-warning-600" />
                  Lịch sử điều chỉnh tồn ({adjustments.length})
                </h4>
                <Table
                  columns={adjColumns}
                  data={adjustments}
                  rowKey="MaDieuChinh"
                />
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-info-50 border border-info-200 rounded-card">
              <Truck className="w-4 h-4 text-info-700 flex-shrink-0 mt-0.5" />
              <p className="text-caption text-info-800">
                FIFO: Khi bán hàng, hệ thống xuất lô theo thứ tự <strong>HSD sớm nhất</strong>{' '}
                trước để tránh thuốc hết hạn. Nếu lô có <strong>số lượng thực tế</strong> chênh
                so với hệ thống, dùng chức năng <strong>Điều chỉnh</strong> để ghi nhận kiểm kê.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <AdjustLotStockModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSuccess={handleAdjusted}
        lot={adjustTarget}
      />
    </>
  );
}
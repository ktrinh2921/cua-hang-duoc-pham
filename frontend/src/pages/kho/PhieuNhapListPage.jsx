/**
 * PhieuNhapListPage - Danh sách phiếu nhập + xem chi tiết
 *
 * - Table với pagination + search
 * - Click row → mở Modal chi tiết (kèm các lô)
 * - Có nút "Hủy" cho phiếu DaNhap (chưa bán)
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Truck, Plus, Eye, Ban, Package } from 'lucide-react';
import phieuNhapService from '../../services/phieuNhapService';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RoleGuard from '../../components/ui/RoleGuard';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

const STATUS_VARIANT = {
  DaNhap: 'success',
  ChoDuyet: 'warning',
  Huy: 'danger',
};

const STATUS_LABEL = {
  DaNhap: 'Đã nhập',
  ChoDuyet: 'Chờ duyệt',
  Huy: 'Đã hủy',
};

function PhieuNhapListPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal chi tiet
  const [viewItem, setViewItem] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Cancel
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await phieuNhapService.getAll({
        keyword: search,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(res.data?.items || []);
      setPagination(
        res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 }
      );
    } catch {
      toast.error('Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (it) => {
    setViewItem(null);
    setViewLoading(true);
    try {
      const res = await phieuNhapService.getById(it.MaPN);
      setViewItem(res.data);
    } catch {
      toast.error('Không thể tải chi tiết phiếu nhập');
      setViewItem(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeDetail = () => setViewItem(null);

  const handleCancel = async () => {
    if (!confirmCancelId) return;
    setCancelling(true);
    try {
      await phieuNhapService.cancel(confirmCancelId);
      toast.success('Đã hủy phiếu nhập');
      setConfirmCancelId(null);
      fetchData(pagination.page);
      if (viewItem?.MaPN === confirmCancelId) {
        // Refresh detail modal
        openDetail({ MaPN: confirmCancelId });
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Không thể hủy phiếu nhập';
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Mã PN',
      width: '80px',
      render: (it) => <span className="font-mono text-neutral-500">#{it.MaPN}</span>,
    },
    {
      key: 'date',
      label: 'Ngày nhập',
      width: '140px',
      render: (it) => (
        <span className="text-body text-neutral-700">
          {it.NgayNhap ? dayjs(it.NgayNhap).format('DD/MM/YYYY HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'supplier',
      label: 'Nhà cung cấp',
      render: (it) => <span className="text-neutral-700">{it.TenNCC || '—'}</span>,
    },
    {
      key: 'createdBy',
      label: 'Người nhập',
      render: (it) => <span className="text-neutral-700">{it.TenNV || '—'}</span>,
    },
    {
      key: 'lots',
      label: 'Số lô',
      width: '80px',
      align: 'center',
      render: (it) => <span className="text-body text-neutral-700">{it.SoLo}</span>,
    },
    {
      key: 'total',
      label: 'Tổng tiền',
      width: '140px',
      align: 'right',
      render: (it) => (
        <span className="font-medium text-neutral-900 font-mono">
          {formatCurrency(Number(it.TongTien) || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '120px',
      align: 'center',
      render: (it) => (
        <Badge variant={STATUS_VARIANT[it.TrangThai] || 'neutral'}>
          {STATUS_LABEL[it.TrangThai] || it.TrangThai}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '110px',
      align: 'right',
      render: (it) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(it);
            }}
            className="p-1.5 rounded-btn text-info-600 hover:bg-info-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            title="Xem chi tiết"
            aria-label="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          {it.TrangThai === 'DaNhap' && (
            <RoleGuard roles={['Admin', 'NV_Kho']}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmCancelId(it.MaPN);
                }}
                className="p-1.5 rounded-btn text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                title="Hủy phiếu"
                aria-label="Hủy phiếu"
              >
                <Ban className="w-4 h-4" />
              </button>
            </RoleGuard>
          )}
        </div>
      ),
    },
  ];

  const cancellingItem = items.find((i) => i.MaPN === confirmCancelId);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Truck />}
        title="Phiếu nhập thuốc"
        subtitle={`Tổng ${pagination.total} phiếu nhập`}
        actions={
          <RoleGuard roles={['Admin', 'NV_Kho']}>
            <Link to="/kho/nhap">
              <Button variant="primary" icon={<Plus />}>
                Tạo phiếu nhập
              </Button>
            </Link>
          </RoleGuard>
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo NCC, mã phiếu hoặc người nhập..."
      />

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaPN"
        emptyTitle="Chưa có phiếu nhập nào"
        emptyDescription="Tạo phiếu nhập đầu tiên để bắt đầu"
        emptyIcon={<Truck />}
        onRowClick={(it) => openDetail(it)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />

      {/* Modal chi tiết */}
      <Modal
        open={!!viewItem || viewLoading}
        onClose={closeDetail}
        size="2xl"
        title={
          viewItem
            ? `Phiếu nhập #${viewItem.MaPN}`
            : viewLoading
              ? 'Đang tải...'
              : ''
        }
      >
        {viewLoading || !viewItem ? (
          <div className="flex items-center justify-center py-12 text-neutral-500">
            Đang tải chi tiết...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-card">
              <div>
                <p className="text-caption text-neutral-500">Nhà cung cấp</p>
                <p className="text-body font-medium text-neutral-900">{viewItem.TenNCC}</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Người nhập</p>
                <p className="text-body font-medium text-neutral-900">{viewItem.TenNV}</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Ngày nhập</p>
                <p className="text-body text-neutral-700">
                  {dayjs(viewItem.NgayNhap).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Trạng thái</p>
                <Badge variant={STATUS_VARIANT[viewItem.TrangThai] || 'neutral'}>
                  {STATUS_LABEL[viewItem.TrangThai] || viewItem.TrangThai}
                </Badge>
              </div>
            </div>

            {/* Bảng lô */}
            <div className="border border-neutral-200 rounded-card overflow-hidden">
              <table className="w-full text-body">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">
                      Thuốc
                    </th>
                    <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">
                      Danh mục
                    </th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">
                      SL nhập
                    </th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">
                      SL tồn
                    </th>
                    <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">
                      NSX
                    </th>
                    <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">
                      HSD
                    </th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">
                      Giá nhập
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {viewItem.ChiTiet?.map((l) => (
                    <tr key={l.MaLo} className="hover:bg-neutral-50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-neutral-400" />
                          <span className="font-medium text-neutral-900">{l.TenThuoc}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-neutral-700">{l.TenDM || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-neutral-700">
                        {l.SoLuongNhap}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        <span
                          className={
                            l.SoLuongTonKho < l.SoLuongNhap
                              ? 'text-warning-700 font-semibold'
                              : 'text-neutral-700'
                          }
                        >
                          {l.SoLuongTonKho}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-caption text-neutral-700">
                        {dayjs(l.NgaySX).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <ExpiryBadge expiryDate={l.HanSD} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-neutral-700">
                        {formatCurrency(Number(l.GiaNhap) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold text-neutral-700">
                      Tổng:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900 font-mono">
                      {formatCurrency(Number(viewItem.TongTien) || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action */}
            {viewItem.TrangThai === 'DaNhap' && (
              <RoleGuard roles={['Admin', 'NV_Kho']}>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="danger"
                    icon={<Ban />}
                    onClick={() => setConfirmCancelId(viewItem.MaPN)}
                  >
                    Hủy phiếu nhập
                  </Button>
                </div>
              </RoleGuard>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Hủy phiếu nhập"
        message={
          cancellingItem
            ? `Bạn có chắc muốn hủy phiếu nhập #${cancellingItem.MaPN}? Lô thuốc sẽ không còn được tính vào tồn kho.`
            : ''
        }
        confirmLabel="Hủy phiếu"
      />
    </div>
  );
}

export default PhieuNhapListPage;

/**
 * HoaDonListPage - Danh sach hoa don
 *
 * Table: MaHD, Ngay, Khach hang, NV, Tong tien, Trang thai
 * Filter: date range, keyword
 * Click row → detail modal
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Receipt, Eye, Ban, Printer, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import banHangService from '../../services/banHangService';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RoleGuard from '../../components/ui/RoleGuard';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { downloadInvoiceHtml, printInvoice } from './invoiceDocument';
import { exportInvoicePdf } from './invoicePdf';

const STATUS_VARIANT = { DaThanhToan: 'success', DaHuy: 'danger' };
const STATUS_LABEL = { DaThanhToan: 'Đã thanh toán', DaHuy: 'Đã hủy' };

function HoaDonListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  // Redirect NV_Kho — không có quyền xem hóa đơn
  useEffect(() => {
    if (hasRole('NV_Kho')) {
      navigate('/forbidden', { replace: true });
    }
  }, [hasRole, navigate]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal chi tiet
  const [viewItem, setViewItem] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Huy
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fromDate, toDate]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await banHangService.getAll({
        keyword: search, page, limit: DEFAULT_PAGE_SIZE,
        from: fromDate || undefined, to: toDate || undefined,
      });
      setItems(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
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
      const res = await banHangService.getById(it.MaHD);
      setViewItem(res.data);
    } catch {
      toast.error('Không thể tải chi tiết');
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    const viewId = Number(location.state?.viewId);
    if (!Number.isInteger(viewId) || viewId <= 0) return;
    openDetail({ MaHD: viewId });
    navigate('/hoa-don', { replace: true, state: null });
    // Chỉ xử lý state điều hướng một lần khi mở trang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!confirmCancelId) return;
    setCancelling(true);
    try {
      await banHangService.cancel(confirmCancelId);
      toast.success('Đã hủy hóa đơn');
      setConfirmCancelId(null);
      fetchData(pagination.page);
      if (viewItem?.MaHD === confirmCancelId) {
        const res = await banHangService.getById(confirmCancelId);
        setViewItem(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Không thể hủy');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    if (!printInvoice(viewItem)) {
      toast.error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up và thử lại.');
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (!viewItem || exportingPdf) return;
    setExportingPdf(true);
    const toastId = toast.loading('Đang tạo file PDF...');
    try {
      await exportInvoicePdf(viewItem);
      toast.success(`Đã tải hóa đơn #${viewItem.MaHD}.pdf`, { id: toastId });
    } catch {
      toast.error('Không thể tạo PDF, đã mở cửa sổ in thay thế.', { id: toastId });
    } finally {
      setExportingPdf(false);
    }
  };

  const columns = [
    {
      key: 'mhd',
      label: 'Mã HD',
      width: '80px',
      render: (it) => <span className="font-mono text-neutral-500">#{it.MaHD}</span>,
    },
    {
      key: 'date',
      label: 'Ngày',
      width: '150px',
      render: (it) => (
        <span className="text-body text-neutral-700">
          {it.NgayGioLap ? dayjs(it.NgayGioLap).format('DD/MM/YYYY HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'khach',
      label: 'Khách hàng',
      render: (it) => <span className="text-neutral-700">{it.TenKH || '—'}</span>,
    },
    {
      key: 'nv',
      label: 'Nhân viên',
      render: (it) => <span className="text-neutral-700">{it.TenNV || '—'}</span>,
    },
    {
      key: 'tong',
      label: 'Tổng tiền',
      width: '140px',
      align: 'right',
      render: (it) => (
        <span className="font-semibold text-neutral-900 font-mono">
          {formatCurrency(Number(it.TongTien) || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'TT',
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
      width: '80px',
      align: 'right',
      render: (it) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openDetail(it); }}
            className="p-1.5 rounded-btn text-info-600 hover:bg-info-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            title="Xem chi tiết"
            aria-label="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          {it.TrangThai === 'DaThanhToan' && (
            <RoleGuard roles={['Admin']}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmCancelId(it.MaHD); }}
                className="p-1.5 rounded-btn text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                title="Hủy hóa đơn"
                aria-label="Hủy hóa đơn"
              >
                <Ban className="w-4 h-4" />
              </button>
            </RoleGuard>
          )}
        </div>
      ),
    },
  ];

  const cancellingItem = items.find(i => i.MaHD === confirmCancelId);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Receipt />}
        title="Hóa đơn"
        subtitle={`Tổng ${pagination.total} hóa đơn`}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo mã, khách hàng, nhân viên..."
      >
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 px-3 text-body border border-neutral-300 rounded-btn focus:outline-none focus:border-primary-500"
            title="Từ ngày"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 px-3 text-body border border-neutral-300 rounded-btn focus:outline-none focus:border-primary-500"
            title="Đến ngày"
          />
        </div>
      </SearchBar>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaHD"
        emptyTitle="Chưa có hóa đơn nào"
        emptyDescription="Hóa đơn sẽ xuất hiện sau khi bán thuốc"
        emptyIcon={<Receipt />}
        onRowClick={(it) => openDetail(it)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />

      {/* Modal chi tiet */}
      <Modal
        open={!!viewItem || viewLoading}
        onClose={() => setViewItem(null)}
        size="2xl"
        title={viewItem ? `Hóa đơn #${viewItem.MaHD}` : viewLoading ? 'Đang tải...' : ''}
      >
        {viewLoading || !viewItem ? (
          <div className="text-center py-12 text-neutral-500">Đang tải chi tiết...</div>
        ) : (
          <div className="space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-card">
              <div>
                <p className="text-caption text-neutral-500">Ngày lập</p>
                <p className="text-body text-neutral-900">
                  {dayjs(viewItem.NgayGioLap).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Khách hàng</p>
                <p className="text-body font-medium text-neutral-900">{viewItem.TenKH || '—'}</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Nhân viên</p>
                <p className="text-body font-medium text-neutral-900">{viewItem.TenNV}</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Tiền khách đưa</p>
                <p className="text-body font-mono text-neutral-900">
                  {formatCurrency(Number(viewItem.TienKhachDua) || 0)}
                </p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Tiền thừa</p>
                <p className="text-body font-mono text-neutral-900">
                  {formatCurrency(Number(viewItem.TienTraLai) || 0)}
                </p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Giảm giá</p>
                <p className="text-body font-mono text-neutral-900">
                  {formatCurrency(Number(viewItem.GiamGia) || 0)}
                </p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Trạng thái</p>
                <Badge variant={STATUS_VARIANT[viewItem.TrangThai] || 'neutral'}>
                  {STATUS_LABEL[viewItem.TrangThai] || viewItem.TrangThai}
                </Badge>
              </div>
            </div>

            {/* Items table */}
            <div className="border border-neutral-200 rounded-card overflow-hidden">
              <table className="w-full text-body">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Thuốc</th>
                    <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">HSD</th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">SL</th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">Đơn giá</th>
                    <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {viewItem.ChiTiet?.map((r, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-neutral-900">{r.TenThuoc}</p>
                        <p className="text-caption text-neutral-500">{r.TenDM || r.MaThuoc}</p>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <ExpiryBadge expiryDate={r.HanSD} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{r.SoLuongBan}</td>
                      <td className="px-4 py-2 text-right font-mono text-neutral-700">
                        {formatCurrency(Number(r.GiaBanThucTe) || 0)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-neutral-900">
                        {formatCurrency(Number(r.ThanhTien) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-neutral-700">
                      TỔNG CỘNG:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-h3 text-primary-700 font-mono">
                      {formatCurrency(Number(viewItem.TongTien) || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4">
              <Button variant="secondary" icon={<Download />} onClick={() => downloadInvoiceHtml(viewItem)}>
                Tải HTML
              </Button>
              <Button variant="primary" icon={<Printer />} onClick={handlePrint}>
                In
              </Button>
              <Button
                variant="success"
                icon={<Download />}
                onClick={handleExportPdf}
                loading={exportingPdf}
              >
                {exportingPdf ? 'Đang tạo PDF...' : 'Tải PDF'}
              </Button>
              {viewItem.TrangThai === 'DaThanhToan' && (
                <RoleGuard roles={['Admin']}>
                  <Button
                    variant="danger"
                    icon={<Ban />}
                    onClick={() => setConfirmCancelId(viewItem.MaHD)}
                  >
                    Hủy hóa đơn
                  </Button>
                </RoleGuard>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Hủy hóa đơn"
        message={
          cancellingItem
            ? `Hủy hóa đơn #${cancellingItem.MaHD}? Tồn kho sẽ được hoàn lại.`
            : ''
        }
        confirmLabel="Hủy hóa đơn"
      />
    </div>
  );
}

export default HoaDonListPage;

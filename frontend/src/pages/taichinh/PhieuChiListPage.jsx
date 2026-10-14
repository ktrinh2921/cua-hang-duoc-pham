/**
 * PhieuChiListPage - Danh sách phiếu chi + Modal tạo phiếu chi (Admin)
 *
 * Features:
 *  - Bảng danh sách phiếu chi (MaPhieuChi, NgayLap, SoTien, NoiDung, NguoiLap)
 *  - Filter theo khoảng ngày + keyword
 *  - Modal tạo phiếu chi mới (validate số dư)
 *  - Hiển thị số dư realtime ở header
 */
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { History, Plus, Wallet, X } from 'lucide-react';
import phieuChiService from '../../services/phieuChiService';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/ui/LoadingState';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

function PhieuChiListPage() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Số dư
  const [soDu, setSoDu] = useState(null);

  // Modal tạo
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ soTien: '', noiDung: '' });
  const [submitting, setSubmitting] = useState(false);

  // Detail
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    fetchSoDu();
    fetchData(1);
    // Nếu navigate từ TaiChinhPage với state.openCreate=true → mở modal
    if (location.state?.openCreate) {
      setCreateForm({ soTien: '', noiDung: '' });
      setShowCreate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fromDate, toDate]);

  const fetchSoDu = async () => {
    try {
      const res = await phieuChiService.getSoDu();
      setSoDu(res.data);
    } catch { /* ignore */ }
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await phieuChiService.getAll({
        keyword: search, page, limit: DEFAULT_PAGE_SIZE,
        from: fromDate || undefined, to: toDate || undefined,
      });
      setItems(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
    } catch {
      toast.error('Không thể tải danh sách phiếu chi');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setCreateForm({ soTien: '', noiDung: '' });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    const soTien = Number(createForm.soTien);
    if (!soTien || soTien <= 0) { toast.error('Số tiền phải > 0'); return; }
    if (!createForm.noiDung.trim()) { toast.error('Vui lòng nhập nội dung'); return; }
    if (soDu && soTien > soDu.soDu) {
      toast.error(`Số tiền chi vượt quá số dư (${formatCurrency(soDu.soDu)})`);
      return;
    }

    setSubmitting(true);
    try {
      await phieuChiService.create({ soTien, noiDung: createForm.noiDung.trim() });
      toast.success(`Tạo phiếu chi ${formatCurrency(soTien)} thành công`);
      setShowCreate(false);
      fetchSoDu();
      fetchData(1);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Tạo phiếu chi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'mapc',
      label: 'Mã PC',
      width: '90px',
      render: (it) => <span className="font-mono text-neutral-500">#{it.MaPhieuChi}</span>,
    },
    {
      key: 'date',
      label: 'Ngày lập',
      width: '160px',
      render: (it) => (
        <span className="text-body text-neutral-700">
          {it.NgayLap ? dayjs(it.NgayLap).format('DD/MM/YYYY HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'noidung',
      label: 'Nội dung',
      render: (it) => <span className="text-neutral-700">{it.NoiDung}</span>,
    },
    {
      key: 'nv',
      label: 'Người lập',
      width: '180px',
      render: (it) => <span className="text-neutral-700">{it.TenNV || '—'}</span>,
    },
    {
      key: 'sotien',
      label: 'Số tiền',
      width: '160px',
      align: 'right',
      render: (it) => (
        <span className="font-semibold text-danger-700 font-mono">
          −{formatCurrency(Number(it.SoTien) || 0)}
        </span>
      ),
    },
  ];

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<History />}
        title="Phiếu chi"
        subtitle={`Tổng ${pagination.total} phiếu chi`}
        actions={
          <Button variant="primary" icon={<Plus />} onClick={openCreate}>
            Tạo phiếu chi
          </Button>
        }
      />

      {/* Số dư card */}
      {soDu && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-success-100 text-success-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-caption text-neutral-500">Tổng thu</p>
                <p className="text-body font-bold text-success-700 font-mono">
                  {formatCurrency(soDu.tongThu)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-danger-100 text-danger-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-caption text-neutral-500">Tổng chi</p>
                <p className="text-body font-bold text-danger-700 font-mono">
                  {formatCurrency(soDu.tongChi)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-card flex items-center justify-center ${
                soDu.soDu >= 0 ? 'bg-primary-100 text-primary-700' : 'bg-danger-100 text-danger-700'
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-caption text-neutral-500">Số dư quỹ</p>
                <p className={`text-body font-bold font-mono ${
                  soDu.soDu >= 0 ? 'text-primary-700' : 'text-danger-700'
                }`}>
                  {formatCurrency(soDu.soDu)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo mã, nội dung, người lập..."
      >
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate || todayStr}
            className="h-10 px-3 text-body border border-neutral-300 rounded-btn focus:outline-none focus:border-primary-500"
            title="Từ ngày"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
            max={todayStr}
            className="h-10 px-3 text-body border border-neutral-300 rounded-btn focus:outline-none focus:border-primary-500"
            title="Đến ngày"
          />
        </div>
      </SearchBar>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaPhieuChi"
        emptyTitle="Chưa có phiếu chi nào"
        emptyDescription="Tạo phiếu chi đầu tiên để bắt đầu"
        emptyIcon={<History />}
        onRowClick={(it) => setViewItem(it)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />

      {/* Modal tạo phiếu chi */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo phiếu chi"
        size="md"
      >
        <div className="space-y-4">
          {soDu && (
            <div className="p-3 bg-info-50 border border-info-100 rounded-card">
              <p className="text-caption text-info-700">
                Số dư quỹ hiện tại: <span className="font-bold font-mono">{formatCurrency(soDu.soDu)}</span>
              </p>
            </div>
          )}

          <Input
            label="Số tiền (VND)"
            type="number"
            min="1000"
            step="1000"
            value={createForm.soTien}
            onChange={(e) => setCreateForm(prev => ({ ...prev, soTien: e.target.value }))}
            placeholder="0"
            inputClassName="text-right font-mono"
          />

          <div>
            <label className="block text-caption font-semibold text-neutral-700 mb-1.5">
              Nội dung
            </label>
            <textarea
              value={createForm.noiDung}
              onChange={(e) => setCreateForm(prev => ({ ...prev, noiDung: e.target.value }))}
              placeholder="VD: Thanh toán tiền điện tháng 9..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-body border border-neutral-300 rounded-btn focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
            <p className="text-caption text-neutral-500 mt-1 text-right">
              {createForm.noiDung.length}/500
            </p>
          </div>

          {/* Preview validate */}
          {createForm.soTien && Number(createForm.soTien) > 0 && soDu && Number(createForm.soTien) > soDu.soDu && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-card">
              <p className="text-caption text-danger-700">
                ⚠️ Số tiền vượt quá số dư ({formatCurrency(soDu.soDu)})
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={submitting}
              disabled={
                !createForm.soTien || Number(createForm.soTien) <= 0
                || !createForm.noiDung.trim()
                || (soDu && Number(createForm.soTien) > soDu.soDu)
              }
            >
              Tạo phiếu chi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal xem chi tiết */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem ? `Phiếu chi #${viewItem.MaPhieuChi}` : ''}
        size="md"
      >
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-caption text-neutral-500">Mã phiếu chi</p>
                <p className="text-body font-mono font-semibold">#{viewItem.MaPhieuChi}</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Ngày lập</p>
                <p className="text-body">
                  {dayjs(viewItem.NgayLap).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-caption text-neutral-500">Nội dung</p>
                <p className="text-body">{viewItem.NoiDung}</p>
              </div>
              <div className="col-span-2">
                <p className="text-caption text-neutral-500">Người lập</p>
                <p className="text-body">{viewItem.TenNV || `NV #${viewItem.MaNV}`}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-neutral-200">
                <p className="text-caption text-neutral-500">Số tiền</p>
                <p className="text-h2 font-bold text-danger-700 font-mono">
                  −{formatCurrency(Number(viewItem.SoTien) || 0)}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setViewItem(null)} icon={<X />}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PhieuChiListPage;

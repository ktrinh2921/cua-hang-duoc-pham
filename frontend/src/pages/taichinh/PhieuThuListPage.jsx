/**
 * PhieuThuListPage - Danh sách phiếu thu + Modal tạo/xem chi tiết
 *
 * Tính năng:
 *  - Bảng danh sách phiếu thu (mã, ngày, loại, nội dung, NV, số tiền, trạng thái)
 *  - Modal TẠO phiếu thu khác (gradient success + live preview số tiền)
 *  - Modal CHI TIẾT phiếu thu (gradient success + hero callout)
 *  - Filter: keyword + from/to + loại phiếu
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  Plus, ReceiptText, Wallet, FileText, Info, Check, Hash,
  User as UserIcon, Calendar, X, Tag, Quote, Printer,
} from 'lucide-react';
import phieuThuService from '../../services/phieuThuService';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

const emptyForm = { soTien: '', noiDung: '' };

const MAX_NOI_DUNG = 500;
const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000];

function PhieuThuListPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', from: '', to: '', loaiPhieu: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  useEffect(() => {
    if (!hasRole(['Admin', 'NV_BanHang'])) navigate('/forbidden', { replace: true });
  }, [hasRole, navigate]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await phieuThuService.getAll({
        ...filters,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(response.data?.items || []);
      setPagination(response.data?.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Không thể tải danh sách phiếu thu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasRole(['Admin', 'NV_BanHang'])) return undefined;
    const timer = setTimeout(() => fetchData(1), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.keyword, filters.from, filters.to, filters.loaiPhieu]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const soTien = Number(form.soTien);
    if (!Number.isFinite(soTien) || soTien <= 0 || !form.noiDung.trim()) return;
    setSubmitting(true);
    try {
      await phieuThuService.create({ soTien, noiDung: form.noiDung.trim() });
      toast.success('Đã ghi nhận phiếu thu');
      setShowCreate(false);
      setForm(emptyForm);
      fetchData(1);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Không thể tạo phiếu thu');
    } finally {
      setSubmitting(false);
    }
  };

  const closeCreate = () => {
    if (submitting) return;
    setShowCreate(false);
    setForm(emptyForm);
  };

  const columns = [
    {
      key: 'id', label: 'Mã PT', width: '90px',
      render: (item) => <span className="font-mono text-neutral-500">#{item.MaPhieuThu}</span>,
    },
    {
      key: 'date', label: 'Ngày lập', width: '160px',
      render: (item) => dayjs(item.NgayLap).format('DD/MM/YYYY HH:mm'),
    },
    {
      key: 'type', label: 'Loại', width: '120px',
      render: (item) => (
        <Badge variant={item.LoaiPhieu === 'BanHang' ? 'primary' : 'info'} size="sm">
          {item.LoaiPhieu === 'BanHang' ? 'Bán hàng' : 'Thu khác'}
        </Badge>
      ),
    },
    { key: 'content', label: 'Nội dung', render: (item) => item.NoiDung },
    { key: 'staff', label: 'Người lập', width: '170px', render: (item) => item.TenNV || `NV #${item.MaNV}` },
    {
      key: 'amount', label: 'Số tiền', width: '160px', align: 'right',
      render: (item) => (
        <span className={item.TrangThai === 'CoHieuLuc'
          ? 'font-mono font-semibold text-success-700'
          : 'font-mono text-neutral-400 line-through'}>
          +{formatCurrency(Number(item.SoTien) || 0)}
        </span>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', width: '125px', align: 'center',
      render: (item) => (
        <Badge variant={item.TrangThai === 'CoHieuLuc' ? 'success' : 'neutral'} size="sm">
          {item.TrangThai === 'CoHieuLuc' ? 'Có hiệu lực' : 'HĐ đã hủy'}
        </Badge>
      ),
    },
  ];

  // Tính số tiền preview dạng VND
  const soTienNum = Number(form.soTien);
  const soTienValid = Number.isFinite(soTienNum) && soTienNum > 0;
  const noiDungTrim = form.noiDung.trim();
  const canSubmit = soTienValid && noiDungTrim.length > 0 && !submitting;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ReceiptText />}
        title="Phiếu thu"
        subtitle={`Tổng ${pagination.total || 0} phiếu thu`}
        actions={(
          <Button icon={<Plus />} onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
            Tạo phiếu thu
          </Button>
        )}
      />

      <SearchBar
        value={filters.keyword}
        onChange={(keyword) => setFilters((current) => ({ ...current, keyword }))}
        placeholder="Tìm theo mã phiếu, hóa đơn, nội dung, người lập..."
      >
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
          <input
            aria-label="Từ ngày"
            type="date"
            value={filters.from}
            max={filters.to || today}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none"
          />
          <input
            aria-label="Đến ngày"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            max={today}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none"
          />
          <Select
            aria-label="Loại phiếu thu"
            value={filters.loaiPhieu}
            onChange={(event) => setFilters((current) => ({ ...current, loaiPhieu: event.target.value }))}
            placeholder="Tất cả loại"
            options={[{ value: 'BanHang', label: 'Bán hàng' }, { value: 'Khac', label: 'Thu khác' }]}
          />
        </div>
      </SearchBar>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaPhieuThu"
        emptyTitle="Chưa có phiếu thu"
        emptyDescription="Phiếu bán hàng sẽ được tạo tự động khi thanh toán"
        emptyIcon={<ReceiptText />}
        onRowClick={setViewItem}
      />
      <Pagination
        page={pagination.page || 1}
        totalPages={pagination.totalPages || 0}
        total={pagination.total || 0}
        onChange={fetchData}
        loading={loading}
      />

      {/* ─────────── MODAL: Tạo phiếu thu khác ─────────── */}
      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Tạo phiếu thu khác"
        description="Phiếu thu ngoài bán hàng — ghi nhận các khoản thu khác (hoàn ứng, thu nợ, ...) vào quỹ."
        icon={<ReceiptText className="w-5 h-5" />}
        badge="Thu khác"
        tone="success"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeCreate}
              disabled={submitting}
              icon={<X className="w-4 h-4" />}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="phieu-thu-create-form"
              loading={submitting}
              disabled={!canSubmit}
              icon={<Check className="w-4 h-4" />}
              variant="success"
            >
              Ghi nhận phiếu thu
            </Button>
          </>
        }
      >
        <form
          id="phieu-thu-create-form"
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          {/* Banner giải thích */}
          <div className="flex items-start gap-3 rounded-card border border-info-200 bg-info-50 p-3.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-info-100 text-info-700 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-info-800">
                Phiếu bán hàng được tạo tự động
              </p>
              <p className="mt-0.5 text-caption text-info-700">
                Form này chỉ dành cho khoản thu <strong>ngoài hóa đơn</strong> (thu nợ cũ, hoàn ứng, lãi ngân hàng, ...).
              </p>
            </div>
          </div>

          {/* Số tiền */}
          <div>
            <Input
              label="Số tiền thu (VND)"
              required
              type="number"
              min="1000"
              step="1000"
              value={form.soTien}
              onChange={(event) => setForm((current) => ({ ...current, soTien: event.target.value }))}
              placeholder="VD: 500000"
              icon={<Wallet className="w-4 h-4" />}
              inputClassName="text-right font-mono text-h3 font-bold"
              hint={
                soTienValid
                  ? `Số tiền hợp lệ: ${formatCurrency(soTienNum)}`
                  : 'Nhập số tiền > 0 (bước nhảy 1.000đ)'
              }
              error={
                form.soTien && !soTienValid ? 'Số tiền phải là số dương, tối thiểu 1.000đ' : ''
              }
            />

            {/* Quick amount chips */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-caption text-neutral-500">Nhanh:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, soTien: String(amt) }))}
                  className={cn(
                    'px-2.5 py-1 text-caption font-medium rounded-pill border transition-colors',
                    Number(form.soTien) === amt
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-700'
                  )}
                >
                  +{formatCurrency(amt)}
                </button>
              ))}
              {form.soTien && (
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, soTien: '' }))}
                  className="px-2 py-1 text-caption text-neutral-400 hover:text-danger-600"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Nội dung */}
          <Textarea
            label="Nội dung thu"
            required
            rows={3}
            value={form.noiDung}
            onChange={(event) => setForm((current) => ({ ...current, noiDung: event.target.value }))}
            placeholder="VD: Thu hồi ứng trước cho nhân viên A / Thu nợ cũ từ khách hàng B / Lãi tiết kiệm tháng 9..."
            maxLength={MAX_NOI_DUNG}
            icon={<FileText className="w-4 h-4" />}
            hint={`${form.noiDung.length}/${MAX_NOI_DUNG} ký tự`}
            error={
              form.noiDung && !noiDungTrim ? 'Nội dung không được chỉ chứa khoảng trắng' : ''
            }
          />

          {/* Hero preview */}
          {soTienValid && noiDungTrim && (
            <div className="relative overflow-hidden rounded-card border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-info-50 p-4">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-100/60" />
              <div className="relative">
                <div className="flex items-center gap-2 text-caption font-semibold text-primary-700 uppercase tracking-wider">
                  <ReceiptText className="w-3.5 h-3.5" />
                  Xem trước phiếu thu
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="font-mono text-h1 font-bold text-primary-700 tabular-nums">
                    +{formatCurrency(soTienNum)}
                  </p>
                  <p className="text-caption text-neutral-600 italic line-clamp-2 max-w-[60%] text-right">
                    "{noiDungTrim}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ─────────── MODAL: Chi tiết phiếu thu ─────────── */}
      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem ? `Phiếu thu #${viewItem.MaPhieuThu}` : ''}
        description={viewItem ? `Lập ngày ${dayjs(viewItem.NgayLap).format('DD/MM/YYYY HH:mm')}` : ''}
        icon={<ReceiptText className="w-5 h-5" />}
        badge={viewItem?.LoaiPhieu === 'BanHang' ? 'Bán hàng' : 'Thu khác'}
        tone="success"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setViewItem(null)}
              icon={<X className="w-4 h-4" />}
            >
              Đóng
            </Button>
            {viewItem && (
              <Button
                variant="primary"
                onClick={() => toast('Tính năng in phiếu đang phát triển', { icon: '🖨️' })}
                icon={<Printer className="w-4 h-4" />}
              >
                In phiếu
              </Button>
            )}
          </>
        }
      >
        {viewItem && (
          <div className="space-y-4">
            {/* Hero callout số tiền */}
            <div
              className={cn(
                'relative overflow-hidden rounded-card border p-5',
                viewItem.TrangThai === 'CoHieuLuc'
                  ? 'border-primary-200 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-400 text-white'
                  : 'border-neutral-200 bg-neutral-100 text-neutral-500'
              )}
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-8 right-20 h-24 w-24 rounded-full bg-white/5" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-wider opacity-90">
                    Số tiền thu
                  </p>
                  <p className="mt-1 font-mono text-display font-bold tabular-nums">
                    +{formatCurrency(Number(viewItem.SoTien) || 0)}
                  </p>
                </div>
                <Badge
                  variant={viewItem.TrangThai === 'CoHieuLuc' ? 'success' : 'neutral'}
                  size="md"
                  className={viewItem.TrangThai === 'CoHieuLuc'
                    ? 'bg-white/20 text-white ring-white/30'
                    : ''}
                >
                  {viewItem.TrangThai === 'CoHieuLuc' ? '✓ Có hiệu lực' : 'HĐ đã hủy'}
                </Badge>
              </div>
            </div>

            {/* Thông tin 2 cột */}
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                icon={Hash}
                label="Mã phiếu"
                value={`#${viewItem.MaPhieuThu}`}
                mono
              />
              <InfoField
                icon={Calendar}
                label="Ngày lập"
                value={dayjs(viewItem.NgayLap).format('DD/MM/YYYY HH:mm')}
              />
              <InfoField
                icon={Tag}
                label="Loại phiếu"
                value={viewItem.LoaiPhieu === 'BanHang' ? 'Bán hàng' : 'Thu khác'}
              />
              <InfoField
                icon={UserIcon}
                label="Người lập"
                value={viewItem.TenNV || `NV #${viewItem.MaNV}`}
              />
              {viewItem.MaHD && (
                <InfoField
                  icon={ReceiptText}
                  label="Hóa đơn liên quan"
                  value={`#${viewItem.MaHD}`}
                  mono
                  className="col-span-2"
                />
              )}
            </div>

            {/* Nội dung trong card */}
            <div className="rounded-card border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-start gap-2.5">
                <Quote className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-caption font-semibold text-neutral-500 uppercase tracking-wider">
                    Nội dung
                  </p>
                  <p className="mt-1 text-body text-neutral-900 whitespace-pre-wrap">
                    {viewItem.NoiDung}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Field hiển thị thông tin trong modal chi tiết (có icon + label + value) */
function InfoField({ icon: Icon, label, value, mono, className }) {
  return (
    <div className={cn('rounded-card border border-neutral-200 bg-white p-3', className)}>
      <div className="flex items-center gap-1.5 text-caption text-neutral-500">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <p className={cn(
        'mt-1.5 text-body text-neutral-900',
        mono && 'font-mono font-semibold'
      )}>
        {value}
      </p>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default PhieuThuListPage;
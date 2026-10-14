/**
 * ThuocListPage - Danh sách thuốc (Sprint 1: StatCard + Filter chips + Sort)
 *
 * Nghiệp vụ:
 *  - NV bán hàng: tra cứu nhanh thuốc, xem tồn kho
 *  - Admin: CRUD đầy đủ
 *
 * Refactored với design system mới (Phase 3 UI + Sprint 1 enhancements).
 * Read: All roles | Write: Admin only.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Pill, Plus, Edit2, Trash2, Eye, Package, RotateCcw,
  ChevronDown, PackageCheck, PackageX, Clock,
  AlertTriangle, TrendingUp, CheckCircle,
  Filter as FilterIcon, X,
} from 'lucide-react';
import thuocService from '../../services/thuocService';
import danhMucService from '../../services/danhMucService';
import { useAuth } from '../../contexts/AuthContext';
import RoleGuard from '../../components/ui/RoleGuard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import StockBadge from '../../components/ui/StockBadge';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { buildStockChipCounts } from './thuocListLogic';

// ─── Filter chip config ───────────────────────────────────────────
const STATUS_CHIPS = [
  { key: 'all',     label: 'Tất cả',     variant: 'neutral' },
  { key: 'inStock', label: 'Còn hàng',   variant: 'success' },
  { key: 'low',     label: 'Sắp hết',    variant: 'warning' },
  { key: 'out',     label: 'Hết hàng',   variant: 'danger'  },
];

const SORT_OPTIONS = [
  { value: 'ma_desc',   label: 'Mã mới nhất' },
  { value: 'ten_asc',   label: 'Tên A → Z' },
  { value: 'ten_desc',  label: 'Tên Z → A' },
  { value: 'gia_asc',   label: 'Giá thấp → cao' },
  { value: 'gia_desc',  label: 'Giá cao → thấp' },
  { value: 'ton_desc',  label: 'Tồn kho nhiều → ít' },
  { value: 'hsd_asc',   label: 'HSD gần nhất' },
];

// ─── Keyword highlighter (đã có ở BanHangPage, copy sang đây) ───
function Highlight({ text = '', term = '' }) {
  if (!text || !term || !term.trim()) return <>{text}</>;
  const safe = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${safe})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.trim().toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-neutral-900 rounded px-0.5">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// ─── StatBar — 4 stat cards trên cùng ───────────────────────────
function StatBar({ counts, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-card bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="w-10 h-10 rounded-btn bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5" />
        </div>
        <div>
          <p className="text-caption text-neutral-500">Tổng thuốc</p>
          <p className="text-h3 font-bold text-neutral-900">{counts.all}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-card border border-success-100 bg-success-50/50 p-4">
        <div className="w-10 h-10 rounded-btn bg-success-50 text-success-600 flex items-center justify-center flex-shrink-0">
          <PackageCheck className="w-5 h-5" />
        </div>
        <div>
          <p className="text-caption text-neutral-500">Còn hàng</p>
          <p className="text-h3 font-bold text-success-800">{counts.inStock}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-card border border-warning-100 bg-warning-50/50 p-4">
        <div className="w-10 h-10 rounded-btn bg-warning-50 text-warning-600 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-caption text-neutral-500">Sắp hết (≤10)</p>
          <p className="text-h3 font-bold text-warning-800">{counts.low}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-card border border-danger-100 bg-danger-50/50 p-4">
        <div className="w-10 h-10 rounded-btn bg-danger-50 text-danger-600 flex items-center justify-center flex-shrink-0">
          <PackageX className="w-5 h-5" />
        </div>
        <div>
          <p className="text-caption text-neutral-500">Hết hàng</p>
          <p className="text-h3 font-bold text-danger-800">{counts.out}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Filter chips row ─────────────────────────────────────────────
function FilterChips({ value, onChange, counts }) {
  const handleClick = (key, label) => {
    onChange(key);
    // Toast feedback để user biết filter đã trigger (kể cả khi 'all')
    const total = counts?.[key];
    if (key === 'all') {
      toast(`Đã bỏ lọc — hiển thị tất cả ${total ?? ''} thuốc`.trim(), { icon: '🔄', duration: 1500 });
    } else {
      toast.success(`Đang lọc: ${label}${total != null ? ` (${total} thuốc)` : ''}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption font-medium text-neutral-600">
        Lọc theo tồn kho:
      </span>
      {STATUS_CHIPS.map(chip => {
        const count = counts?.[chip.key];
        const isActive = value === chip.key;
        const variant = chip.variant;
        const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-body font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';
        const activeClasses = {
          neutral: 'bg-neutral-700 text-white shadow-md ring-2 ring-offset-1 ring-neutral-700',
          success: 'bg-success-600 text-white shadow-md ring-2 ring-offset-1 ring-success-500',
          warning: 'bg-warning-600 text-white shadow-md ring-2 ring-offset-1 ring-warning-500',
          danger:  'bg-danger-600 text-white shadow-md ring-2 ring-offset-1 ring-danger-500',
        };
        const inactiveClasses = {
          neutral: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          success: 'bg-success-50 text-success-700 hover:bg-success-100',
          warning: 'bg-warning-50 text-warning-700 hover:bg-warning-100',
          danger:  'bg-danger-50 text-danger-700 hover:bg-danger-100',
        };

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => handleClick(chip.key, chip.label)}
            className={`${baseClasses} ${isActive ? activeClasses[variant] : inactiveClasses[variant]}`}
            aria-pressed={isActive}
            title={
              chip.key === 'all' ? 'Hiển thị tất cả thuốc' :
              chip.key === 'inStock' ? 'Thuốc có tồn kho > 10 đơn vị' :
              chip.key === 'low' ? 'Thuốc có tồn kho từ 1 đến 10 đơn vị' :
              'Thuốc đã hết hàng'
            }
          >
            {chip.label}
            {Number.isFinite(count) && (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption font-bold ${
                isActive
                  ? 'bg-white text-neutral-900'
                  : 'bg-white text-neutral-700 ring-1 ring-inset ring-neutral-300'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
function ThuocListPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');
  const navigate = useNavigate();

  // ── Data state ────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
  const [danhMucList, setDanhMucList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendCounts, setBackendCounts] = useState(null);

  // ── Filter state ───────────────────────────────────────────────
  const [filters, setFilters] = useState({
    keyword: '',
    maDM: '',
    trangThaiTon: 'all',
    sort: 'ma_desc',
  });
  const [searchInput, setSearchInput] = useState('');

  // ── Modal state ───────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    tenThuoc: '', hoatChat: '', khoiLuong: '',
    giaBanThamKhao: 0, maDM: '',
    moTa: '', lieuDung: '', chongChiDinh: '', ghiChu: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showExtraFields, setShowExtraFields] = useState(false);

  // ── Delete state ───────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Debounce search ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, keyword: searchInput }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchDanhMuc(); }, []);

  // Refetch khi filter thay đổi (luôn reset về page 1)
  useEffect(() => {
    setPagination(p => ({ ...p, page: 1 }));
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.keyword, filters.maDM, filters.trangThaiTon, filters.sort]);

  // ── Fetch helpers ──────────────────────────────────────────────
  const fetchDanhMuc = async () => {
    try {
      const res = await danhMucService.getAll();
      setDanhMucList(res.data || []);
    } catch (err) {
      console.error('Load danh mục failed:', err);
    }
  };

  const fetchData = async (page = pagination.page) => {
    setLoading(true);
    try {
      const res = await thuocService.getAll({
        keyword: filters.keyword,
        maDM: filters.maDM || null,
        trangThaiTon: filters.trangThaiTon,
        sort: filters.sort,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(res.data?.items || []);
      setPagination(
        res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 }
      );
      // Lưu counts từ backend (luôn chính xác)
      setBackendCounts(res.data?.counts || null);
    } catch (err) {
      toast.error('Không thể tải danh sách thuốc');
    } finally {
      setLoading(false);
    }
  };

  // ── Counts cho filter chips ────────────────────────────────────
  const chipCounts = useMemo(
    () => buildStockChipCounts(backendCounts),
    [backendCounts]
  );

  // ── Modal handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingItem(null);
    setFormError('');
    setShowExtraFields(false);
    setFormData({
      tenThuoc: '',
      hoatChat: '',
      khoiLuong: '',
      giaBanThamKhao: 0,
      maDM: danhMucList[0]?.MaDM || '',
      moTa: '',
      lieuDung: '',
      chongChiDinh: '',
      ghiChu: '',
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setShowExtraFields(Boolean(item.MoTa || item.LieuDung || item.ChongChiDinh || item.GhiChu));
    setFormData({
      tenThuoc: item.TenThuoc,
      hoatChat: item.HoatChat || '',
      khoiLuong: item.KhoiLuong || '',
      giaBanThamKhao: item.GiaBanThamKhao,
      maDM: item.MaDM,
      moTa: item.MoTa || '',
      lieuDung: item.LieuDung || '',
      chongChiDinh: item.ChongChiDinh || '',
      ghiChu: item.GhiChu || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.tenThuoc.trim() || !formData.maDM) {
      setFormError('Vui lòng nhập tên thuốc và chọn danh mục');
      return;
    }
    if (Number(formData.giaBanThamKhao) < 0) {
      setFormError('Giá bán phải ≥ 0');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        tenThuoc: formData.tenThuoc.trim(),
        hoatChat: formData.hoatChat.trim() || null,
        khoiLuong: formData.khoiLuong.trim() || null,
        giaBanThamKhao: Number(formData.giaBanThamKhao),
        maDM: formData.maDM,
        moTa: formData.moTa.trim() || null,
        lieuDung: formData.lieuDung.trim() || null,
        chongChiDinh: formData.chongChiDinh.trim() || null,
        ghiChu: formData.ghiChu.trim() || null,
      };
      if (editingItem) {
        await thuocService.update(editingItem.MaThuoc, payload);
        toast.success('Cập nhật thuốc thành công');
      } else {
        await thuocService.create(payload);
        toast.success('Tạo thuốc thành công');
      }
      setModalOpen(false);
      fetchData(pagination.page);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Thao tác thất bại';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await thuocService.remove(confirmDeleteId);
      toast.success('Xóa thuốc thành công');
      setConfirmDeleteId(null);
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Không thể xóa');
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(searchInput || filters.maDM || filters.trangThaiTon !== 'all' || filters.sort !== 'ma_desc');
  const resetFilters = () => {
    setSearchInput('');
    setFilters({ keyword: '', maDM: '', trangThaiTon: 'all', sort: 'ma_desc' });
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns = [
    {
      key: 'id',
      label: 'Mã',
      width: '70px',
      render: (t) => <span className="font-mono text-neutral-500">#{t.MaThuoc}</span>,
    },
    {
      key: 'name',
      label: 'Tên thuốc',
      render: (t) => (
        <div>
          <div className="font-medium text-neutral-900">
            <Highlight text={t.TenThuoc} term={filters.keyword} />
          </div>
          {t.KhoiLuong && (
            <div className="text-caption text-neutral-500">{t.KhoiLuong}</div>
          )}
        </div>
      ),
    },
    {
      key: 'ingredient',
      label: 'Hoạt chất',
      render: (t) => (
        <span className="text-neutral-700">
          {t.HoatChat ? <Highlight text={t.HoatChat} term={filters.keyword} /> : '—'}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Danh mục',
      render: (t) => (
        <span className="inline-flex rounded-pill bg-primary-50 px-2.5 py-1 text-caption font-medium text-primary-700">
          {t.TenDM}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Giá bán',
      align: 'right',
      render: (t) => (
        <span className="font-medium tabular-nums text-primary-700">
          {formatCurrency(t.GiaBanThamKhao)}
        </span>
      ),
    },
    {
      key: 'stock',
      label: 'Tồn kho',
      align: 'center',
      render: (t) => <StockBadge stock={t.SoLuongTonKho} />,
    },
    {
      key: 'hsd',
      label: 'HSD gần nhất',
      render: (t) => {
        if (!t.HanSDGanNhat) return <span className="text-neutral-400">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-body text-neutral-700 tabular-nums">
              {new Date(t.HanSDGanNhat).toLocaleDateString('vi-VN')}
            </span>
            <ExpiryBadge expiryDate={t.HanSDGanNhat} />
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      width: '160px',
      render: (t) => (
          <div className="flex items-center justify-end gap-1">
            {/* Xem chi tiết */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/thuoc/${t.MaThuoc}`); }}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-btn text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 active:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={`Xem chi tiết ${t.TenThuoc}`}
              title="Chi tiết"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Admin: Sửa + Xóa */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-btn text-info-600 transition-colors hover:bg-info-50 active:bg-info-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label={`Sửa ${t.TenThuoc}`}
                  title="Sửa"
                >
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.MaThuoc); }}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-btn text-danger-600 transition-colors hover:bg-danger-50 active:bg-danger-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label={`Xóa ${t.TenThuoc}`}
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
      ),
    },
  ];

  const deletingItem = items.find(i => i.MaThuoc === confirmDeleteId);
  const activeFilterLabel = STATUS_CHIPS.find(c => c.key === filters.trangThaiTon)?.label || 'Tất cả';

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <PageHeader
        icon={<Pill />}
        title="Quản lý thuốc"
        subtitle={`${pagination.total} thuốc · Đang xem: ${activeFilterLabel}`}
        actions={
          <RoleGuard roles={['Admin']}>
            <Button variant="primary" size="lg" icon={<Plus />} onClick={openCreate}>
              Thêm thuốc
            </Button>
          </RoleGuard>
        }
      />

      {/* ── Stat bar ────────────────────────────────────────────── */}
      <StatBar counts={chipCounts} loading={!chipCounts} />

      {/* ── Search + Filter bar ────────────────────────────────── */}
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Tìm theo tên thuốc hoặc hoạt chất..."
        label="Từ khóa"
        title="Tìm kiếm và lọc"
        description="Thu hẹp danh sách theo thông tin thuốc hoặc danh mục."
        meta={loading ? 'Đang cập nhật...' : `${pagination.total} kết quả`}
      >
        {/* Danh mục */}
        <Select
          label="Danh mục thuốc"
          value={filters.maDM}
          onChange={(v) => setFilters(f => ({ ...f, maDM: v }))}
          options={danhMucList.map(dm => ({ value: dm.MaDM, label: dm.TenDM }))}
          placeholder="Tất cả danh mục"
          className="w-full sm:w-[200px]"
          selectClassName="h-11"
          aria-label="Lọc theo danh mục thuốc"
        />

        {/* Sắp xếp */}
        <div className="w-full sm:w-[180px]">
          <label className="mb-1.5 block text-caption font-medium text-neutral-700">
            Sắp xếp
          </label>
          <div className="relative">
            <Select
              value={filters.sort}
              onChange={(v) => setFilters(f => ({ ...f, sort: v }))}
              options={SORT_OPTIONS}
              className="w-full"
              selectClassName="h-11 pr-8"
              aria-label="Sắp xếp danh sách thuốc"
            />
          </div>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="lg"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={resetFilters}
            title="Xóa tất cả bộ lọc"
            className="w-full sm:w-auto"
          >
            Xóa lọc
          </Button>
        )}
      </SearchBar>

      {/* ── Filter chips ────────────────────────────────────────── */}
      <div className="px-1">
        <FilterChips
          value={filters.trangThaiTon}
          onChange={(v) => setFilters(f => ({ ...f, trangThaiTon: v }))}
          counts={chipCounts}
        />
      </div>

      {/* ── Active filter banner (chỉ hiện khi đang filter) ──── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-info-200 bg-info-50 px-4 py-2.5 text-caption">
          <span className="inline-flex items-center gap-1.5 font-semibold text-info-700">
            <FilterIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Đang lọc:
          </span>
          {filters.keyword && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-white px-2 py-0.5 text-info-800 ring-1 ring-inset ring-info-200">
              Từ khóa: <strong>"{filters.keyword}"</strong>
            </span>
          )}
          {filters.maDM && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-white px-2 py-0.5 text-info-800 ring-1 ring-inset ring-info-200">
              Danh mục: <strong>{danhMucList.find(d => d.MaDM === filters.maDM)?.TenDM || filters.maDM}</strong>
            </span>
          )}
          {filters.trangThaiTon !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-white px-2 py-0.5 text-info-800 ring-1 ring-inset ring-info-200">
              Tồn kho: <strong>{STATUS_CHIPS.find(c => c.key === filters.trangThaiTon)?.label}</strong>
            </span>
          )}
          {filters.sort !== 'ma_desc' && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-white px-2 py-0.5 text-info-800 ring-1 ring-inset ring-info-200">
              Sắp xếp: <strong>{SORT_OPTIONS.find(s => s.value === filters.sort)?.label}</strong>
            </span>
          )}
          <span className="ml-auto text-info-700 font-medium">
            {pagination.total} kết quả
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-pill bg-danger-50 px-2 py-0.5 text-danger-700 hover:bg-danger-100"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Xóa tất cả
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaThuoc"
        emptyTitle={
          filters.keyword || filters.maDM || filters.trangThaiTon !== 'all'
            ? 'Không tìm thấy thuốc phù hợp'
            : 'Chưa có thuốc nào'
        }
        emptyDescription={
          filters.keyword || filters.maDM || filters.trangThaiTon !== 'all'
            ? 'Thử đổi từ khóa, chọn danh mục khác hoặc xóa các bộ lọc hiện tại.'
            : 'Thêm thuốc đầu tiên để bắt đầu quản lý danh mục.'
        }
        emptyIcon={<Package />}
        emptyAction={
          hasActiveFilters ? (
            <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={resetFilters}>
              Xóa bộ lọc
            </Button>
          ) : undefined
        }
        onRowClick={(t) => navigate(`/thuoc/${t.MaThuoc}`)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />

      {/* ── Modal Tạo/Sửa thuốc ────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Sửa thuốc' : 'Thêm thuốc'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên thuốc"
            required
            value={formData.tenThuoc}
            onChange={(e) => setFormData({ ...formData, tenThuoc: e.target.value })}
            maxLength={400}
            error={formError && (!formData.tenThuoc.trim() || !formData.maDM) ? formError : ''}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Hoạt chất"
              value={formData.hoatChat}
              onChange={(e) => setFormData({ ...formData, hoatChat: e.target.value })}
              maxLength={500}
              placeholder="Paracetamol, Ibuprofen, ..."
            />
            <Input
              label="Khối lượng / Quy cách"
              value={formData.khoiLuong}
              onChange={(e) => setFormData({ ...formData, khoiLuong: e.target.value })}
              maxLength={100}
              placeholder="VD: 20 viên/hộp, 500mg"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Giá bán tham khảo"
              type="number"
              required
              min="0"
              step="1000"
              value={formData.giaBanThamKhao}
              onChange={(e) => setFormData({ ...formData, giaBanThamKhao: e.target.value })}
            />
            <Select
              label="Danh mục"
              required
              value={formData.maDM}
              onChange={(v) => setFormData({ ...formData, maDM: v })}
              options={danhMucList.map(dm => ({ value: dm.MaDM, label: `${dm.MaDM} - ${dm.TenDM}` }))}
            />
          </div>

          {/* ── Extra fields (collapsible) ──────────────────────── */}
          {!showExtraFields ? (
            <button
              type="button"
              onClick={() => setShowExtraFields(true)}
              className="flex items-center gap-1.5 text-caption text-info-600 hover:text-info-800 hover:underline"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Thêm thông tin mô tả (công dụng, liều dùng, ...)
            </button>
          ) : (
            <div className="space-y-3 rounded-card border border-info-200 bg-info-50/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption font-semibold text-info-700">Thông tin mô tả</span>
                <button
                  type="button"
                  onClick={() => setShowExtraFields(false)}
                  className="text-caption text-info-500 hover:text-info-700 hover:underline"
                >
                  Thu gọn
                </button>
              </div>
              <Input
                label="Mô tả / Công dụng"
                value={formData.moTa}
                onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                placeholder="Thuốc giảm đau, hạ sốt, điều trị cảm cúm..."
                maxLength={2000}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Liều dùng mặc định"
                  value={formData.lieuDung}
                  onChange={(e) => setFormData({ ...formData, lieuDung: e.target.value })}
                  placeholder="Người lớn: 1-2 viên/lần, tối đa 8 viên/ngày"
                  maxLength={500}
                />
                <Input
                  label="Chống chỉ định"
                  value={formData.chongChiDinh}
                  onChange={(e) => setFormData({ ...formData, chongChiDinh: e.target.value })}
                  placeholder="Suy gan nặng, mẫn cảm với paracetamol..."
                  maxLength={500}
                />
              </div>
              <Input
                label="Ghi chú cho nhân viên"
                value={formData.ghiChu}
                onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                placeholder="Hàng hot cuối tuần, nên nhập thêm trước thứ 6..."
                maxLength={1000}
              />
            </div>
          )}

          {formError && formData.tenThuoc.trim() && formData.maDM && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-btn text-caption text-danger-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm delete ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Xóa thuốc"
        message={
          deletingItem
            ? `Bạn có chắc chắn muốn xóa thuốc "${deletingItem.TenThuoc}"? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa"
      />
    </div>
  );
}

export default ThuocListPage;

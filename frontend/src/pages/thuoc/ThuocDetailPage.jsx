/**
 * ThuocDetailPage — Chi tiết thuốc
 *
 * Tính năng (Phase 3+):
 *  - Inline edit (chỉ Admin): sửa TenThuoc, HoatChat, KhoiLuong, GiaBanThamKhao, MaDM,
 *    MoTa, LieuDung, ChongChiDinh, GhiChu
 *  - Read-only: tồn kho, giá nhập, lịch sử lô, thông tin hệ thống
 *  - Lịch sử lô nhập còn hàng (FIFO) — không cho sửa tồn trực tiếp
 *    (đúng nghiệp vụ: tồn kho phải thay đổi qua phiếu nhập / bán hàng / điều chỉnh)
 *  - Section "Mô tả & Hướng dẫn" (MoTa, LieuDung, ChongChiDinh, GhiChu)
 *  - Section "Sản phẩm cùng hoạt chất" (similar)
 *
 * Refactored với design system mới.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Pill,
  ArrowLeft,
  Beaker,
  Package,
  DollarSign,
  FolderTree,
  Calendar,
  RefreshCw,
  AlertCircle,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Truck,
  Clock,
  History,
  ShoppingCart,
  Lightbulb,
  AlertTriangle,
  Package as PackageIcon,
  TrendingUp as TrendingUpIcon,
  Shuffle,
  Info,
  BookOpen,
} from 'lucide-react';
import thuocService from '../../services/thuocService';
import danhMucService from '../../services/danhMucService';
import khoService from '../../services/khoService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StockBadge from '../../components/ui/StockBadge';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import LoadingState from '../../components/ui/LoadingState';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDate } from '../../utils/format';

// ─── Helpers ──────────────────────────────────────────────────

function giaNhapGanNhat(loList) {
  if (!loList || loList.length === 0) return null;
  // Sắp theo NgayNhap DESC đã được ORDER BY HanSD ASC → lấy lô có NgayNhap mới nhất
  return loList.reduce((latest, cur) =>
    new Date(cur.NgayNhap) > new Date(latest.NgayNhap) ? cur : latest
  );
}

function loiNhuan(giaBan, giaNhap) {
  const ban = Number(giaBan) || 0;
  const nhap = Number(giaNhap) || 0;
  if (ban <= 0 || nhap <= 0) return null;
  const tien = ban - nhap;
  return { tien, percent: Math.round((tien / nhap) * 100) };
}

// ─── Field row (read + edit) ──────────────────────────────────
function EditableField({ label, icon: Icon, name, type = 'text', value, onChange, error, disabled, readOnly, placeholder, children }) {
  const hasError = !!error;
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-caption font-medium text-neutral-700">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </label>
      {readOnly ? (
        <div className="flex h-10 items-center rounded-card border border-neutral-200 bg-neutral-50 px-3 text-body text-neutral-900">
          {value || <span className="italic text-neutral-400">Chưa cập nhật</span>}
        </div>
      ) : (
        <>
          {children ?? (
            <Input
              type={type}
              name={name}
              value={value ?? ''}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={hasError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
              aria-invalid={hasError}
              min={type === 'number' ? '0' : undefined}
            />
          )}
          {hasError && (
            <p className="mt-1 flex items-center gap-1 text-caption text-danger-600">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Trang ────────────────────────────────────────────────────
function ThuocDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');

  const [thuoc, setThuoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Edit state ──────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Lô nhập ────────────────────────────────────────────────
  const [loList, setLoList] = useState([]);
  const [tonKho, setTonKho] = useState(0);
  const [loLoading, setLoLoading] = useState(true);

  // ── Thuốc cùng hoạt chất ──────────────────────────────────
  const [similarList, setSimilarList] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  // ── Danh mục cho select khi edit ─────────────────────────────
  const [danhMucList, setDanhMucList] = useState([]);

  // ────────────────────────────────────────────────────────────
  // FETCH
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await thuocService.getById(id);
        setThuoc(res.data);
        setFormData({
          tenThuoc: res.data.TenThuoc || '',
          hoatChat: res.data.HoatChat || '',
          khoiLuong: res.data.KhoiLuong || '',
          giaBanThamKhao: res.data.GiaBanThamKhao ?? 0,
          maDM: res.data.MaDM || '',
          moTa: res.data.MoTa || '',
          lieuDung: res.data.LieuDung || '',
          chongChiDinh: res.data.ChongChiDinh || '',
          ghiChu: res.data.GhiChu || '',
        });
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Không thể tải thông tin thuốc');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    const fetchLo = async () => {
      setLoLoading(true);
      try {
        const res = await khoService.getLoByThuoc(id);
        setLoList(res.data?.items || res.data || []);
        setTonKho(Number(res.data?.tonKho) || 0);
      } catch (err) {
        toast.error(err.response?.data?.error?.message || 'Không thể tải lô thuốc');
      }
      finally { setLoLoading(false); }
    };
    fetchLo();
  }, [id]);

  useEffect(() => {
    const fetchSimilar = async () => {
      setSimilarLoading(true);
      try {
        const res = await thuocService.getSimilar(id);
        setSimilarList(res.data || []);
      } catch (err) {
        toast.error(err.response?.data?.error?.message || 'Không thể tải danh sách thuốc cùng hoạt chất');
      }
      finally { setSimilarLoading(false); }
    };
    if (thuoc?.HoatChat) fetchSimilar();
  }, [id, thuoc]);

  useEffect(() => {
    if (!editing) return;
    danhMucService.getAll().then(r => setDanhMucList(r.data || [])).catch(() => {});
  }, [editing]);

  // ────────────────────────────────────────────────────────────
  // EDIT HANDLERS
  // ────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(fe => ({ ...fe, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.tenThuoc?.trim()) errs.tenThuoc = 'Tên thuốc không được để trống';
    if (!formData.maDM) errs.maDM = 'Vui lòng chọn danh mục';
    const gia = Number(formData.giaBanThamKhao);
    if (formData.giaBanThamKhao === '' || isNaN(gia) || gia < 0) {
      errs.giaBanThamKhao = 'Giá bán phải ≥ 0';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startEdit = () => {
    setEditing(true);
    setFormErrors({});
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormErrors({});
    if (thuoc) {
      setFormData({
        tenThuoc: thuoc.TenThuoc || '',
        hoatChat: thuoc.HoatChat || '',
        khoiLuong: thuoc.KhoiLuong || '',
        giaBanThamKhao: thuoc.GiaBanThamKhao ?? 0,
        maDM: thuoc.MaDM || '',
        moTa: thuoc.MoTa || '',
        lieuDung: thuoc.LieuDung || '',
        chongChiDinh: thuoc.ChongChiDinh || '',
        ghiChu: thuoc.GhiChu || '',
      });
    }
  };

  const saveEdit = async () => {
    if (!validate()) return;
    setSaving(true);
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
      const res = await thuocService.update(thuoc.MaThuoc, payload);
      setThuoc(res.data);
      toast.success('Đã lưu thay đổi');
      setEditing(false);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Không thể lưu thay đổi';
      toast.error(msg);
      // Nếu lỗi có field cụ thể → highlight
      if (err.response?.data?.error?.field) {
        setFormErrors({ [err.response.data.error.field]: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // RENDER STATES
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="mx-auto max-w-5xl">
        <LoadingState label="Đang tải thông tin thuốc..." />
      </Card>
    );
  }

  if (error || !thuoc) {
    return (
      <Card className="mx-auto max-w-5xl" role="alert">
        <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-h3 text-danger-700">Không thể tải thuốc</h1>
          <p className="mb-5 text-body text-neutral-700">{error}</p>
          <Button
            variant="secondary"
            size="lg"
            icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            onClick={() => navigate('/thuoc')}
          >
            Quay lại danh sách
          </Button>
        </div>
      </Card>
    );
  }

  // ────────────────────────────────────────────────────────────
  // DATA COMPUTED
  // ────────────────────────────────────────────────────────────
  const stock = tonKho;
  const giaNhap = giaNhapGanNhat(loList);
  const loiNhuanInfo = loiNhuan(thuoc.GiaBanThamKhao, giaNhap?.GiaNhap);

  // Map lô nhập cho Table component
  const loColumns = [
    {
      key: 'MaLo',
      header: 'Mã lô',
      render: (l) => <span className="font-mono font-semibold text-neutral-700">#{l.MaLo}</span>,
    },
    {
      key: 'NgayNhap',
      header: 'Ngày nhập',
      render: (l) => (
        <span className="tabular-nums text-neutral-700">{formatDate(l.NgayNhap, 'DD/MM/YYYY')}</span>
      ),
    },
    {
      key: 'HanSD',
      header: 'HSD',
      render: (l) => (
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-neutral-700">{formatDate(l.HanSD, 'DD/MM/YYYY')}</span>
          <ExpiryBadge expiryDate={l.HanSD} />
        </div>
      ),
    },
    {
      key: 'SoLuong',
      header: 'SL',
      align: 'right',
      render: (l) => (
        <div className="text-right tabular-nums">
          <p className="font-semibold text-neutral-900">{l.SoLuongTonKho}</p>
          <p className="text-caption text-neutral-500">/ {l.SoLuongNhap} nhập</p>
        </div>
      ),
    },
    {
      key: 'GiaNhap',
      header: 'Giá nhập',
      align: 'right',
      render: (l) => <span className="font-mono text-neutral-700">{formatCurrency(l.GiaNhap)}</span>,
    },
    {
      key: 'NCC',
      header: 'Nhà cung cấp',
      render: (l) => (
        <span className="text-neutral-700">
          {l.TenNCC || <span className="italic text-neutral-400">#{l.MaNCC}</span>}
        </span>
      ),
    },
    {
      key: 'TrangThai',
      header: 'Trạng thái',
      render: (l) => (
        <span className={`inline-flex rounded-pill px-2 py-0.5 text-caption font-medium ${
          l.SoLuongTonKho <= 0
            ? 'bg-neutral-100 text-neutral-600'
            : l.SoNgayConLai <= 30
              ? 'bg-warning-100 text-warning-700'
              : 'bg-success-100 text-success-700'
        }`}>
          {l.SoLuongTonKho <= 0 ? 'Hết' : l.SoNgayConLai <= 30 ? 'Sắp hết hạn' : 'Còn hàng'}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Back link ──────────────────────────────────────── */}
      <Link
        to="/thuoc"
        className="inline-flex min-h-11 items-center gap-2 rounded-btn px-2 text-body font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-primary-700 active:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại danh sách thuốc
      </Link>

      {/* ── Hero header ────────────────────────────────────── */}
      <Card padding={false} className="border-neutral-200/80">
        <header className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 px-5 py-6 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-accent-400/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-card bg-white/15 text-white ring-1 ring-inset ring-white/20">
              <Pill className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-wider text-primary-100">
                Mã thuốc #{thuoc.MaThuoc}
              </p>
              <h1 className="mt-1 break-words text-h1 text-white">
                {editing ? (
                  <input
                    type="text"
                    name="tenThuoc"
                    value={formData.tenThuoc}
                    onChange={handleChange}
                    className="w-full rounded-btn border border-white/30 bg-white/10 px-3 py-2 text-h1 text-white placeholder-primary-200 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Tên thuốc"
                    disabled={saving}
                  />
                ) : thuoc.TenThuoc}
              </h1>
              {thuoc.HoatChat && !editing && (
                <p className="mt-1 text-body text-primary-100">Hoạt chất: {thuoc.HoatChat}</p>
              )}
              {!editing && (
                <span className="mt-3 inline-flex rounded-pill bg-white/10 px-3 py-1 text-caption font-medium text-white ring-1 ring-inset ring-white/20">
                  {thuoc.TenDM}
                </span>
              )}
            </div>
            <div className="self-start flex flex-col items-end gap-2">
              <StockBadge stock={stock} />
              {stock > 0 && hasRole(['Admin', 'NV_BanHang']) && (
                <button
                  type="button"
                  onClick={() => navigate(`/ban-hang?add=${thuoc.MaThuoc}`)}
                  className="inline-flex items-center gap-2 rounded-btn bg-accent-600 px-4 py-2 text-body font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 active:bg-accent-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  Bán ngay
                </button>
              )}
            </div>
          </div>

          {/* Action bar */}
          {isAdmin && (
            <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              {!editing ? (
                <>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<Edit3 className="h-4 w-4" aria-hidden="true" />}
                    onClick={startEdit}
                  >
                    Chỉnh sửa thông tin
                  </Button>
                  <span className="text-caption text-primary-100">
                    · Bạn có thể sửa tên, hoạt chất, khối lượng, giá và danh mục
                  </span>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Save className="h-4 w-4" aria-hidden="true" />}
                    onClick={saveEdit}
                    loading={saving}
                  >
                    Lưu thay đổi
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    icon={<X className="h-4 w-4" aria-hidden="true" />}
                    onClick={cancelEdit}
                    disabled={saving}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Hủy
                  </Button>
                  <span className="ml-auto text-caption text-primary-100">
                    Đang chỉnh sửa — nhấn Hủy để bỏ qua
                  </span>
                </>
              )}
            </div>
          )}
        </header>

        {/* ── Body content ────────────────────────────────── */}
        <div className="space-y-7 p-5 sm:p-8">
          {/* ═══ Section 1: Giá & Tồn kho ═══════════════════ */}
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">Tóm tắt giá và tồn kho</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Giá bán */}
              <div className="flex items-center gap-4 rounded-card border border-primary-100 bg-primary-50/50 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-white text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100">
                  <DollarSign className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-medium text-neutral-700">Giá bán tham khảo</p>
                  {editing ? (
                    <Input
                      type="number"
                      name="giaBanThamKhao"
                      value={formData.giaBanThamKhao}
                      onChange={handleChange}
                      min="0"
                      step="1000"
                      inputClassName="h-9"
                      disabled={saving}
                      error={formErrors.giaBanThamKhao}
                    />
                  ) : (
                    <p className="mt-0.5 text-h3 font-semibold tabular-nums text-primary-800">
                      {formatCurrency(thuoc.GiaBanThamKhao)}
                    </p>
                  )}
                  {formErrors.giaBanThamKhao && (
                    <p className="mt-1 text-caption text-danger-600">{formErrors.giaBanThamKhao}</p>
                  )}
                </div>
              </div>

              {/* Tồn kho */}
              <div className="flex items-center gap-4 rounded-card border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-white text-neutral-700 shadow-sm ring-1 ring-inset ring-neutral-200">
                  <Package className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-caption font-medium text-neutral-700">Tồn kho hiện tại</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-h3 font-semibold tabular-nums text-neutral-900">
                      {stock} <span className="text-body font-medium text-neutral-600">đơn vị</span>
                    </p>
                    <StockBadge stock={stock} />
                  </div>
                </div>
              </div>

              {/* Lợi nhuận ước tính */}
              {loiNhuanInfo && (
                <div className={`flex items-center gap-4 rounded-card border p-4 ${
                  loiNhuanInfo.tien > 0
                    ? 'border-success-200 bg-success-50/50'
                    : 'border-danger-200 bg-danger-50/50'
                }`}>
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-white shadow-sm ring-1 ring-inset ${
                    loiNhuanInfo.tien > 0 ? 'text-success-700 ring-success-200' : 'text-danger-700 ring-danger-200'
                  }`}>
                    {loiNhuanInfo.tien > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-medium text-neutral-700">Lợi nhuận / đơn vị (ước tính)</p>
                    <p className={`mt-0.5 text-h3 font-semibold tabular-nums ${loiNhuanInfo.tien > 0 ? 'text-success-800' : 'text-danger-800'}`}>
                      {formatCurrency(loiNhuanInfo.tien)}
                      <span className="ml-2 text-body font-medium text-neutral-600">({loiNhuanInfo.percent}%)</span>
                    </p>
                    {giaNhap && (
                      <p className="mt-0.5 text-caption text-neutral-500">
                        Giá nhập gần nhất: {formatCurrency(giaNhap.GiaNhap)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 2: Thông tin thuốc (inline edit) ═══ */}
          <section aria-labelledby="medicine-info-heading">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 id="medicine-info-heading" className="text-h3 text-neutral-900">
                  Thông tin thuốc
                </h2>
                <p className="mt-1 text-caption text-neutral-700">
                  {editing
                    ? 'Chỉnh sửa các trường bên dưới và nhấn Lưu.'
                    : 'Thông tin nhận diện và phân loại đang được lưu trong hệ thống.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditableField
                label="Hoạt chất"
                icon={Beaker}
                readOnly={!editing}
                value={thuoc.HoatChat}
              >
                <Input
                  type="text"
                  name="hoatChat"
                  value={formData.hoatChat}
                  onChange={handleChange}
                  placeholder="Paracetamol, Ibuprofen, …"
                  disabled={saving}
                />
              </EditableField>

              <EditableField
                label="Khối lượng / Quy cách"
                icon={Package}
                readOnly={!editing}
                value={thuoc.KhoiLuong}
              >
                <Input
                  type="text"
                  name="khoiLuong"
                  value={formData.khoiLuong}
                  onChange={handleChange}
                  placeholder="500mg, 10 viên/hộp, …"
                  disabled={saving}
                />
              </EditableField>

              <EditableField
                label="Danh mục"
                icon={FolderTree}
                readOnly={!editing}
                value={`${thuoc.MaDM} - ${thuoc.TenDM}`}
                error={formErrors.maDM}
              >
                <Select
                  name="maDM"
                  value={formData.maDM}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="-- Chọn danh mục --"
                  options={danhMucList.map(dm => ({
                    value: dm.MaDM,
                    label: `${dm.MaDM} - ${dm.TenDM}`,
                  }))}
                  className={formErrors.maDM ? '[&_select]:border-danger-500' : ''}
                />
              </EditableField>

              <EditableField
                label="Mã thuốc (không thể sửa)"
                icon={Pill}
                readOnly
                value={`#${thuoc.MaThuoc}`}
              />
            </div>

            {/* Inline form error ở cuối */}
            {formErrors.tenThuoc && (
              <p className="mt-3 flex items-center gap-1.5 text-caption text-danger-600">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {formErrors.tenThuoc}
              </p>
            )}
          </section>

          {/* ═══ Section 2b: Mô tả & Hướng dẫn ══════════════════ */}
          {(thuoc.MoTa || thuoc.LieuDung || thuoc.ChongChiDinh || thuoc.GhiChu || editing) && (
            <section aria-labelledby="description-heading" className="border-t border-neutral-200 pt-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="description-heading" className="flex items-center gap-2 text-h3 text-neutral-900">
                    <BookOpen className="h-5 w-5 text-neutral-700" aria-hidden="true" />
                    Mô tả & Hướng dẫn sử dụng
                  </h2>
                  <p className="mt-1 text-caption text-neutral-700">
                    Thông tin dành cho nhân viên tư vấn khách hàng.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Mô tả / Công dụng */}
                <EditableField
                  label="Mô tả / Công dụng"
                  icon={Info}
                  readOnly={!editing}
                  value={thuoc.MoTa}
                >
                  <textarea
                    name="moTa"
                    value={formData.moTa}
                    onChange={handleChange}
                    placeholder="Thuốc giảm đau, hạ sốt, điều trị cảm cúm và các triệu chứng liên quan..."
                    disabled={saving}
                    rows={3}
                    className="w-full rounded-card border border-neutral-300 bg-white px-3 py-2 text-body text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                  />
                </EditableField>

                {/* Liều dùng + Chống chỉ định */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EditableField
                    label="Liều dùng mặc định"
                    icon={TrendingUpIcon}
                    readOnly={!editing}
                    value={thuoc.LieuDung}
                  >
                    <textarea
                      name="lieuDung"
                      value={formData.lieuDung}
                      onChange={handleChange}
                      placeholder="Người lớn: 1-2 viên/lần, tối đa 8 viên/ngày. Trẻ em: theo cân nặng..."
                      disabled={saving}
                      rows={2}
                      className="w-full rounded-card border border-neutral-300 bg-white px-3 py-2 text-body text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                    />
                  </EditableField>

                  <EditableField
                    label="Chống chỉ định"
                    icon={AlertTriangle}
                    readOnly={!editing}
                    value={thuoc.ChongChiDinh}
                  >
                    <textarea
                      name="chongChiDinh"
                      value={formData.chongChiDinh}
                      onChange={handleChange}
                      placeholder="Suy gan nặng, mẫn cảm với paracetamol, phụ nữ mang thai 3 tháng cuối..."
                      disabled={saving}
                      rows={2}
                      className="w-full rounded-card border border-neutral-300 bg-white px-3 py-2 text-body text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                    />
                  </EditableField>
                </div>

                {/* Ghi chú NV */}
                <EditableField
                  label="Ghi chú cho nhân viên"
                  icon={Lightbulb}
                  readOnly={!editing}
                  value={thuoc.GhiChu}
                >
                  <textarea
                    name="ghiChu"
                    value={formData.ghiChu}
                    onChange={handleChange}
                    placeholder="Hàng hot cuối tuần, nên nhập thêm trước thứ 6, khách hay hỏi về thuốc này..."
                    disabled={saving}
                    rows={2}
                    className="w-full rounded-card border border-neutral-300 bg-white px-3 py-2 text-body text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                  />
                </EditableField>
              </div>
            </section>
          )}

          {/* ═══ Section 3: Sản phẩm cùng hoạt chất ══════════ */}
          {thuoc.HoatChat && !editing && (
            <section aria-labelledby="similar-heading" className="border-t border-neutral-200 pt-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="similar-heading" className="flex items-center gap-2 text-h3 text-neutral-900">
                    <Shuffle className="h-5 w-5 text-neutral-700" aria-hidden="true" />
                    Sản phẩm cùng hoạt chất
                  </h2>
                  <p className="mt-1 text-caption text-neutral-700">
                    Gợi ý thay thế khi thuốc này hết hàng · Hoạt chất: <strong>{thuoc.HoatChat}</strong>
                  </p>
                </div>
              </div>

              {similarLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-card bg-neutral-100 animate-pulse" />
                  ))}
                </div>
              ) : similarList.length === 0 ? (
                <div className="rounded-card border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                  <PackageIcon className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                  <p className="text-body text-neutral-500">Không có sản phẩm thay thế cùng hoạt chất</p>
                  <p className="text-caption text-neutral-400 mt-1">
                    Thuốc này là duy nhất chứa "{thuoc.HoatChat}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {similarList.map(similar => (
                    <button
                      key={similar.MaThuoc}
                      type="button"
                      onClick={() => navigate(`/thuoc/${similar.MaThuoc}`)}
                      className="group flex flex-col gap-2 rounded-card border border-neutral-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:shadow-card hover:bg-primary-50/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-semibold text-neutral-900 line-clamp-2 leading-tight group-hover:text-primary-700">
                            {similar.TenThuoc}
                          </p>
                          {similar.KhoiLuong && (
                            <p className="text-caption text-neutral-500 mt-0.5">{similar.KhoiLuong}</p>
                          )}
                        </div>
                        <StockBadge stock={similar.SoLuongTonKho} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-body font-bold font-mono text-primary-700">
                          {formatCurrency(similar.GiaBanThamKhao)}
                        </p>
                        <span className="text-caption text-neutral-400 group-hover:text-primary-600">
                          Xem →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ═══ Section 4: Lịch sử lô nhập (read-only) ═════ */}
          <section aria-labelledby="lots-heading" className="border-t border-neutral-200 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="lots-heading" className="flex items-center gap-2 text-h3 text-neutral-900">
                  <Truck className="h-5 w-5 text-neutral-700" aria-hidden="true" />
                  Lô thuốc còn hàng ({loList.length})
                </h2>
                <p className="mt-1 text-caption text-neutral-700">
                  Sắp xếp theo HSD tăng dần (FIFO — lô hết hạn trước sẽ xuất trước).
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-pill bg-info-50 px-3 py-1 text-caption font-medium text-info-700 ring-1 ring-inset ring-info-200">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Chỉ xem — tồn kho thay đổi qua phiếu nhập / bán hàng
              </span>
            </div>

            {loLoading ? (
              <LoadingState label="Đang tải danh sách lô..." />
            ) : loList.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <Package className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
                <p className="mt-3 text-body font-medium text-neutral-700">Chưa có lô nào còn hàng</p>
                <p className="mt-1 text-caption text-neutral-500">
                  Thuốc này chưa nhập kho hoặc tất cả các lô đã hết hạn / bán hết.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-neutral-200">
                <Table
                  data={loList}
                  columns={loColumns}
                  rowKey="MaLo"
                  striped
                />
              </div>
            )}
          </section>

          {/* ═══ Section 4: Lịch sử hệ thống ═══════════════ */}
          <section aria-labelledby="system-info-heading" className="border-t border-neutral-200 pt-6">
            <div className="mb-4">
              <h2 id="system-info-heading" className="flex items-center gap-2 text-body font-semibold text-neutral-900">
                <History className="h-4 w-4" aria-hidden="true" />
                Thông tin hệ thống
              </h2>
              <p className="mt-0.5 text-caption text-neutral-700">Lịch sử tạo và cập nhật bản ghi.</p>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" aria-hidden="true" />
                <div>
                  <dt className="text-caption font-medium text-neutral-700">Ngày tạo</dt>
                  <dd className="mt-1 text-body font-medium tabular-nums text-neutral-900">
                    <time dateTime={thuoc.CreatedAt}>
                      {formatDate(thuoc.CreatedAt, 'DD/MM/YYYY HH:mm') || 'Chưa cập nhật'}
                    </time>
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <RefreshCw className="mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-600" aria-hidden="true" />
                <div>
                  <dt className="text-caption font-medium text-neutral-700">Cập nhật gần nhất</dt>
                  <dd className="mt-1 text-body font-medium tabular-nums text-neutral-900">
                    <time dateTime={thuoc.UpdatedAt}>
                      {formatDate(thuoc.UpdatedAt, 'DD/MM/YYYY HH:mm') || 'Chưa cập nhật'}
                    </time>
                  </dd>
                </div>
              </div>
            </dl>
          </section>
        </div>
      </Card>

      {/* Banner cảnh báo quyền cho non-admin */}
      {!isAdmin && (
        <div className="rounded-card border border-info-200 bg-info-50 p-3 text-caption text-info-700">
          <p>
            <strong>Quyền của bạn:</strong> chỉ xem thông tin. Chỉ Admin mới có thể chỉnh sửa.
          </p>
        </div>
      )}
    </div>
  );
}

export default ThuocDetailPage;

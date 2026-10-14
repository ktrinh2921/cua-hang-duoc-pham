/**
 * NhaCungCapPage - Quản lý nhà cung cấp (CRUD + Stats + Chi tiết)
 *
 * Nâng cấp UI tương tự KhachHangPage:
 *  • Stats: Tổng NCC, Mới tháng này, Có SĐT, Hoạt động (90 ngày)
 *  • Segment badges: Chiến lược / Thường xuyên / Thỉnh thoảng / Mới
 *  • Filter: keyword + segment
 *  • Table nâng cấp: avatar, segment, số phiếu nhập, tổng tiền nhập, lần cuối
 *  • Modal chi tiết: profile + stats + lịch sử phiếu nhập
 *
 * Write: Admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Truck, Plus, Edit2, Trash2, Building2, Phone, Calendar,
    Package, TrendingUp, Clock, X, Eye, MapPin,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import nhaCungCapService from '../../services/nhaCungCapService';
import RoleGuard from '../../components/ui/RoleGuard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Segment helpers ───────────────────────────────────────────────────────────

const SEGMENT_VARIANT = {
    ChienLuoc:   'warning',
    ThuongXuyen: 'info',
    ThinhThoang: 'success',
    Moi:         'neutral',
};

const SEGMENT_LABEL = {
    ChienLuoc:   'Chiến lược',
    ThuongXuyen: 'Thường xuyên',
    ThinhThoang: 'Thỉnh thoảng',
    Moi:         'Mới',
};

// ─── Supplier avatar ──────────────────────────────────────────────────────────

function SupplierAvatar({ name, size = 'md' }) {
    const initial = name ? name.trim()[0].toUpperCase() : '?';
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-caption' : 'w-10 h-10 text-body';
    // Pick hue from name for consistent color (different hue range from KH)
    const hue = name ? (name.charCodeAt(0) * 53 + 120) % 360 : 200;
    return (
        <span
            className={cn(
                'flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 select-none',
                sizeClass
            )}
            style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }}
            aria-hidden="true"
        >
            {initial}
        </span>
    );
}

// ─── Stat mini (compact stat inside modal) ─────────────────────────────────────

const STAT_MINI_COLOR = {
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    warning: 'text-warning-600 bg-warning-50',
    danger:  'text-danger-600 bg-danger-50',
    info:    'text-info-600 bg-info-50',
    neutral: 'text-neutral-600 bg-neutral-100',
};

function StatMini({ label, value, color = 'primary' }) {
    return (
        <div className={cn(
            'rounded-card p-3 text-center',
            STAT_MINI_COLOR[color]
        )}>
            <p className="text-caption opacity-80 mb-1">{label}</p>
            <p className="text-h3 font-bold font-mono leading-tight break-words" title={String(value)}>
                {value}
            </p>
        </div>
    );
}

// ─── Supplier Detail Modal ─────────────────────────────────────────────────────

function SupplierDetailModal({ ncc, phieuNhap = [], loadingPhieuNhap = false, onClose, onEdit }) {
    if (!ncc) return null;

    const tongNhap = Number(ncc.TongNhap) || 0;
    const soPhieu = Number(ncc.SoPhieu) || 0;
    const soLo = Number(ncc.SoLo) || 0;
    const tongSoLuong = Number(ncc.TongSoLuongNhap) || 0;
    const tongSoLuongTon = Number(ncc.TongSoLuongTon) || 0;
    const trungBinh = soPhieu > 0 ? tongNhap / soPhieu : 0;

    return (
        <Modal open={!!ncc} onClose={onClose} size="xl" title="Chi tiết nhà cung cấp">
            <div className="space-y-6">
                {/* Header row */}
                <div className="flex items-start gap-4">
                    <SupplierAvatar name={ncc.TenNCC} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-h2 text-neutral-900 truncate">{ncc.TenNCC}</h2>
                            <Badge variant={SEGMENT_VARIANT[ncc.Segment] || 'neutral'} dot>
                                {SEGMENT_LABEL[ncc.Segment] || ncc.Segment || '—'}
                            </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-neutral-500">
                            {ncc.SDT && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                                    {ncc.SDT}
                                </span>
                            )}
                            {ncc.DiaChi && (
                                <span className="flex items-center gap-1 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                                    <span className="truncate max-w-xs" title={ncc.DiaChi}>
                                        {ncc.DiaChi}
                                    </span>
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                                Tạo hồ sơ {ncc.CreatedAt ? dayjs(ncc.CreatedAt).format('DD/MM/YYYY') : '—'}
                            </span>
                        </div>
                    </div>

                    <RoleGuard roles={['Admin']}>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 className="w-4 h-4" />}
                            onClick={() => { onClose(); onEdit(ncc); }}
                        >
                            Sửa
                        </Button>
                    </RoleGuard>
                </div>

                {/* Supplier profile */}
                <div className="rounded-card border border-neutral-200 bg-neutral-50 p-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <dt className="text-caption text-neutral-500">Mã số thuế</dt>
                            <dd className="mt-1 text-body font-medium text-neutral-800">
                                {ncc.MaSoThue || '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-caption text-neutral-500">Email</dt>
                            <dd className="mt-1 break-all text-body font-medium text-neutral-800">
                                {ncc.Email || '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-caption text-neutral-500">Người liên hệ</dt>
                            <dd className="mt-1 text-body font-medium text-neutral-800">
                                {ncc.NguoiLienHe || '—'}
                            </dd>
                        </div>
                    </dl>
                    {ncc.GhiChu && (
                        <div className="mt-4 border-t border-neutral-200 pt-3">
                            <p className="text-caption text-neutral-500">Ghi chú</p>
                            <p className="mt-1 whitespace-pre-wrap text-body text-neutral-700">{ncc.GhiChu}</p>
                        </div>
                    )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini
                        label="Tổng tiền nhập"
                        value={formatCurrency(tongNhap)}
                        color="primary"
                    />
                    <StatMini
                        label="Số phiếu nhập"
                        value={String(soPhieu)}
                        color="success"
                    />
                    <StatMini
                        label="Trung bình/phiếu"
                        value={formatCurrency(trungBinh)}
                        color="info"
                    />
                    <StatMini
                        label="Lần cuối nhập"
                        value={
                            ncc.LanCuoiNhap
                                ? dayjs(ncc.LanCuoiNhap).fromNow()
                                : '—'
                        }
                        color={ncc.LanCuoiNhap ? 'warning' : 'neutral'}
                    />
                </div>

                {/* Sub stats - inventory */}
                {soPhieu > 0 && (
                    <div className="grid grid-cols-2 gap-3 rounded-card bg-neutral-50 p-4 sm:grid-cols-4">
                        <div className="text-center">
                            <p className="text-caption text-neutral-500 mb-0.5">Lần đầu nhập</p>
                            <p className="text-body font-semibold text-neutral-900">
                                {ncc.LanDauNhap ? dayjs(ncc.LanDauNhap).format('DD/MM/YYYY') : '—'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-caption text-neutral-500 mb-0.5">Tổng lô</p>
                            <p className="text-h3 font-bold text-neutral-900 font-mono">{soLo}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-caption text-neutral-500 mb-0.5">Đã nhập</p>
                            <p className="text-h3 font-bold text-primary-700 font-mono">
                                {tongSoLuong.toLocaleString('vi-VN')}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-caption text-neutral-500 mb-0.5">Còn tồn</p>
                            <p className="text-h3 font-bold text-success-700 font-mono">
                                {tongSoLuongTon.toLocaleString('vi-VN')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Order history */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-body font-semibold text-neutral-800">Lịch sử nhập hàng</h3>
                        <span className="text-caption text-neutral-500">{phieuNhap.length} phiếu gần nhất</span>
                    </div>

                    {loadingPhieuNhap ? (
                        <div className="text-center py-8 text-neutral-400 text-body">Đang tải lịch sử nhập hàng...</div>
                    ) : phieuNhap.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-10 h-10 mx-auto text-neutral-200 mb-2" />
                            <p className="text-body text-neutral-500">Chưa có phiếu nhập nào</p>
                        </div>
                    ) : (
                        <div className="border border-neutral-200 rounded-card overflow-hidden">
                            <table className="w-full text-body">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Mã PN</th>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Ngày nhập</th>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Nhân viên</th>
                                        <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">Số lô</th>
                                        <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">SL nhập</th>
                                        <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {phieuNhap.map((pn) => (
                                        <tr key={pn.MaPN} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <span className="font-mono text-neutral-500">#{pn.MaPN}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-neutral-700">
                                                {dayjs(pn.NgayNhap).format('DD/MM/YYYY HH:mm')}
                                            </td>
                                            <td className="px-4 py-2.5 text-neutral-700">{pn.TenNV || '—'}</td>
                                            <td className="px-4 py-2.5 text-center text-neutral-700">{pn.SoLo}</td>
                                            <td className="px-4 py-2.5 text-center text-neutral-700">
                                                {pn.TongSoLuong.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-neutral-900">
                                                {formatCurrency(pn.TongTien)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function NhaCungCapPage() {
    // ── Stats ───────────────────────────────────────────────────────────────
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // ── Table data ──────────────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0,
    });
    const [loading, setLoading] = useState(false);

    // ── Filters ─────────────────────────────────────────────────────────────
    const [keyword, setKeyword] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [segment, setSegment] = useState('');

    // ── Modal: create / edit ────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        tenNCC: '',
        diaChi: '',
        sdt: '',
        email: '',
        maSoThue: '',
        nguoiLienHe: '',
        ghiChu: '',
    });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Modal: detail ───────────────────────────────────────────────────────
    const [detailNCC, setDetailNCC] = useState(null);
    const [phieuNhap, setPhieuNhap] = useState([]);
    const [phieuNhapLoading, setPhieuNhapLoading] = useState(false);

    // ── Confirm delete ──────────────────────────────────────────────────────
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Debounce search ─────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => setKeyword(keywordInput), 400);
        return () => clearTimeout(t);
    }, [keywordInput]);

    // ── Fetch stats ─────────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await nhaCungCapService.getStats();
            setStats(res.data);
        } catch {
            // non-critical — stats fail silently
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ── Fetch table ─────────────────────────────────────────────────────────
    const fetchData = useCallback(async (page = pagination.page) => {
        setLoading(true);
        try {
            const res = await nhaCungCapService.getAll({
                keyword,
                segment,
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
    }, [keyword, segment, pagination.page]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword, segment]);

    // ── Open create ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditing(null);
        setFormError('');
        setFormData({
            tenNCC: '',
            diaChi: '',
            sdt: '',
            email: '',
            maSoThue: '',
            nguoiLienHe: '',
            ghiChu: '',
        });
        setModalOpen(true);
    };

    // ── Open edit (from detail modal) ──────────────────────────────────────
    const openEdit = (ncc) => {
        setEditing(ncc);
        setFormError('');
        setFormData({
            tenNCC: ncc.TenNCC,
            diaChi: ncc.DiaChi || '',
            sdt: ncc.SDT || '',
            email: ncc.Email || '',
            maSoThue: ncc.MaSoThue || '',
            nguoiLienHe: ncc.NguoiLienHe || '',
            ghiChu: ncc.GhiChu || '',
        });
        setModalOpen(true);
    };

    // ── Open detail ─────────────────────────────────────────────────────────
    const openDetail = useCallback(async (ncc) => {
        // Show modal immediately with row data (already has SoPhieu, TongNhap, etc.)
        setDetailNCC({ ...ncc });
        setPhieuNhap([]);
        setPhieuNhapLoading(true);
        try {
            const [detailRes, pnRes] = await Promise.all([
                nhaCungCapService.getById(ncc.MaNCC),
                nhaCungCapService.getPhieuNhapByNCC(ncc.MaNCC, 10),
            ]);
            setDetailNCC(detailRes.data);
            setPhieuNhap(pnRes.data || []);
        } catch {
            toast.error('Không thể tải chi tiết nhà cung cấp');
        } finally {
            setPhieuNhapLoading(false);
        }
    }, []);

    // ── Submit form ─────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!formData.tenNCC.trim()) {
            setFormError('Vui lòng nhập tên nhà cung cấp');
            return;
        }
        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            setFormError('Email không đúng định dạng');
            return;
        }
        if (formData.maSoThue.trim() && !/^\d{10}(?:-\d{3})?$/.test(formData.maSoThue.trim())) {
            setFormError('Mã số thuế phải gồm 10 chữ số hoặc có dạng 0123456789-001');
            return;
        }

        setSubmitting(true);
        try {
            if (editing) {
                await nhaCungCapService.update(editing.MaNCC, formData);
                toast.success('Cập nhật thành công');
            } else {
                await nhaCungCapService.create(formData);
                toast.success('Tạo nhà cung cấp thành công');
            }
            setModalOpen(false);
            fetchData(pagination.page);
            fetchStats();
        } catch (err) {
            const msg = err.response?.data?.error?.message || 'Thao tác thất bại';
            setFormError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            await nhaCungCapService.remove(confirmDeleteId);
            toast.success('Xóa thành công');
            setConfirmDeleteId(null);
            fetchData(pagination.page);
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Không thể xóa');
        } finally {
            setDeleting(false);
        }
    };

    const hasActiveFilters = Boolean(keyword || segment);
    const deletingItem = items.find((i) => i.MaNCC === confirmDeleteId);

    // ── Table columns ────────────────────────────────────────────────────────
    const columns = [
        {
            key: 'avatar',
            label: '',
            width: '40px',
            render: (it) => <SupplierAvatar name={it.TenNCC} size="sm" />,
        },
        {
            key: 'name',
            label: 'Nhà cung cấp',
            render: (it) => (
                <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-neutral-900 truncate">{it.TenNCC}</span>
                            <Badge variant={SEGMENT_VARIANT[it.Segment] || 'neutral'} size="sm">
                                {SEGMENT_LABEL[it.Segment] || it.Segment || '—'}
                            </Badge>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'sdt',
            label: 'SĐT',
            render: (it) => (
                <span className="flex items-center gap-1 text-neutral-700">
                    {it.SDT ? (
                        <>
                            <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                            {it.SDT}
                        </>
                    ) : (
                        <span className="text-neutral-400">—</span>
                    )}
                </span>
            ),
        },
        {
            key: 'diaChi',
            label: 'Địa chỉ',
            render: (it) => (
                <span className="flex items-center gap-1 text-neutral-700 min-w-0">
                    {it.DiaChi ? (
                        <>
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate max-w-[200px]" title={it.DiaChi}>
                                {it.DiaChi}
                            </span>
                        </>
                    ) : (
                        <span className="text-neutral-400">—</span>
                    )}
                </span>
            ),
        },
        {
            key: 'soPhieu',
            label: 'Số phiếu',
            align: 'center',
            width: '90px',
            render: (it) => (
                <span className={cn(
                    'font-semibold font-mono',
                    it.SoPhieu > 0 ? 'text-primary-700' : 'text-neutral-400'
                )}>
                    {it.SoPhieu > 0 ? it.SoPhieu : '—'}
                </span>
            ),
        },
        {
            key: 'tongNhap',
            label: 'Tổng tiền nhập',
            align: 'right',
            width: '150px',
            render: (it) => (
                <span className={cn(
                    'font-mono font-medium',
                    it.TongNhap > 0 ? 'text-neutral-900' : 'text-neutral-400'
                )}>
                    {it.TongNhap > 0 ? formatCurrency(it.TongNhap) : '—'}
                </span>
            ),
        },
        {
            key: 'lanCuoi',
            label: 'Lần cuối',
            width: '130px',
            render: (it) => (
                <span className="text-neutral-500">
                    {it.LanCuoiNhap
                        ? dayjs(it.LanCuoiNhap).fromNow()
                        : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            width: '120px',
            render: (it) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openDetail(it); }}
                        className="p-1.5 rounded-btn text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ${it.TenNCC}`}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <RoleGuard roles={['Admin']}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEdit(it); }}
                            className="p-1.5 rounded-btn text-info-600 hover:bg-info-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            title="Sửa"
                            aria-label={`Sửa ${it.TenNCC}`}
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(it.MaNCC); }}
                            className="p-1.5 rounded-btn text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            title="Xóa"
                            aria-label={`Xóa ${it.TenNCC}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </RoleGuard>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* ── Page header ─────────────────────────────────────────────────── */}
            <PageHeader
                icon={<Truck />}
                title="Nhà cung cấp"
                subtitle="Quản lý nhà cung cấp và lịch sử nhập hàng"
                actions={
                    <RoleGuard roles={['Admin']}>
                        <Button variant="primary" icon={<Plus />} onClick={openCreate}>
                            Thêm nhà cung cấp
                        </Button>
                    </RoleGuard>
                }
            />

            {/* ── Stats row ─────────────────────────────────────────────────── */}
            <section
                aria-label="Thống kê nhà cung cấp"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <StatCard
                    icon={<Truck className="h-5 w-5" />}
                    label="Tổng nhà cung cấp"
                    value={statsLoading ? '—' : (stats?.tongNhaCungCap ?? 0).toLocaleString('vi-VN')}
                    color="primary"
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Mới tháng này"
                    value={statsLoading ? '—' : (stats?.moiThangNay ?? 0).toLocaleString('vi-VN')}
                    color="success"
                />
                <StatCard
                    icon={<Phone className="h-5 w-5" />}
                    label="Có số điện thoại"
                    value={statsLoading ? '—' : (stats?.coSdt ?? 0).toLocaleString('vi-VN')}
                    color="info"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Hoạt động (90 ngày)"
                    value={statsLoading ? '—' : (stats?.hoatDong ?? 0).toLocaleString('vi-VN')}
                    color={stats && stats.hoatDong > 0 ? 'warning' : 'neutral'}
                />
            </section>

            {/* ── Filter toolbar ─────────────────────────────────────────────── */}
            <SearchBar
                value={keywordInput}
                onChange={setKeywordInput}
                placeholder="Tìm tên, địa chỉ, email, mã số thuế..."
                title="Tìm kiếm và lọc"
                description="Lọc theo từ khóa hoặc phân khúc nhà cung cấp."
                meta={loading ? 'Đang cập nhật...' : `${pagination.total} kết quả`}
            >
                {/* Segment filter */}
                <Select
                    label="Phân khúc"
                    value={segment}
                    onChange={(v) => setSegment(v)}
                    options={[
                        { value: '', label: 'Tất cả phân khúc' },
                        { value: 'ChienLuoc', label: '⭐ Chiến lược' },
                        { value: 'ThuongXuyen', label: '💎 Thường xuyên' },
                        { value: 'ThinhThoang', label: '✓ Thỉnh thoảng' },
                        { value: 'Moi', label: '🌱 Mới' },
                    ]}
                    placeholder="Phân khúc"
                    className="w-full sm:w-[170px]"
                    selectClassName="h-10"
                    aria-label="Lọc theo phân khúc"
                />

                {/* Reset filters */}
                {hasActiveFilters && (
                    <Button
                        variant="secondary"
                        size="lg"
                        icon={<X className="h-4 w-4" />}
                        onClick={() => {
                            setKeywordInput('');
                            setKeyword('');
                            setSegment('');
                        }}
                        title="Xóa bộ lọc"
                        className="w-full sm:w-auto"
                    >
                        Xóa lọc
                    </Button>
                )}
            </SearchBar>

            {/* ── Segment legend ─────────────────────────────────────────────── */}
            {stats && (
                <div className="flex flex-wrap items-center gap-3 text-caption">
                    <span className="text-neutral-500">Phân khúc:</span>
                    {[
                        { key: 'ChienLuoc', label: '⭐ Chiến lược', variant: 'warning' },
                        { key: 'ThuongXuyen', label: '💎 Thường xuyên', variant: 'info' },
                        { key: 'ThinhThoang', label: '✓ Thỉnh thoảng', variant: 'success' },
                        { key: 'Moi', label: '🌱 Mới', variant: 'neutral' },
                    ].map(({ key, label, variant }) => (
                        <Badge key={key} variant={variant} size="sm" dot>
                            {label}{' '}
                            <span className="font-mono font-bold text-neutral-700">
                                {stats.segments?.[key] ?? 0}
                            </span>
                        </Badge>
                    ))}
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────────── */}
            <Table
                columns={columns}
                data={items}
                loading={loading}
                rowKey="MaNCC"
                emptyTitle={
                    hasActiveFilters
                        ? 'Không tìm thấy nhà cung cấp phù hợp'
                        : 'Chưa có nhà cung cấp nào'
                }
                emptyDescription={
                    hasActiveFilters
                        ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                        : 'Thêm nhà cung cấp đầu tiên để bắt đầu nhập hàng.'
                }
                emptyIcon={<Building2 />}
                emptyAction={
                    hasActiveFilters ? (
                        <Button
                            variant="secondary"
                            icon={<X className="h-4 w-4" />}
                            onClick={() => {
                                setKeywordInput('');
                                setKeyword('');
                                setSegment('');
                            }}
                        >
                            Xóa bộ lọc
                        </Button>
                    ) : undefined
                }
                onRowClick={openDetail}
            />

            {/* ── Pagination ────────────────────────────────────────────────── */}
            <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onChange={(p) => fetchData(p)}
                loading={loading}
            />

            {/* ── Modal: Create / Edit ──────────────────────────────────────── */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Tên nhà cung cấp"
                        required
                        value={formData.tenNCC}
                        onChange={(e) => setFormData({ ...formData, tenNCC: e.target.value })}
                        maxLength={400}
                        placeholder="VD: Công ty Dược phẩm ABC"
                    />
                    <Textarea
                        label="Địa chỉ"
                        value={formData.diaChi}
                        onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                        maxLength={1000}
                        placeholder="VD: Số 123 Nguyễn Văn Cừ, Long Biên, Hà Nội"
                        rows={2}
                    />
                    <Input
                        label="Số điện thoại"
                        value={formData.sdt}
                        onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                        placeholder="VD: 02812345678"
                        hint="10–11 chữ số"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            maxLength={254}
                            placeholder="VD: lienhe@duocpham.vn"
                        />
                        <Input
                            label="Mã số thuế"
                            value={formData.maSoThue}
                            onChange={(e) => setFormData({ ...formData, maSoThue: e.target.value })}
                            maxLength={14}
                            placeholder="VD: 0123456789"
                            hint="10 số hoặc dạng 0123456789-001"
                        />
                    </div>
                    <Input
                        label="Người liên hệ"
                        value={formData.nguoiLienHe}
                        onChange={(e) => setFormData({ ...formData, nguoiLienHe: e.target.value })}
                        maxLength={200}
                        placeholder="VD: Nguyễn Văn An"
                    />
                    <Textarea
                        label="Ghi chú"
                        value={formData.ghiChu}
                        onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                        maxLength={1000}
                        placeholder="Thông tin giao hàng, thanh toán hoặc lưu ý khác"
                        rows={3}
                    />

                    {formError && (
                        <div className="p-3 bg-danger-50 border border-danger-100 rounded-btn text-caption text-danger-700">
                            {formError}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setModalOpen(false)}
                            disabled={submitting}
                        >
                            Hủy
                        </Button>
                        <Button variant="primary" type="submit" loading={submitting}>
                            {editing ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Modal: Supplier detail ────────────────────────────────────── */}
            <SupplierDetailModal
                ncc={detailNCC}
                phieuNhap={phieuNhap}
                loadingPhieuNhap={phieuNhapLoading}
                onClose={() => setDetailNCC(null)}
                onEdit={openEdit}
            />

            {/* ── Confirm delete ─────────────────────────────────────────────── */}
            <ConfirmDialog
                open={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Xóa nhà cung cấp"
                message={
                    deletingItem
                        ? `Bạn có chắc chắn muốn xóa nhà cung cấp "${deletingItem.TenNCC}"? Hành động này không thể hoàn tác.`
                        : ''
                }
                confirmLabel="Xóa"
            />
        </div>
    );
}

export default NhaCungCapPage;

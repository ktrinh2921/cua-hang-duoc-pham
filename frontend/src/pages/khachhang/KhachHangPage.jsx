/**
 * KhachHangPage - Quản lý khách hàng (CRUD + Stats + Chi tiết)
 *
 * Nâng cấp UI Phase 1:
 *  • Stats: Tổng KH, Mới tháng này, Có SĐT, Hoạt động (90 ngày)
 *  • Segment badges: VIP / Thân thiết / Thường / Mới
 *  • Filter: keyword + segment + giới tính
 *  • Table nâng cấp: avatar, segment, số đơn, tổng chi, lần cuối
 *  • Modal chi tiết: profile + stats + lịch sử hóa đơn
 *
 * Write: Admin + NV_BanHang.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Users, Plus, Edit2, Trash2, UserPlus, Phone, Calendar,
    ShoppingBag, TrendingUp, Clock, ChevronDown, X, Eye,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import khachHangService from '../../services/khachHangService';
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
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Segment helpers ───────────────────────────────────────────────────────────

const SEGMENT_VARIANT = {
    VIP:       'warning',
    ThanThiet: 'info',
    Thuong:    'success',
    Moi:       'neutral',
};

const SEGMENT_LABEL = {
    VIP:       'VIP',
    ThanThiet: 'Thân thiết',
    Thuong:    'Thường',
    Moi:       'Mới',
};

// ─── Avatar component ───────────────────────────────────────────────────────────

function CustomerAvatar({ name, size = 'md' }) {
    const initial = name ? name.trim()[0].toUpperCase() : '?';
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-caption' : 'w-10 h-10 text-body';
    // Pick hue from name for consistent color
    const hue = name ? name.charCodeAt(0) * 37 % 360 : 200;
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

// ─── Customer Detail Modal ─────────────────────────────────────────────────────

function CustomerDetailModal({ kh, orders = [], onClose, onEdit }) {
    if (!kh) return null;

    const tongChi = Number(kh.TongChi) || 0;
    const soDon = Number(kh.SoDon) || 0;
    const trungBinh = soDon > 0 ? tongChi / soDon : 0;

    return (
        <Modal open={!!kh} onClose={onClose} size="xl" title="Chi tiết khách hàng">
            <div className="space-y-6">
                {/* Header row */}
                <div className="flex items-start gap-4">
                    <CustomerAvatar name={kh.TenKH} size="lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-h2 text-neutral-900 truncate">{kh.TenKH}</h2>
                            <Badge variant={SEGMENT_VARIANT[kh.Segment] || 'neutral'} dot>
                                {SEGMENT_LABEL[kh.Segment] || kh.Segment || '—'}
                            </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-neutral-500">
                            {kh.SDT && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                                    {kh.SDT}
                                </span>
                            )}
                            {kh.GioiTinh && (
                                <span>{kh.GioiTinh}</span>
                            )}
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                                Tham gia {kh.NgayTao ? dayjs(kh.NgayTao).format('DD/MM/YYYY') : '—'}
                            </span>
                        </div>
                    </div>

                    <RoleGuard roles={['Admin', 'NV_BanHang']}>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 className="w-4 h-4" />}
                            onClick={() => { onClose(); onEdit(kh); }}
                        >
                            Sửa
                        </Button>
                    </RoleGuard>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini
                        label="Tổng chi tiêu"
                        value={formatCurrency(tongChi)}
                        color="primary"
                    />
                    <StatMini
                        label="Số đơn hàng"
                        value={String(soDon)}
                        color="success"
                    />
                    <StatMini
                        label="Trung bình/đơn"
                        value={formatCurrency(trungBinh)}
                        color="info"
                    />
                    <StatMini
                        label="Lần cuối mua"
                        value={
                            kh.LanCuoiMua
                                ? dayjs(kh.LanCuoiMua).fromNow()
                                : '—'
                        }
                        color={kh.LanCuoiMua ? 'warning' : 'neutral'}
                    />
                </div>

                {/* Order history */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-body font-semibold text-neutral-800">Lịch sử mua hàng</h3>
                        <span className="text-caption text-neutral-500">{orders.length} đơn gần nhất</span>
                    </div>

                    {kh._loadingOrders ? (
                        <div className="text-center py-8 text-neutral-400 text-body">Đang tải lịch sử mua hàng...</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-8">
                            <ShoppingBag className="w-10 h-10 mx-auto text-neutral-200 mb-2" />
                            <p className="text-body text-neutral-500">Chưa có hóa đơn nào</p>
                        </div>
                    ) : (
                        <div className="border border-neutral-200 rounded-card overflow-hidden">
                            <table className="w-full text-body">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Mã HD</th>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Ngày</th>
                                        <th className="px-4 py-2 text-left text-caption font-semibold text-neutral-600">Nhân viên</th>
                                        <th className="px-4 py-2 text-center text-caption font-semibold text-neutral-600">Mặt hàng</th>
                                        <th className="px-4 py-2 text-right text-caption font-semibold text-neutral-600">Tổng tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {orders.map((o) => (
                                        <tr key={o.MaHD} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <span className="font-mono text-neutral-500">#{o.MaHD}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-neutral-700">
                                                {dayjs(o.NgayGioLap).format('DD/MM/YYYY HH:mm')}
                                            </td>
                                            <td className="px-4 py-2.5 text-neutral-700">{o.TenNV || '—'}</td>
                                            <td className="px-4 py-2.5 text-center text-neutral-700">{o.SoMatHang}</td>
                                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-neutral-900">
                                                {formatCurrency(o.TongTien)}
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
            <p className="text-h3 font-bold font-mono truncate">{value}</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function KhachHangPage() {
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
    const [keywordInput, setKeywordInput] = useState(''); // debounced input
    const [segment, setSegment] = useState('');
    const [gioiTinh, setGioiTinh] = useState('');

    // ── Modal: create / edit ────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ tenKH: '', sdt: '', gioiTinh: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Modal: detail ───────────────────────────────────────────────────────
    const [detailKH, setDetailKH] = useState(null);
    const [orders, setOrders] = useState([]);

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
            const res = await khachHangService.getStats();
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
            const res = await khachHangService.getAll({
                keyword,
                segment,
                gioiTinh,
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
    }, [keyword, segment, gioiTinh, pagination.page]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword, segment, gioiTinh]);

    // ── Open create ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditing(null);
        setFormError('');
        setFormData({ tenKH: '', sdt: '', gioiTinh: '' });
        setModalOpen(true);
    };

    // ── Open edit (from detail modal) ──────────────────────────────────────
    const openEdit = (kh) => {
        setEditing(kh);
        setFormError('');
        setFormData({
            tenKH: kh.TenKH,
            sdt: kh.SDT || '',
            gioiTinh: kh.GioiTinh || '',
        });
        setModalOpen(true);
    };

    // ── Open detail ─────────────────────────────────────────────────────────
    const openDetail = useCallback(async (kh) => {
        // Show modal immediately with row data (already has SoDon, TongChi, etc.)
        // Then fetch fresh full details + orders
        setDetailKH({ ...kh, _loadingOrders: true });
        setOrders([]);
        try {
            const [detailRes, ordersRes] = await Promise.all([
                khachHangService.getById(kh.MaKH),
                khachHangService.getHoaDonByKhachHang(kh.MaKH, 10),
            ]);
            setDetailKH(detailRes.data);
            setOrders(ordersRes.data || []);
        } catch {
            // Keep showing partial data, show error only
            setDetailKH((prev) => prev ? { ...prev, _loadingOrders: false } : null);
            toast.error('Không thể tải chi tiết');
        }
    }, []);

    // ── Submit form ─────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!formData.tenKH.trim()) {
            setFormError('Vui lòng nhập tên khách hàng');
            return;
        }
        setSubmitting(true);
        try {
            if (editing) {
                await khachHangService.update(editing.MaKH, formData);
                toast.success('Cập nhật thành công');
            } else {
                await khachHangService.create(formData);
                toast.success('Tạo khách hàng thành công');
            }
            setModalOpen(false);
            fetchData(pagination.page);
            fetchStats();
        } catch (err) {
            const msg = err.response?.data?.error?.message || 'Thao tác thất bại';
            // 409 = Conflict (trùng SDT)
            const isConflict = err.response?.status === 409;
            setFormError(msg);
            toast.error(msg, { icon: isConflict ? '📞' : undefined });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        try {
            await khachHangService.remove(confirmDeleteId);
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

    const hasActiveFilters = Boolean(keyword || segment || gioiTinh);
    const deletingItem = items.find((i) => i.MaKH === confirmDeleteId);

    // ── Table columns ────────────────────────────────────────────────────────
    const columns = [
        {
            key: 'avatar',
            label: '',
            width: '40px',
            render: (it) => <CustomerAvatar name={it.TenKH} size="sm" />,
        },
        {
            key: 'name',
            label: 'Khách hàng',
            render: (it) => (
                <div className="flex items-center gap-2 min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-neutral-900 truncate">{it.TenKH}</span>
                            <Badge variant={SEGMENT_VARIANT[it.Segment] || 'neutral'} size="sm">
                                {SEGMENT_LABEL[it.Segment] || it.Segment || '—'}
                            </Badge>
                        </div>
                        <span className="text-caption text-neutral-500 font-mono">#{it.MaKH}</span>
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
            key: 'gioiTinh',
            label: 'Giới tính',
            render: (it) => <span className="text-neutral-700">{it.GioiTinh || '—'}</span>,
        },
        {
            key: 'soDon',
            label: 'Số đơn',
            align: 'center',
            width: '90px',
            render: (it) => (
                <span className={cn(
                    'font-semibold font-mono',
                    it.SoDon > 0 ? 'text-primary-700' : 'text-neutral-400'
                )}>
                    {it.SoDon > 0 ? it.SoDon : '—'}
                </span>
            ),
        },
        {
            key: 'tongChi',
            label: 'Tổng chi',
            align: 'right',
            width: '130px',
            render: (it) => (
                <span className={cn(
                    'font-mono font-medium',
                    it.TongChi > 0 ? 'text-neutral-900' : 'text-neutral-400'
                )}>
                    {it.TongChi > 0 ? formatCurrency(it.TongChi) : '—'}
                </span>
            ),
        },
        {
            key: 'lanCuoi',
            label: 'Lần cuối',
            width: '130px',
            render: (it) => (
                <span className="text-neutral-500">
                    {it.LanCuoiMua
                        ? dayjs(it.LanCuoiMua).fromNow()
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
                        aria-label={`Xem chi tiết ${it.TenKH}`}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <RoleGuard roles={['Admin', 'NV_BanHang']}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEdit(it); }}
                            className="p-1.5 rounded-btn text-info-600 hover:bg-info-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            title="Sửa"
                            aria-label={`Sửa ${it.TenKH}`}
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </RoleGuard>
                    <RoleGuard roles={['Admin']}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(it.MaKH); }}
                            className="p-1.5 rounded-btn text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            title="Xóa"
                            aria-label={`Xóa ${it.TenKH}`}
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
                icon={<Users />}
                title="Khách hàng"
                subtitle="Quản lý thông tin và phân khúc khách hàng"
                actions={
                    <RoleGuard roles={['Admin', 'NV_BanHang']}>
                        <Button variant="primary" icon={<Plus />} onClick={openCreate}>
                            Thêm khách hàng
                        </Button>
                    </RoleGuard>
                }
            />

            {/* ── Stats row ─────────────────────────────────────────────────── */}
            <section
                aria-label="Thống kê khách hàng"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Tổng khách hàng"
                    value={statsLoading ? '—' : (stats?.tongKhachHang ?? 0).toLocaleString('vi-VN')}
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
                placeholder="Tìm tên, mã khách hàng..."
                title="Tìm kiếm và lọc"
                description="Lọc theo từ khóa, phân khúc hoặc giới tính."
                meta={loading ? 'Đang cập nhật...' : `${pagination.total} kết quả`}
            >
                {/* Segment filter */}
                <Select
                    label="Phân khúc"
                    value={segment}
                    onChange={(v) => setSegment(v)}
                    options={[
                        { value: '', label: 'Tất cả phân khúc' },
                        { value: 'VIP', label: '⭐ VIP' },
                        { value: 'ThanThiet', label: '💎 Thân thiết' },
                        { value: 'Thuong', label: '✓ Thường' },
                        { value: 'Moi', label: '🌱 Mới' },
                    ]}
                    placeholder="Phân khúc"
                    className="w-full sm:w-[160px]"
                    selectClassName="h-10"
                    aria-label="Lọc theo phân khúc"
                />

                {/* Gender filter */}
                <Select
                    label="Giới tính"
                    value={gioiTinh}
                    onChange={(v) => setGioiTinh(v)}
                    options={[
                        { value: '', label: 'Tất cả' },
                        { value: 'Nam', label: 'Nam' },
                        { value: 'Nữ', label: 'Nữ' },
                        { value: 'Khác', label: 'Khác' },
                    ]}
                    placeholder="Giới tính"
                    className="w-full sm:w-[140px]"
                    selectClassName="h-10"
                    aria-label="Lọc theo giới tính"
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
                            setGioiTinh('');
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
                        { key: 'VIP', label: '⭐ VIP', variant: 'warning' },
                        { key: 'ThanThiet', label: '💎 Thân thiết', variant: 'info' },
                        { key: 'Thuong', label: '✓ Thường', variant: 'success' },
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
                rowKey="MaKH"
                emptyTitle={
                    hasActiveFilters
                        ? 'Không tìm thấy khách hàng phù hợp'
                        : 'Chưa có khách hàng nào'
                }
                emptyDescription={
                    hasActiveFilters
                        ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                        : 'Thêm khách hàng đầu tiên để bắt đầu.'
                }
                emptyIcon={<UserPlus />}
                emptyAction={
                    hasActiveFilters ? (
                        <Button
                            variant="secondary"
                            icon={<X className="h-4 w-4" />}
                            onClick={() => {
                                setKeywordInput('');
                                setKeyword('');
                                setSegment('');
                                setGioiTinh('');
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
                title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Tên khách hàng"
                        required
                        value={formData.tenKH}
                        onChange={(e) => setFormData({ ...formData, tenKH: e.target.value })}
                        maxLength={200}
                        placeholder="VD: Nguyễn Văn An"
                    />
                    <Input
                        label="Số điện thoại"
                        value={formData.sdt}
                        onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                        placeholder="VD: 0912345678"
                        hint="10–11 chữ số"
                    />
                    <Select
                        label="Giới tính"
                        value={formData.gioiTinh}
                        onChange={(v) => setFormData({ ...formData, gioiTinh: v })}
                        options={[
                            { value: 'Nam', label: 'Nam' },
                            { value: 'Nữ', label: 'Nữ' },
                            { value: 'Khác', label: 'Khác' },
                        ]}
                        placeholder="—"
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

            {/* ── Modal: Customer detail ────────────────────────────────────── */}
            <CustomerDetailModal
                kh={detailKH}
                orders={orders}
                onClose={() => setDetailKH(null)}
                onEdit={openEdit}
            />

            {/* ── Confirm delete ─────────────────────────────────────────────── */}
            <ConfirmDialog
                open={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Xóa khách hàng"
                message={
                    deletingItem
                        ? `Bạn có chắc chắn muốn xóa khách hàng "${deletingItem.TenKH}"? Hành động này không thể hoàn tác.`
                        : ''
                }
                confirmLabel="Xóa"
            />
        </div>
    );
}

export default KhachHangPage;

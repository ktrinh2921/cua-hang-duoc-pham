/**
 * AuditLogPage — Nhat ky hanh dong he thong (Admin only)
 *
 * Tinh nang:
 *  - Thong ke tong quan: Tong so ban ghi, so nguoi dung, so loai hanh dong (7 ngay)
 *  - Bang: Loc theo ngay, nguoi dung, action, bang
 *  - Chi tiet: Click dong de xem OldValue/NewValue
 *  - Phan trang
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    ScrollText, Search, Filter, Eye, ChevronDown, ChevronUp,
    Activity, Users, ListChecks, Calendar, X, RefreshCw,
    Database, ShieldCheck, Clock3,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import auditLogService from '../../services/auditLogService';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

dayjs.locale('vi');

const EMPTY_FILTERS = {
    fromDate: '',
    toDate: '',
    tenDangNhap: '',
    action: '',
    tableName: '',
};

// Action type → badge color
const ACTION_VARIANT = (action) => {
    if (typeof action !== 'string') return 'neutral';
    if (action.startsWith('LOGIN') || action.startsWith('LOGOUT')) return 'info';
    if (action.startsWith('CREATE') || action === 'SEED') return 'success';
    if (action.startsWith('UPDATE') || action === 'UPDATE_ACCOUNT_NV') return 'warning';
    if (action.startsWith('DELETE') || action === 'CANCEL_HOADON') return 'danger';
    if (action.startsWith('RESET')) return 'warning';
    if (action.startsWith('APPROVE')) return 'success';
    if (action.startsWith('REJECT')) return 'danger';
    return 'neutral';
};

// ACTION label tiếng Việt
const ACTION_LABEL = (action) => {
    if (typeof action !== 'string' || !action) return 'Không xác định';
    const map = {
        LOGIN: 'Đăng nhập',
        LOGOUT: 'Đăng xuất',
        CHANGE_PASSWORD: 'Đổi mật khẩu',
        SEED: 'Khởi tạo hệ thống',
        CREATE_NV: 'Tạo nhân viên',
        UPDATE_NV: 'Cập nhật nhân viên',
        DELETE_NV: 'Xóa nhân viên',
        CREATE_ACCOUNT_NV: 'Tạo tài khoản',
        UPDATE_ACCOUNT_NV: 'Cập nhật tài khoản',
        RESET_PASSWORD_NV: 'Reset mật khẩu',
        CREATE_DANHMUC: 'Tạo danh mục',
        UPDATE_DANHMUC: 'Cập nhật danh mục',
        DELETE_DANHMUC: 'Xóa danh mục',
        CREATE_THUOC: 'Tạo thuốc',
        UPDATE_THUOC: 'Cập nhật thuốc',
        DELETE_THUOC: 'Xóa thuốc',
        CREATE_NCC: 'Tạo nhà cung cấp',
        UPDATE_NCC: 'Cập nhật nhà cung cấp',
        DELETE_NCC: 'Xóa nhà cung cấp',
        CREATE_KH: 'Tạo khách hàng',
        UPDATE_KH: 'Cập nhật khách hàng',
        DELETE_KH: 'Xóa khách hàng',
        CREATE_PHIEUNHAP: 'Tạo phiếu nhập',
        UPDATE_PHIEUNHAP: 'Cập nhật phiếu nhập',
        APPROVE_PHIEUNHAP: 'Duyệt phiếu nhập',
        REJECT_PHIEUNHAP: 'Từ chối phiếu nhập',
        CREATE_HOADON: 'Tạo hóa đơn',
        CANCEL_HOADON: 'Hủy hóa đơn',
        CREATE_PHIEUTHU: 'Tạo phiếu thu',
        CREATE_PHIEUCHI: 'Tạo phiếu chi',
        CREATE_DIEU_CHINH: 'Tạo điều chỉnh kho',
        APPROVE_DIEU_CHINH: 'Duyệt điều chỉnh kho',
        REJECT_DIEU_CHINH: 'Từ chối điều chỉnh kho',
    };
    return map[action] || action.replace(/_/g, ' ');
};

function formatCount(value) {
    return Math.max(0, Number(value) || 0).toLocaleString('vi-VN');
}

function formatAuditValue(value) {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [actions, setActions] = useState([]);
    const [tables, setTables] = useState([]);
    const [metaLoading, setMetaLoading] = useState(true);
    const [metaError, setMetaError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
    const [appliedFilters, setAppliedFilters] = useState(() => ({ ...EMPTY_FILTERS }));
    const [showFilters, setShowFilters] = useState(true);
    const latestRequestId = useRef(0);

    // Detail modal
    const [detailLog, setDetailLog] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const latestDetailRequestId = useRef(0);

    // Load stats + filter dropdowns
    const loadMeta = useCallback(async () => {
        setMetaLoading(true);
        setMetaError(false);
        try {
            const [statsRes, actionsRes, tablesRes] = await Promise.all([
                auditLogService.getStats(),
                auditLogService.getActionTypes(),
                auditLogService.getTableNames(),
            ]);
            setStats(statsRes.data?.data);
            setActions(actionsRes.data?.data || []);
            setTables(tablesRes.data?.data || []);
        } catch (e) {
            setMetaError(true);
            const status = e.response?.status;
            console.error('Load meta error:', e);
            // 401 đã được axios interceptor xử lý (tự logout); 403 nghĩa là
            // tài khoản hiện tại không phải Admin — vẫn cho user xem trang rỗng
            // nhưng cảnh báo rõ để khỏi debug lung tung.
            if (status === 403) {
                toast.error('Tài khoản của bạn không có quyền Quản lý để xem nhật ký hệ thống.');
            }
        } finally {
            setMetaLoading(false);
        }
    }, []);

    // Load logs
    const loadLogs = useCallback(async () => {
        const requestId = ++latestRequestId.current;
        setLoading(true);
        try {
            const res = await auditLogService.getAuditLogs({
                ...appliedFilters,
                page,
                limit: DEFAULT_PAGE_SIZE,
            });
            if (requestId !== latestRequestId.current) return;

            const d = res.data?.data;
            const pagination = d?.pagination || {};
            setLogs(Array.isArray(d?.items) ? d.items : []);
            setTotal(Math.max(0, Number(pagination.total) || 0));
            setTotalPages(Math.max(1, Number(pagination.totalPages) || 1));
        } catch (e) {
            if (requestId !== latestRequestId.current) return;

            const status = e.response?.status;
            if (status === 403) {
                toast.error('Tài khoản của bạn không có quyền Quản lý để xem nhật ký hệ thống.');
            } else {
                toast.error('Không thể tải nhật ký');
            }
        } finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
            }
        }
    }, [appliedFilters, page]);

    useEffect(() => {
        loadMeta();
    }, [loadMeta]);

    useEffect(() => {
        loadLogs();
        return () => {
            latestRequestId.current += 1;
        };
    }, [loadLogs]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyFilters = (event) => {
        event?.preventDefault();
        if (filters.fromDate && filters.toDate && dayjs(filters.fromDate).isAfter(dayjs(filters.toDate))) {
            return;
        }
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const handleResetFilters = () => {
        setFilters({ ...EMPTY_FILTERS });
        setAppliedFilters({ ...EMPTY_FILTERS });
        setPage(1);
    };

    const handleViewDetail = async (logId) => {
        const requestId = ++latestDetailRequestId.current;
        setLoadingDetail(true);
        setDetailLog(null);
        try {
            const res = await auditLogService.getById(logId);
            if (requestId !== latestDetailRequestId.current) return;
            setDetailLog(res.data?.data);
        } catch (e) {
            if (requestId !== latestDetailRequestId.current) return;
            toast.error('Không thể tải chi tiết');
        } finally {
            if (requestId === latestDetailRequestId.current) {
                setLoadingDetail(false);
            }
        }
    };

    const handleCloseDetail = () => {
        latestDetailRequestId.current += 1;
        setLoadingDetail(false);
        setDetailLog(null);
    };

    const columns = [
        {
            key: 'timestamp',
            label: 'Thời gian',
            render: (row) => (
                <div className="text-sm">
                    <div className="font-medium text-neutral-900">
                        {dayjs(row.timestamp).format('DD/MM/YYYY')}
                    </div>
                    <div className="text-neutral-500 text-xs">
                        {dayjs(row.timestamp).format('HH:mm:ss')}
                    </div>
                </div>
            ),
        },
        {
            key: 'tenDangNhap',
            label: 'Người dùng',
            render: (row) => row.tenDangNhap ? (
                <span className="font-mono text-sm font-medium text-neutral-800">{row.tenDangNhap}</span>
            ) : (
                <span className="text-neutral-400 italic">System</span>
            ),
        },
        {
            key: 'action',
            label: 'Hành động',
            render: (row) => (
                <Badge variant={ACTION_VARIANT(row.action)} size="sm">
                    {ACTION_LABEL(row.action)}
                </Badge>
            ),
        },
        {
            key: 'tableName',
            label: 'Bảng',
            render: (row) => row.tableName ? (
                <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{row.tableName}</code>
            ) : null,
        },
        {
            key: 'recordId',
            label: 'Record ID',
            render: (row) => row.recordId ? (
                <span className="text-xs text-neutral-500 font-mono">{row.recordId}</span>
            ) : null,
        },
        {
            key: 'ipAddress',
            label: 'IP',
            render: (row) => row.ipAddress ? (
                <span className="text-xs text-neutral-400 font-mono">{row.ipAddress}</span>
            ) : null,
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <Button
                    variant="ghost"
                    size="sm"
                    title="Xem chi tiết"
                    aria-label={`Xem chi tiết nhật ký ${row.logId}`}
                    onClick={() => handleViewDetail(row.logId)}
                    icon={<Eye className="w-4 h-4" />}
                />
            ),
        },
    ];

    const dailyStats = Array.isArray(stats?.daily) ? stats.daily : [];
    const topActions = Array.isArray(stats?.topActions) ? stats.topActions : [];
    const topUsers = Array.isArray(stats?.topUsers) ? stats.topUsers : [];
    const maxDailyCount = Math.max(1, ...dailyStats.map(item => Number(item.soBanGhi) || 0));
    const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;
    const dateRangeError = filters.fromDate && filters.toDate
        && dayjs(filters.fromDate).isAfter(dayjs(filters.toDate))
        ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc'
        : '';

    return (
        <div className="space-y-5 pb-4">
            <PageHeader
                title="Nhật ký hệ thống"
                subtitle="Giám sát truy cập, thay đổi dữ liệu và các thao tác quan trọng trong hệ thống"
                icon={ScrollText}
                actions={(
                    <Button
                        variant="secondary"
                        onClick={() => {
                            loadMeta();
                            loadLogs();
                        }}
                        loading={loading || metaLoading}
                        icon={<RefreshCw className="h-4 w-4" />}
                    >
                        Làm mới
                    </Button>
                )}
            />

            <section aria-labelledby="audit-summary-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 id="audit-summary-title" className="text-body font-semibold text-neutral-900">
                            Tổng quan 7 ngày gần nhất
                        </h2>
                        <p className="mt-0.5 text-caption text-neutral-500">
                            Số liệu được tổng hợp trực tiếp từ nhật ký hệ thống
                        </p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-pill bg-success-50 px-2.5 py-1 text-caption font-medium text-success-700 ring-1 ring-inset ring-success-100">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Theo dõi đang hoạt động
                    </span>
                </div>

                {stats ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Tổng bản ghi" value={formatCount(stats.tongSoBanGhi)} icon={Database} color="primary" />
                        <StatCard label="Người dùng hoạt động" value={formatCount(stats.soNguoiDung)} icon={Users} color="info" />
                        <StatCard label="Loại hành động" value={formatCount(stats.soLoaiHanhDong)} icon={ListChecks} color="warning" />
                        <StatCard label="Ngày có hoạt động" value={formatCount(stats.soNgayHoatDong)} icon={Calendar} color="success" />
                    </div>
                ) : metaLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Đang tải tổng quan">
                        {[0, 1, 2, 3].map(item => (
                            <div key={item} className="h-[120px] animate-pulse rounded-card border border-neutral-200 bg-white p-5 motion-reduce:animate-none">
                                <div className="h-10 w-10 rounded-card bg-neutral-100" />
                                <div className="mt-4 h-3 w-24 rounded bg-neutral-100" />
                                <div className="mt-2 h-6 w-16 rounded bg-neutral-200" />
                            </div>
                        ))}
                    </div>
                ) : metaError ? (
                    <div className="rounded-card border border-warning-100 bg-warning-50 px-4 py-5 text-center">
                        <p className="text-sm font-medium text-warning-700">Không thể tải dữ liệu tổng quan</p>
                        <Button className="mt-3" variant="secondary" size="sm" onClick={loadMeta} icon={<RefreshCw className="h-4 w-4" />}>
                            Thử lại
                        </Button>
                    </div>
                ) : null}
            </section>

            {stats && (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]" aria-label="Phân tích hoạt động">
                    <div className="rounded-card border border-neutral-200 bg-white p-4 shadow-card sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="flex items-center gap-2 text-body font-semibold text-neutral-900">
                                    <Activity className="h-4 w-4 text-primary-600" aria-hidden="true" />
                                    Nhịp độ hoạt động
                                </h2>
                                <p className="mt-1 text-caption text-neutral-500">Số sự kiện ghi nhận theo từng ngày</p>
                            </div>
                            <Badge variant="primary" size="sm">7 ngày</Badge>
                        </div>

                        {dailyStats.length > 0 ? (
                            <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="Biểu đồ số bản ghi trong 7 ngày">
                                {dailyStats.map(item => {
                                    const count = Number(item.soBanGhi) || 0;
                                    const height = count > 0 ? Math.max(10, Math.round((count / maxDailyCount) * 100)) : 4;
                                    return (
                                        <div key={item.ngay} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                            <span className="text-caption font-semibold tabular-nums text-neutral-700">{formatCount(count)}</span>
                                            <div className="flex h-28 w-full items-end rounded-btn bg-primary-50 px-1.5 pt-1">
                                                <div
                                                    className="w-full rounded-t bg-primary-500 transition-[height] duration-300 motion-reduce:transition-none"
                                                    style={{ height: `${height}%` }}
                                                    title={`${dayjs(item.ngay).format('DD/MM/YYYY')}: ${formatCount(count)} bản ghi`}
                                                />
                                            </div>
                                            <span className="truncate text-caption text-neutral-500">
                                                {dayjs(item.ngay).format('DD/MM')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-btn border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center text-sm text-neutral-500">
                                Chưa có hoạt động trong 7 ngày gần nhất
                            </div>
                        )}
                    </div>

                    <div className="rounded-card border border-neutral-200 bg-white p-4 shadow-card sm:p-5">
                        <h2 className="text-body font-semibold text-neutral-900">Điểm nổi bật</h2>
                        <p className="mt-1 text-caption text-neutral-500">Hành động và người dùng có tần suất cao nhất</p>

                        <div className="mt-5 space-y-5">
                            <div>
                                <h3 className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-neutral-500">
                                    <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                                    Hành động
                                </h3>
                                <div className="space-y-2">
                                    {topActions.slice(0, 3).map(item => (
                                        <div key={item.action} className="flex items-center justify-between gap-3 rounded-btn bg-neutral-50 px-3 py-2">
                                            <Badge variant={ACTION_VARIANT(item.action)} size="sm">{ACTION_LABEL(item.action)}</Badge>
                                            <span className="text-caption font-semibold tabular-nums text-neutral-700">{formatCount(item.soLan)} lần</span>
                                        </div>
                                    ))}
                                    {topActions.length === 0 && <p className="text-caption text-neutral-500">Chưa có dữ liệu.</p>}
                                </div>
                            </div>

                            <div className="border-t border-neutral-100 pt-4">
                                <h3 className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-neutral-500">
                                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                    Người dùng
                                </h3>
                                <div className="space-y-2">
                                    {topUsers.slice(0, 3).map(item => (
                                        <div key={item.tenDangNhap} className="flex items-center justify-between gap-3 rounded-btn px-3 py-1.5 hover:bg-neutral-50">
                                            <span className="min-w-0 truncate font-mono text-sm font-medium text-neutral-800">{item.tenDangNhap}</span>
                                            <span className="shrink-0 text-caption font-semibold tabular-nums text-neutral-600">{formatCount(item.soLan)} lần</span>
                                        </div>
                                    ))}
                                    {topUsers.length === 0 && <p className="text-caption text-neutral-500">Chưa có dữ liệu.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-card" aria-labelledby="audit-filter-title">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary-50 text-primary-700">
                            <Filter className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 id="audit-filter-title" className="text-body font-semibold text-neutral-900">Bộ lọc nhật ký</h2>
                                {activeFilterCount > 0 && <Badge variant="primary" size="sm">{activeFilterCount} đang dùng</Badge>}
                            </div>
                            <p className="text-caption text-neutral-500">Thu hẹp kết quả theo thời gian, người dùng và đối tượng</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(current => !current)}
                        aria-expanded={showFilters}
                        iconRight={showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    >
                        {showFilters ? 'Thu gọn' : 'Mở bộ lọc'}
                    </Button>
                </div>

                {showFilters && (
                    <form onSubmit={handleApplyFilters} className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
                            <Input
                                className="xl:col-span-2"
                                label="Từ ngày"
                                type="date"
                                value={filters.fromDate}
                                onChange={event => handleFilterChange('fromDate', event.target.value)}
                            />
                            <Input
                                className="xl:col-span-2"
                                label="Đến ngày"
                                type="date"
                                value={filters.toDate}
                                error={dateRangeError}
                                onChange={event => handleFilterChange('toDate', event.target.value)}
                            />
                            <Input
                                className="sm:col-span-2 xl:col-span-3"
                                label="Người dùng"
                                placeholder="Ví dụ: admin.huong"
                                value={filters.tenDangNhap}
                                onChange={event => handleFilterChange('tenDangNhap', event.target.value)}
                            />
                            <Select
                                className="xl:col-span-3"
                                label="Hành động"
                                placeholder=""
                                value={filters.action}
                                onChange={value => handleFilterChange('action', value)}
                            >
                                <option value="">Tất cả hành động</option>
                                {actions.map(action => (
                                    <option key={action} value={action}>{ACTION_LABEL(action)} ({action})</option>
                                ))}
                            </Select>
                            <Select
                                className="xl:col-span-2"
                                label="Bảng dữ liệu"
                                placeholder=""
                                value={filters.tableName}
                                onChange={value => handleFilterChange('tableName', value)}
                            >
                                <option value="">Tất cả bảng</option>
                                {tables.map(table => <option key={table} value={table}>{table}</option>)}
                            </Select>
                        </div>

                        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-caption text-neutral-500">
                                Nhấn Enter hoặc chọn “Áp dụng bộ lọc” để tìm kiếm.
                            </p>
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="secondary" size="sm" onClick={handleResetFilters} icon={<X className="h-4 w-4" />}>
                                    Xóa lọc
                                </Button>
                                <Button type="submit" size="sm" disabled={!!dateRangeError} icon={<Search className="h-4 w-4" />}>
                                    Áp dụng bộ lọc
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </section>

            <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-card" aria-labelledby="audit-list-title">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 id="audit-list-title" className="text-body font-semibold text-neutral-900">Dòng sự kiện</h2>
                            {!loading && <Badge variant="neutral" size="sm">{formatCount(total)} bản ghi</Badge>}
                        </div>
                        <p className="mt-0.5 text-caption text-neutral-500">Sắp xếp theo thời gian mới nhất</p>
                    </div>
                    <div className="flex items-center gap-2 text-caption text-neutral-500" aria-live="polite">
                        <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-warning-500 motion-reduce:animate-none' : 'bg-success-500'}`} />
                        {loading ? 'Đang đồng bộ dữ liệu' : 'Dữ liệu đã cập nhật'}
                    </div>
                </div>

                <div className="hidden md:block">
                    <Table
                        className="!rounded-none !border-0 !shadow-none"
                        columns={columns}
                        data={logs}
                        loading={loading}
                        rowKey="logId"
                        emptyTitle="Không có bản ghi phù hợp"
                        emptyDescription="Hãy thay đổi hoặc xóa bộ lọc để xem thêm kết quả."
                    />
                </div>

                <div className="divide-y divide-neutral-100 md:hidden" aria-busy={loading}>
                    {loading ? (
                        [0, 1, 2].map(item => (
                            <div key={item} className="animate-pulse p-4 motion-reduce:animate-none">
                                <div className="h-4 w-32 rounded bg-neutral-200" />
                                <div className="mt-3 h-3 w-48 rounded bg-neutral-100" />
                                <div className="mt-2 h-3 w-24 rounded bg-neutral-100" />
                            </div>
                        ))
                    ) : logs.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <ScrollText className="mx-auto h-8 w-8 text-neutral-300" aria-hidden="true" />
                            <p className="mt-3 text-sm font-medium text-neutral-700">Không có bản ghi phù hợp</p>
                            <p className="mt-1 text-caption text-neutral-500">Thử thay đổi hoặc xóa bộ lọc hiện tại.</p>
                        </div>
                    ) : logs.map(log => (
                        <article key={log.logId} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <Badge variant={ACTION_VARIANT(log.action)} size="sm">{ACTION_LABEL(log.action)}</Badge>
                                    <p className="mt-2 truncate font-mono text-sm font-medium text-neutral-900">{log.tenDangNhap || 'System'}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewDetail(log.logId)}
                                    aria-label={`Xem chi tiết nhật ký ${log.logId}`}
                                    icon={<Eye className="h-4 w-4" />}
                                />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-caption text-neutral-500">
                                <span className="flex items-center gap-1.5">
                                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                    {dayjs(log.timestamp).format('DD/MM/YYYY HH:mm')}
                                </span>
                                <span className="truncate text-right font-mono">{log.tableName || 'Không có bảng'}</span>
                                <span className="truncate font-mono">IP: {log.ipAddress || '-'}</span>
                                <span className="truncate text-right font-mono">ID: {log.recordId || '-'}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} loading={loading} />

            <Modal
                open={!!detailLog || loadingDetail}
                onClose={handleCloseDetail}
                title="Chi tiết sự kiện"
                icon={<ScrollText />}
                tone="info"
                size="xl"
            >
                {loadingDetail ? (
                    <div className="flex min-h-48 flex-col items-center justify-center gap-3" role="status">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary-600 motion-reduce:animate-none" aria-hidden="true" />
                        <span className="text-sm text-neutral-500">Đang tải chi tiết nhật ký...</span>
                    </div>
                ) : detailLog && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary-100 bg-primary-50/60 p-4">
                            <div>
                                <p className="text-caption font-medium uppercase tracking-wide text-primary-700">Sự kiện #{detailLog.logId}</p>
                                <p className="mt-1 text-sm font-semibold text-neutral-900">{dayjs(detailLog.timestamp).format('DD/MM/YYYY HH:mm:ss')}</p>
                            </div>
                            <Badge variant={ACTION_VARIANT(detailLog.action)}>{ACTION_LABEL(detailLog.action)}</Badge>
                        </div>

                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                                ['Người dùng', detailLog.tenDangNhap || 'System'],
                                ['Bảng dữ liệu', detailLog.tableName || '-'],
                                ['Record ID', detailLog.recordId || '-'],
                                ['IP Address', detailLog.ipAddress || '-'],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-btn border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                                    <dt className="text-caption text-neutral-500">{label}</dt>
                                    <dd className="mt-1 break-words font-mono text-sm font-medium text-neutral-800">{value}</dd>
                                </div>
                            ))}
                        </dl>

                        <div>
                            <p className="text-caption text-neutral-500">User Agent</p>
                            <p className="mt-1 [overflow-wrap:anywhere] rounded-btn border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs leading-relaxed text-neutral-700">
                                {detailLog.userAgent || '-'}
                            </p>
                        </div>

                        {(detailLog.oldValue || detailLog.newValue) && (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                {detailLog.oldValue && (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Giá trị trước thay đổi</h3>
                                        <pre className="max-h-64 overflow-auto rounded-card border border-neutral-200 bg-neutral-900 p-3 font-mono text-xs leading-relaxed text-neutral-100">
                                            {formatAuditValue(detailLog.oldValue)}
                                        </pre>
                                    </div>
                                )}
                                {detailLog.newValue && (
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Giá trị sau thay đổi</h3>
                                        <pre className="max-h-64 overflow-auto rounded-card border border-primary-200 bg-primary-950 p-3 font-mono text-xs leading-relaxed text-primary-50">
                                            {formatAuditValue(detailLog.newValue)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

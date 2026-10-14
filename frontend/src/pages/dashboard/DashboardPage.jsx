/**
 * DashboardPage — Tổng quan vận hành nhà thuốc.
 *
 * Chỉ hiển thị dữ liệu thật từ các API đã có. Doanh thu, hóa đơn và lịch sử
 * hoạt động sẽ được bổ sung khi module bán hàng/thống kê hoàn tất.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  FolderTree,
  PackagePlus,
  PackageSearch,
  PackageX,
  Pill,
  RefreshCw,
  Sparkles,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import danhMucService from '../../services/danhMucService';
import khoService from '../../services/khoService';
import thuocService from '../../services/thuocService';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import StatCard from '../../components/ui/StatCard';
import { cn } from '../../utils/cn';
import { ROLE_LABELS } from '../../utils/constants';

const INITIAL_DATA = {
  tongThuoc: 0,
  danhMuc: [],
  sapHetHang: [],
  sapHetHan: [],
};

const QUICK_ACTIONS_BY_ROLE = {
  Admin: [
    ['Quản lý thuốc', 'Tra cứu và cập nhật danh sách thuốc', '/thuoc', Pill, 'primary'],
    ['Tạo phiếu nhập', 'Nhập thuốc và cập nhật tồn kho', '/kho/nhap', PackagePlus, 'accent'],
    ['Quản lý nhân viên', 'Hồ sơ và trạng thái làm việc', '/nhan-vien', UserCog, 'info'],
    ['Khách hàng', 'Tra cứu thông tin khách hàng', '/khach-hang', Users, 'success'],
  ],
  NV_BanHang: [
    ['Tra cứu thuốc', 'Tìm theo tên hoặc hoạt chất', '/thuoc', PackageSearch, 'primary'],
    ['Khách hàng', 'Tra cứu hoặc tạo khách hàng', '/khach-hang', Users, 'success'],
    ['Danh mục thuốc', 'Xem thuốc theo từng nhóm', '/danh-muc', FolderTree, 'info'],
    ['Tồn kho', 'Kiểm tra số lượng trước khi bán', '/kho/ton-kho', Warehouse, 'warning'],
  ],
  NV_Kho: [
    ['Tạo phiếu nhập', 'Nhập lô thuốc mới vào kho', '/kho/nhap', PackagePlus, 'primary'],
    ['Kiểm tra tồn kho', 'Theo dõi số lượng từng thuốc', '/kho/ton-kho', Warehouse, 'accent'],
    ['Lô sắp hết hạn', 'Ưu tiên lô còn dưới 30 ngày', '/kho/sap-het-han', CalendarClock, 'warning'],
    ['Nhà cung cấp', 'Tra cứu đơn vị cung ứng', '/nha-cung-cap', Truck, 'info'],
  ],
};

const ACTION_TONES = {
  primary: 'bg-primary-50 text-primary-700 group-hover:bg-primary-100',
  accent: 'bg-accent-50 text-accent-700 group-hover:bg-accent-100',
  success: 'bg-success-50 text-success-700 group-hover:bg-success-100',
  warning: 'bg-warning-50 text-warning-700 group-hover:bg-warning-100',
  info: 'bg-info-50 text-info-700 group-hover:bg-info-100',
};

const CATEGORY_TONES = [
  'bg-primary-500',
  'bg-accent-500',
  'bg-info-500',
  'bg-success-500',
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getDisplayName(user) {
  return user?.employee?.tenNV || user?.tenNV || user?.username || 'Bạn';
}

function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const role = user?.role || 'NV_BanHang';
  const quickActions = QUICK_ACTIONS_BY_ROLE[role] || QUICK_ACTIONS_BY_ROLE.NV_BanHang;
  const primaryAction =
    role === 'NV_BanHang'
      ? { label: 'Tra cứu thuốc', to: '/thuoc', icon: PackageSearch }
      : { label: 'Tạo phiếu nhập', to: '/kho/nhap', icon: PackagePlus };
  const PrimaryActionIcon = primaryAction.icon;

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [thuocResponse, danhMucResponse, hetHangResponse, hetHanResponse] =
        await Promise.all([
          thuocService.getAll({ page: 1, limit: 1 }),
          danhMucService.getAll(),
          khoService.getSapHetHang(10),
          khoService.getSapHetHan(30),
        ]);

      setData({
        tongThuoc: Number(thuocResponse?.data?.pagination?.total || 0),
        danhMuc: Array.isArray(danhMucResponse?.data) ? danhMucResponse.data : [],
        sapHetHang: Array.isArray(hetHangResponse?.data?.items)
          ? hetHangResponse.data.items
          : [],
        sapHetHan: Array.isArray(hetHanResponse?.data?.items)
          ? hetHanResponse.data.items
          : [],
      });
      setUpdatedAt(new Date());
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'Không thể tải dữ liệu tổng quan. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = [
    {
      label: 'Tổng số thuốc',
      value: loading ? '—' : data.tongThuoc.toLocaleString('vi-VN'),
      icon: <Pill className="h-5 w-5" />,
      color: 'primary',
      to: '/thuoc',
    },
    {
      label: 'Danh mục thuốc',
      value: loading ? '—' : data.danhMuc.length.toLocaleString('vi-VN'),
      icon: <FolderTree className="h-5 w-5" />,
      color: 'info',
      to: '/danh-muc',
    },
    {
      label: 'Sắp hết hàng',
      value: loading ? '—' : data.sapHetHang.length.toLocaleString('vi-VN'),
      icon: <PackageX className="h-5 w-5" />,
      color: data.sapHetHang.length > 0 ? 'warning' : 'success',
      to: '/kho/sap-het-hang',
    },
    {
      label: 'Lô sắp hết hạn',
      value: loading ? '—' : data.sapHetHan.length.toLocaleString('vi-VN'),
      icon: <CalendarClock className="h-5 w-5" />,
      color: data.sapHetHan.length > 0 ? 'danger' : 'success',
      to: '/kho/sap-het-han',
    },
  ];

  const sortedCategories = useMemo(
    () =>
      [...data.danhMuc]
        .sort((a, b) => Number(b.SoThuoc || 0) - Number(a.SoThuoc || 0))
        .slice(0, 8),
    [data.danhMuc]
  );
  const maxCategoryCount = Math.max(
    1,
    ...sortedCategories.map((item) => Number(item.SoThuoc || 0))
  );
  const totalAlerts = data.sapHetHang.length + data.sapHetHan.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary-600 via-primary-700 to-info-700 text-white shadow-card">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-400 blur-3xl animate-blob motion-reduce:animate-none" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-info-300 blur-3xl animate-blob-slow motion-reduce:animate-none" />
        </div>

        <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-caption font-semibold uppercase tracking-wider text-white/75">
              <span>{getGreeting()}</span>
              <Sparkles className="h-3.5 w-3.5 text-accent-300" aria-hidden="true" />
              <span className="rounded-pill border border-white/20 bg-white/10 px-2.5 py-1 normal-case tracking-normal text-white">
                {ROLE_LABELS[role] || role}
              </span>
            </div>
            <h1 className="mt-2 truncate text-h1 text-white">{getDisplayName(user)}</h1>
            <p className="mt-2 max-w-2xl text-body text-white/85">
              Tổng quan vận hành nhà thuốc · {todayLabel}
            </p>
            {updatedAt && (
              <p className="mt-2 text-caption text-white/60">
                Dữ liệu cập nhật lúc{' '}
                {updatedAt.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-btn border border-white/25 bg-white/10 px-4 text-body font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Làm mới
            </button>
            <Link
              to={primaryAction.to}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-btn bg-white px-4 text-body font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PrimaryActionIcon className="h-4 w-4" aria-hidden="true" />
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-card border border-danger-100 bg-danger-50 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-600" />
            <div>
              <p className="text-body font-semibold text-danger-700">Không tải được dashboard</p>
              <p className="mt-0.5 text-caption text-danger-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="text-body font-semibold text-danger-700 hover:text-danger-600"
          >
            Thử lại
          </button>
        </div>
      )}

      <section
        aria-label="Chỉ số tổng quan"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group block">
            <StatCard
              {...stat}
              className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary-200"
            />
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card
          title="Cảnh báo kho"
          subtitle="Các mặt hàng cần được ưu tiên kiểm tra"
          className="xl:col-span-2"
          padding={false}
          actions={
            <Badge variant={totalAlerts > 0 ? 'warning' : 'success'} dot>
              {loading ? 'Đang tải' : `${totalAlerts} cảnh báo`}
            </Badge>
          }
        >
          {loading ? (
            <LoadingState label="Đang kiểm tra tồn kho và hạn dùng..." />
          ) : (
            <div className="grid grid-cols-1 divide-y divide-neutral-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <AlertGroup
                title="Sắp hết hàng"
                subtitle="Tồn kho từ 10 trở xuống"
                items={data.sapHetHang}
                type="stock"
                viewAll="/kho/sap-het-hang"
              />
              <AlertGroup
                title="Sắp hết hạn"
                subtitle="Lô hết hạn trong 30 ngày"
                items={data.sapHetHan}
                type="expiry"
                viewAll="/kho/sap-het-han"
              />
            </div>
          )}
        </Card>

        <Card title="Thao tác nhanh" subtitle="Theo quyền của tài khoản" padding={false}>
          <div className="divide-y divide-neutral-100">
            {quickActions.map(([label, description, to, Icon, tone]) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 p-4 transition-colors hover:bg-neutral-50"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card transition-colors',
                    ACTION_TONES[tone]
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-neutral-900">
                    {label}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-neutral-500">
                    {description}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-neutral-400 transition-colors group-hover:text-primary-600" />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card
          title="Phân bổ danh mục thuốc"
          subtitle="Số lượng thuốc đang được quản lý trong từng danh mục"
          actions={
            <Link
              to="/danh-muc"
              className="inline-flex items-center gap-1 text-caption font-semibold text-primary-700 hover:text-primary-600"
            >
              {role === 'Admin' ? 'Quản lý danh mục' : 'Xem danh mục'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {loading ? (
            <LoadingState label="Đang tải danh mục..." />
          ) : sortedCategories.length === 0 ? (
            <EmptyDashboardState
              icon={FolderTree}
              title="Chưa có danh mục thuốc"
              description="Tạo danh mục trước khi thêm thuốc vào hệ thống."
            />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
              {sortedCategories.map((category, index) => {
                const count = Number(category.SoThuoc || 0);
                const width = `${Math.round((count / maxCategoryCount) * 100)}%`;
                return (
                  <div key={category.MaDM}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body font-semibold text-neutral-900">
                          {category.TenDM}
                        </p>
                        <p className="text-caption text-neutral-500">{category.MaDM}</p>
                      </div>
                      <span className="flex-shrink-0 text-body font-semibold text-neutral-800">
                        {count.toLocaleString('vi-VN')} thuốc
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-pill bg-neutral-100">
                      <div
                        className={cn(
                          'h-full rounded-pill transition-all duration-500',
                          CATEGORY_TONES[index % CATEGORY_TONES.length]
                        )}
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function AlertGroup({ title, subtitle, items, type, viewAll }) {
  const visibleItems = items.slice(0, 4);
  const isStock = type === 'stock';

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <h4 className="text-body font-semibold text-neutral-900">{title}</h4>
          <p className="mt-0.5 text-caption text-neutral-500">{subtitle}</p>
        </div>
        <Badge variant={items.length > 0 ? 'warning' : 'success'} size="sm">
          {items.length}
        </Badge>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyDashboardState
          icon={isStock ? Warehouse : CalendarClock}
          title="Không có cảnh báo"
          description={
            isStock
              ? 'Tồn kho đang trên ngưỡng cảnh báo.'
              : 'Không có lô hết hạn trong 30 ngày.'
          }
        />
      ) : (
        <div className="divide-y divide-neutral-100">
          {visibleItems.map((item) => {
            const medicineId = item.MaThuoc;
            const daysLeft = Number(item.SoNgayConLai || 0);
            const isUrgent = !isStock && daysLeft <= 7;
            return (
              <Link
                key={isStock ? medicineId : item.MaLo}
                to={`/thuoc/${medicineId}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-neutral-50"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-card',
                    isUrgent
                      ? 'bg-danger-50 text-danger-600'
                      : 'bg-warning-50 text-warning-600'
                  )}
                >
                  {isStock ? (
                    <PackageX className="h-4 w-4" />
                  ) : (
                    <CalendarClock className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-neutral-900">
                    {item.TenThuoc}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-neutral-500">
                    {isStock
                      ? `Mã #${medicineId} · Còn ${Number(item.SoLuongTonKho || 0)} sản phẩm`
                      : `Lô #${item.MaLo} · Còn ${daysLeft} ngày · Tồn ${Number(item.SoLuongTonKho || 0)}`}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-300 transition-colors group-hover:text-primary-600" />
              </Link>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="border-t border-neutral-100 px-5 py-3 text-right">
          <Link
            to={viewAll}
            className="inline-flex items-center gap-1 text-caption font-semibold text-primary-700 hover:text-primary-600"
          >
            Xem tất cả
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyDashboardState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center px-5 py-6 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-card bg-success-50 text-success-600">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-body font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 max-w-xs text-caption text-neutral-500">{description}</p>
    </div>
  );
}

export default DashboardPage;

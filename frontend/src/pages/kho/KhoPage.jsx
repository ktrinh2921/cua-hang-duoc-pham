/**
 * KhoPage - Hub tổng hợp kho (sau khi click menu "Quản lý kho")
 *
 * Sections:
 *   1. 4 Stat card realtime    — Tổng tồn / Giá trị tồn / Sắp hết hàng / Sắp hết hạn
 *   2. Dashboard panels (2 cột):
 *      - HealthScoreCard       — Sức khỏe kho 0-100 (donut)
 *      - TonKhoParetoChart     — Phân bổ tồn theo danh mục (Pareto top 10)
 *   3. 5 Quick-link cards      — Tồn kho / Nhập thuốc / Phiếu nhập / Cảnh báo / Kiểm kê
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Warehouse,
  Package,
  Truck,
  PackagePlus,
  Clock,
  PackageX,
  ArrowRight,
  Wallet,
  History,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import LoadingState from '../../components/ui/LoadingState';
import RoleGuard from '../../components/ui/RoleGuard';
import HealthScoreCard from '../../components/kho/HealthScoreCard';
import TonKhoParetoChart from '../../components/kho/TonKhoParetoChart';
import khoService from '../../services/khoService';
import { formatCurrencyCompact } from '../../utils/format';

function KhoPage() {
  const [thongKeTong, setThongKeTong] = useState(null);
  const [sapHetHang, setSapHetHang] = useState(null);
  const [sapHetHan, setSapHetHan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [tk, shh, shHan] = await Promise.all([
          khoService.getThongKeTong(),
          khoService.getSapHetHang(10),
          khoService.getSapHetHan(30),
        ]);
        setThongKeTong(tk.data);
        setSapHetHang(shh.data);
        setSapHetHan(shHan.data);
      } catch (err) {
        toast.error('Không thể tải thông tin kho');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <LoadingState label="Đang tải thông tin kho..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={<Warehouse />}
        title="Quản lý kho"
        subtitle="Theo dõi tồn kho, lô thuốc, cảnh báo hạn dùng & kiểm kê"
        actions={
          <RoleGuard roles={['Admin', 'NV_Kho']}>
            <Link to="/kho/nhap">
              <Button variant="primary" icon={<PackagePlus />}>
                Nhập thuốc
              </Button>
            </Link>
          </RoleGuard>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng tồn kho"
          value={(thongKeTong?.tongTon || 0).toLocaleString('vi-VN')}
          icon={<Package />}
          color="primary"
        />
        <RoleGuard
          roles={['Admin']}
          fallback={
            <StatCard
              label="Số lô đang có"
              value={(thongKeTong?.tongSoLo || 0).toLocaleString('vi-VN')}
              icon={<Warehouse />}
              color="info"
            />
          }
        >
          <StatCard
            label="Giá trị tồn kho"
            value={formatCurrencyCompact(thongKeTong?.giaTriTonKho || 0)}
            icon={<Wallet />}
            color="info"
            title={
              thongKeTong?.giaTriTonKho
                ? new Intl.NumberFormat('vi-VN').format(thongKeTong.giaTriTonKho) + ' ₫'
                : undefined
            }
          />
        </RoleGuard>
        <Link to="/kho/sap-het-hang">
          <StatCard
            label="Sắp hết hàng (1–10)"
            value={sapHetHang?.total || 0}
            icon={<PackageX />}
            color={sapHetHang?.total > 0 ? 'warning' : 'success'}
          />
        </Link>
        <Link to="/kho/sap-het-han">
          <StatCard
            label="Sắp hết hạn (≤30 ngày)"
            value={sapHetHan?.total || 0}
            icon={<Clock />}
            color={sapHetHan?.total > 0 ? 'danger' : 'success'}
          />
        </Link>
      </div>

      {/* Dashboard panels: Health Score + Pareto Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HealthScoreCard
          tongTon={thongKeTong?.tongTon || 0}
          sapHetHang={
            (sapHetHang?.items || []).reduce(
              (s, it) => s + Number(it.SoLuongTonKho || 0),
              0
            )
          }
          sapHetHan={
            (sapHetHan?.items || []).reduce(
              (s, it) => s + Number(it.SoLuongTonKho || 0),
              0
            )
          }
          daHetHan={Number(thongKeTong?.soLuongDaHetHan) || 0}
        />
        <div className="lg:col-span-2">
          <TonKhoParetoChart data={thongKeTong?.theoDanhMuc || []} />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link to="/kho/ton-kho">
          <Card
            hoverable
            title="Tồn kho"
            subtitle="Xem chi tiết tồn kho theo thuốc"
            actions={<ArrowRight className="w-4 h-4 text-neutral-400" />}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-card bg-primary-100 text-primary-700 flex items-center justify-center">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <p className="text-h3 font-bold text-neutral-900">
                  {thongKeTong?.soThuocCoTon || 0}
                </p>
                <p className="text-caption text-neutral-500">mặt hàng có tồn</p>
              </div>
            </div>
          </Card>
        </Link>

        <RoleGuard roles={['Admin', 'NV_Kho']}>
          <Link to="/kho/nhap">
            <Card
              hoverable
              title="Nhập thuốc"
              subtitle="Tạo phiếu nhập mới"
              actions={<ArrowRight className="w-4 h-4 text-neutral-400" />}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-card bg-accent-100 text-accent-700 flex items-center justify-center">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-h3 font-bold text-neutral-900">Phiếu nhập</p>
                  <p className="text-caption text-neutral-500">Tạo mới</p>
                </div>
              </div>
            </Card>
          </Link>
        </RoleGuard>

        <RoleGuard roles={['Admin', 'NV_Kho']}>
          <Link to="/kho/phieu-nhap">
            <Card
              hoverable
              title="Danh sách phiếu nhập"
              subtitle="Xem, hủy các phiếu nhập đã tạo"
              actions={<ArrowRight className="w-4 h-4 text-neutral-400" />}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-card bg-info-100 text-info-700 flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-h3 font-bold text-neutral-900">Lịch sử</p>
                  <p className="text-caption text-neutral-500">Quản lý phiếu</p>
                </div>
              </div>
            </Card>
          </Link>
        </RoleGuard>

        <Link to="/kho/sap-het-han">
          <Card
            hoverable
            title="Cảnh báo hạn dùng"
            subtitle="Thuốc sắp hết hạn trong 30 ngày"
            actions={<ArrowRight className="w-4 h-4 text-neutral-400" />}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-card flex items-center justify-center ${
                  sapHetHan?.total > 0
                    ? 'bg-danger-100 text-danger-700'
                    : 'bg-success-100 text-success-700'
                }`}
              >
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-h3 font-bold text-neutral-900">
                  {sapHetHan?.total || 0}
                </p>
                <p className="text-caption text-neutral-500">lô cần xử lý</p>
              </div>
            </div>
          </Card>
        </Link>

        <RoleGuard roles={['Admin', 'NV_Kho']}>
          <Link to="/kho/lich-su-dieu-chinh">
            <Card
              hoverable
              title="Lịch sử kiểm kê"
              subtitle="Điều chỉnh tồn kho theo lô"
              actions={<ArrowRight className="w-4 h-4 text-neutral-400" />}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-card bg-warning-100 text-warning-700 flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-h3 font-bold text-neutral-900">Kiểm kê</p>
                  <p className="text-caption text-neutral-500">Audit trail</p>
                </div>
              </div>
            </Card>
          </Link>
        </RoleGuard>
      </div>
    </div>
  );
}

export default KhoPage;

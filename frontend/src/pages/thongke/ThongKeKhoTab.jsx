/**
 * ThongKeKhoTab - Tồn kho + cảnh báo (All roles)
 *
 * Nâng cấp:
 *  - 5 stat cards chính + 4 stat phụ (tổng tồn, số mặt hàng, sắp hết hàng, sắp hết hạn, giá trị tồn,
 *    số phiếu nhập, tổng tiền nhập, vòng quay tồn kho, bán TB/ngày)
 *  - PieChart: TOP 5 danh mục + "Khác" (BE fill sẵn)
 *  - 2 bảng: Top sắp hết hàng + Top sắp hết hạn
 *  - Hint panel giải thích "vòng quay tồn kho"
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
    BarChart3,
    Boxes,
    PackageX,
    CalendarClock,
    DollarSign,
    TrendingUp,
    PackagePlus,
    Repeat,
    ShoppingCart,
    Info,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import thongKeService from '../../services/thongKeService';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import LoadingState from '../../components/ui/LoadingState';
import { formatCurrency } from '../../utils/format';
import ReportExportActions from '../../components/common/ReportExportActions';

const CATEGORY_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
    '#06B6D4', '#EC4899', '#84CC16',
];

function ThongKeKhoTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await thongKeService.getKho();
                setData(res.data);
            } catch (err) {
                toast.error(err.response?.data?.error?.message || 'Không thể tải thống kê kho');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <LoadingState label="Đang tổng hợp dữ liệu kho..." />;
    if (!data) return null;

    const { tongQuan, tonKhoTheoDanhMuc, topSapHetHang, topSapHetHan } = data;
    const reportSections = [
        {
            title: 'Tổng quan kho',
            rows: [
                { 'Chỉ số': 'Tổng tồn kho', 'Giá trị': tongQuan.tongSoLuongTon },
                { 'Chỉ số': 'Số mặt hàng', 'Giá trị': tongQuan.soMatHang },
                { 'Chỉ số': 'Sắp hết hàng', 'Giá trị': tongQuan.soLuongSapHetHang },
                { 'Chỉ số': 'Sắp hết hạn', 'Giá trị': tongQuan.soLuongSapHetHan },
                { 'Chỉ số': 'Giá trị tồn kho', 'Giá trị': tongQuan.giaTriTonKho },
            ],
        },
        {
            title: 'Tồn kho theo danh mục',
            rows: tonKhoTheoDanhMuc.map((item) => ({
                'Danh mục': item.tenDM,
                'Số lượng tồn': item.soLuongTon,
            })),
        },
        {
            title: 'Thuốc sắp hết hàng',
            rows: topSapHetHang.map((item) => ({
                'Mã thuốc': item.maThuoc,
                'Tên thuốc': item.tenThuoc,
                'Số lượng tồn': item.soLuongTon,
            })),
        },
        {
            title: 'Lô sắp hết hạn',
            rows: topSapHetHan.map((item) => ({
                'Mã lô': item.maLo,
                'Tên thuốc': item.tenThuoc,
                'Số lượng tồn': item.soLuongTon,
                'Hạn sử dụng': dayjs(item.hanSD).format('DD/MM/YYYY'),
                'Số ngày còn lại': item.soNgayConLai,
            })),
        },
    ];

    // Pie chart data
    const pieData = tonKhoTheoDanhMuc.map((item, idx) => ({
        name: item.tenDM,
        value: item.soLuongTon,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));

    const mainStats = [
        {
            label: 'Tổng tồn kho',
            value: tongQuan.tongSoLuongTon.toLocaleString('vi-VN') + ' SP',
            icon: <Boxes className="h-5 w-5" />,
            color: 'primary',
        },
        {
            label: 'Số mặt hàng',
            value: tongQuan.soMatHang.toLocaleString('vi-VN'),
            icon: <BarChart3 className="h-5 w-5" />,
            color: 'info',
        },
        {
            label: 'Sắp hết hàng (≤10)',
            value: tongQuan.soLuongSapHetHang.toLocaleString('vi-VN') + ' SP',
            icon: <PackageX className="h-5 w-5" />,
            color: tongQuan.soLuongSapHetHang > 0 ? 'warning' : 'success',
        },
        {
            label: 'Sắp hết hạn (≤30 ngày)',
            value: tongQuan.soLuongSapHetHan.toLocaleString('vi-VN') + ' SP',
            icon: <CalendarClock className="h-5 w-5" />,
            color: tongQuan.soLuongSapHetHan > 0 ? 'danger' : 'success',
        },
        {
            label: 'Giá trị tồn kho',
            value: formatCurrency(tongQuan.giaTriTonKho),
            icon: <DollarSign className="h-5 w-5" />,
            color: 'success',
        },
    ];

    const subStats = [
        {
            label: 'Tổng phiếu nhập',
            value: tongQuan.soPhieuNhap.toLocaleString('vi-VN'),
            icon: <PackagePlus className="h-5 w-5" />,
            color: 'info',
        },
        {
            label: 'Tổng tiền đã nhập',
            value: formatCurrency(tongQuan.tongTienNhap),
            icon: <DollarSign className="h-5 w-5" />,
            color: 'warning',
        },
        {
            label: 'Bán trung bình/ngày',
            value: `${tongQuan.banTrungBinhNgay.toLocaleString('vi-VN')} SP`,
            icon: <ShoppingCart className="h-5 w-5" />,
            color: 'primary',
        },
        {
            label: 'Vòng quay tồn kho',
            value: tongQuan.vongQuayTonKho !== null
                ? `~${tongQuan.vongQuayTonKho} ngày`
                : '—',
            icon: <Repeat className="h-5 w-5" />,
            color: tongQuan.vongQuayTonKho === null
                ? 'neutral'
                : tongQuan.vongQuayTonKho <= 30
                    ? 'success'
                    : tongQuan.vongQuayTonKho <= 60
                        ? 'warning'
                        : 'danger',
        },
    ];

    const columnsSapHetHang = [
        {
            key: 'ten',
            label: 'Tên thuốc',
            render: (it) => (
                <Link
                    to={`/thuoc/${it.maThuoc}`}
                    className="text-primary-700 hover:text-primary-600 font-medium"
                >
                    {it.tenThuoc}
                </Link>
            ),
        },
        {
            key: 'id',
            label: 'Mã',
            width: '100px',
            render: (it) => <span className="font-mono text-neutral-500">#{it.maThuoc}</span>,
        },
        {
            key: 'sl',
            label: 'Tồn kho',
            width: '140px',
            align: 'right',
            render: (it) => (
                <span className="font-semibold text-warning-700 font-mono">
                    {it.soLuongTon.toLocaleString('vi-VN')}
                </span>
            ),
        },
    ];

    const columnsSapHetHan = [
        {
            key: 'ten',
            label: 'Tên thuốc',
            render: (it) => (
                <Link
                    to={`/thuoc/${it.maThuoc}`}
                    className="text-primary-700 hover:text-primary-600 font-medium"
                >
                    {it.tenThuoc}
                </Link>
            ),
        },
        {
            key: 'lo',
            label: 'Lô',
            width: '80px',
            render: (it) => <span className="font-mono text-neutral-500">#{it.maLo}</span>,
        },
        {
            key: 'sl',
            label: 'Tồn',
            width: '90px',
            align: 'right',
            render: (it) => (
                <span className="font-mono font-semibold">{it.soLuongTon}</span>
            ),
        },
        {
            key: 'han',
            label: 'Hạn SD',
            width: '130px',
            render: (it) => dayjs(it.hanSD).format('DD/MM/YYYY'),
        },
        {
            key: 'conlai',
            label: 'Còn lại',
            width: '110px',
            align: 'right',
            render: (it) => {
                const urgent = it.soNgayConLai <= 7;
                return (
                    <span
                        className={`font-mono font-semibold ${
                            urgent ? 'text-danger-700' : 'text-warning-700'
                        }`}
                    >
                        {it.soNgayConLai} ngày
                    </span>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <ReportExportActions
                filename={`bao-cao-kho-${dayjs().format('YYYY-MM-DD')}`}
                title="Báo cáo tồn kho"
                subtitle={`Dữ liệu tại ${dayjs().format('DD/MM/YYYY HH:mm')}`}
                sections={reportSections}
            />
            {/* Stat cards chính */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {mainStats.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
            </div>

            {/* Stat cards phụ */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {subStats.map((s) => (
                    <StatCard key={s.label} {...s} size="sm" />
                ))}
            </div>

            {/* Hint vòng quay */}
            {tongQuan.vongQuayTonKho !== null && (
                <div className="flex items-start gap-2 p-3 bg-info-50 border border-info-100 rounded-card">
                    <Info className="w-4 h-4 text-info-600 flex-shrink-0 mt-0.5" />
                    <p className="text-caption text-info-700">
                        <span className="font-semibold">Vòng quay tồn kho:</span> với tốc độ bán hiện tại
                        (~{tongQuan.banTrungBinhNgay} SP/ngày), toàn bộ tồn kho sẽ được bán hết trong khoảng{' '}
                        <span className="font-bold font-mono">{tongQuan.vongQuayTonKho} ngày</span>.
                        Giá trị &lt; 30 ngày = bán nhanh, 30-60 = ổn, &gt; 60 = tồn chậm.
                    </p>
                </div>
            )}

            {/* Pie chart + cảnh báo */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="Tỷ lệ tồn kho theo danh mục" subtitle="Phân bổ số lượng theo nhóm thuốc">
                    {pieData.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-neutral-500">
                            Chưa có dữ liệu tồn kho
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label={(entry) => `${entry.value}`}
                                    labelLine={false}
                                >
                                    {pieData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [
                                        `${value.toLocaleString('vi-VN')} SP`,
                                        name,
                                    ]}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <div className="xl:col-span-2 space-y-4">
                    <Card
                        title={
                            <span className="flex items-center gap-2">
                                <PackageX className="h-4 w-4 text-warning-600" />
                                Top thuốc sắp hết hàng
                            </span>
                        }
                        subtitle="Tồn kho ≤ 10 sản phẩm"
                        actions={
                            <Link
                                to="/kho/sap-het-hang"
                                className="text-caption font-semibold text-primary-700 hover:text-primary-600"
                            >
                                Xem tất cả
                            </Link>
                        }
                        padding={false}
                    >
                        <Table
                            columns={columnsSapHetHang}
                            data={topSapHetHang}
                            rowKey="maThuoc"
                            emptyTitle="Không có thuốc sắp hết hàng"
                            emptyDescription="Tồn kho đang ổn định"
                        />
                    </Card>

                    <Card
                        title={
                            <span className="flex items-center gap-2">
                                <CalendarClock className="h-4 w-4 text-danger-600" />
                                Top lô sắp hết hạn
                            </span>
                        }
                        subtitle="Lô hết hạn trong 30 ngày tới"
                        actions={
                            <Link
                                to="/kho/sap-het-han"
                                className="text-caption font-semibold text-primary-700 hover:text-primary-600"
                            >
                                Xem tất cả
                            </Link>
                        }
                        padding={false}
                    >
                        <Table
                            columns={columnsSapHetHan}
                            data={topSapHetHan}
                            rowKey="maLo"
                            emptyTitle="Không có lô sắp hết hạn"
                            emptyDescription="Tất cả lô đều còn hạn an toàn"
                        />
                    </Card>
                </div>
            </div>

            <p className="text-caption text-neutral-500 text-right">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                Số liệu realtime từ các lô còn hàng & chưa hết hạn
            </p>
        </div>
    );
}

export default ThongKeKhoTab;

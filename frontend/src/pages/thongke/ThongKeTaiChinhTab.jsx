/**
 * ThongKeTaiChinhTab - Tổng thu/chi/lợi nhuận (Admin only)
 *
 * Nâng cấp:
 *  - DateRangePresets (Hôm nay / 7 / 30 / Tháng / Quý / Năm / Custom)
 *  - DeltaIndicator: so sánh với kỳ trước (cùng độ dài)
 *  - DailyChart mới: Thu vs Chi theo ngày trong kỳ (từ BE fillDaily)
 *  - Layout 5 stat cards/hàng thay vì 9 (gộp các chỉ số phụ)
 *  - Phân tích dòng tiền chi tiết
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
    TrendingUp,
    TrendingDown,
    Scale,
    Wallet,
    Receipt,
    FileText,
    PackagePlus,
    BarChart3,
    FileSpreadsheet,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from 'recharts';
import thongKeService from '../../services/thongKeService';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import LoadingState from '../../components/ui/LoadingState';
import DateRangePresets from '../../components/common/DateRangePresets';
import DeltaIndicator from '../../components/common/DeltaIndicator';
import { formatCurrency } from '../../utils/format';
import ReportExportActions from '../../components/common/ReportExportActions';

const todayStr = () => dayjs().format('YYYY-MM-DD');
const monthAgoStr = () => dayjs().subtract(29, 'day').format('YYYY-MM-DD');

function ThongKeTaiChinhTab() {
    const [fromDate, setFromDate] = useState(monthAgoStr);
    const [toDate, setToDate] = useState(todayStr);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async (from, to) => {
        setLoading(true);
        try {
            const res = await thongKeService.getTaiChinh({
                from: from || undefined,
                to: to || undefined,
            });
            setData(res.data);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Không thể tải thống kê tài chính');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(fromDate, toDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApply = (from, to) => {
        setFromDate(from);
        setToDate(to);
        fetchData(from, to);
    };

    const ss = data?.soSanhKyTruoc;
    const reportSections = data ? [
        {
            title: 'Tổng quan tài chính',
            rows: [
                { 'Chỉ số': 'Tổng thu', 'Giá trị': data.tongQuan.tongThu },
                { 'Chỉ số': 'Tổng chi', 'Giá trị': data.tongQuan.tongChi },
                { 'Chỉ số': 'Doanh thu bán hàng', 'Giá trị': data.tongQuan.doanhThu },
                { 'Chỉ số': 'Giá vốn đã bán', 'Giá trị': data.tongQuan.giaVonDaBan },
                { 'Chỉ số': 'Lợi nhuận bán hàng', 'Giá trị': data.tongQuan.loiNhuanBanHang },
                { 'Chỉ số': 'Số dư tiền mặt', 'Giá trị': data.tongQuan.soDuTienMat },
                { 'Chỉ số': 'Số phiếu thu', 'Giá trị': data.tongQuan.soPhieuThu },
                { 'Chỉ số': 'Số phiếu chi', 'Giá trị': data.tongQuan.soPhieuChi },
            ],
        },
        {
            title: 'Thu chi theo ngày',
            rows: data.dailyChart.map((item) => ({
                'Ngày': dayjs(item.ngay).format('DD/MM/YYYY'),
                'Tổng thu': item.tongThu,
                'Tổng chi': item.tongChi,
            })),
        },
        {
            title: 'Chi phí theo nội dung',
            rows: data.chiTheoNoiDung.map((item) => ({
                'Nội dung': item.noiDung,
                'Số lần': item.soLan,
                'Tổng tiền': item.tongTien,
            })),
        },
    ] : [];

    // Stat cards: 5 chỉ số chính + 4 phụ (2 hàng)
    const mainStats = data
        ? [
            {
                label: 'Tổng thu',
                value: formatCurrency(data.tongQuan.tongThu),
                icon: <TrendingUp className="h-5 w-5" />,
                color: 'success',
                delta: ss && { pct: ss.tongThu },
            },
            {
                label: 'Tổng chi',
                value: formatCurrency(data.tongQuan.tongChi),
                icon: <TrendingDown className="h-5 w-5" />,
                color: 'danger',
                delta: ss && { pct: ss.tongChi, inverted: true },
            },
            {
                label: 'Doanh thu bán hàng',
                value: formatCurrency(data.tongQuan.doanhThu),
                icon: <Receipt className="h-5 w-5" />,
                color: 'primary',
                delta: ss && { pct: ss.doanhThu },
            },
            {
                label: 'Lợi nhuận bán hàng',
                value: formatCurrency(data.tongQuan.loiNhuanBanHang),
                icon: <BarChart3 className="h-5 w-5" />,
                color: data.tongQuan.loiNhuanBanHang >= 0 ? 'success' : 'danger',
                delta: ss && { pct: ss.loiNhuanBanHang },
            },
            {
                label: 'Số dư tiền mặt',
                value: formatCurrency(data.tongQuan.soDuTienMat),
                icon: <Scale className="h-5 w-5" />,
                color: data.tongQuan.soDuTienMat >= 0 ? 'primary' : 'danger',
                delta: ss && { pct: ss.soDuTienMat },
            },
        ]
        : [];

    const subStats = data
        ? [
            {
                label: 'Giá trị nhập hàng',
                value: formatCurrency(data.tongQuan.tongChiNhapHang),
                icon: <PackagePlus className="h-5 w-5" />,
                color: 'warning',
            },
            {
                label: 'Số hóa đơn',
                value: data.tongQuan.soHoaDon.toLocaleString('vi-VN'),
                icon: <Receipt className="h-5 w-5" />,
                color: 'info',
            },
            {
                label: 'Số phiếu chi',
                value: data.tongQuan.soPhieuChi.toLocaleString('vi-VN'),
                icon: <FileText className="h-5 w-5" />,
                color: 'info',
            },
            {
                label: 'Số phiếu nhập',
                value: data.tongQuan.soPhieuNhap.toLocaleString('vi-VN'),
                icon: <PackagePlus className="h-5 w-5" />,
                color: 'info',
            },
        ]
        : [];

    // Bar chart: chi theo noi dung
    const barData =
        data?.chiTheoNoiDung.map((c, idx) => ({
            noiDung:
                c.noiDung.length > 25 ? c.noiDung.substring(0, 25) + '...' : c.noiDung,
            tongTien: c.tongTien,
            color: ['#EF4444', '#F59E0B', '#F97316', '#DC2626', '#B91C1C'][idx] || '#EF4444',
        })) || [];

    // Daily chart: Thu vs Chi theo ngày
    const dailyData =
        data?.dailyChart?.map((d) => ({
            ngayLabel: dayjs(d.ngay).format('DD/MM'),
            tongThu: d.tongThu,
            tongChi: d.tongChi,
        })) || [];

    const columnsChi = [
        {
            key: 'stt',
            label: '#',
            width: '50px',
            render: (it, idx) => (
                <span className="font-mono font-bold text-danger-700">#{idx + 1}</span>
            ),
        },
        {
            key: 'noidung',
            label: 'Nội dung chi',
            render: (it) => <span className="text-neutral-700">{it.noiDung}</span>,
        },
        {
            key: 'sl',
            label: 'Số lần',
            width: '100px',
            align: 'right',
            render: (it) => <span className="font-mono">{it.soLan}</span>,
        },
        {
            key: 'tien',
            label: 'Tổng tiền',
            width: '180px',
            align: 'right',
            render: (it) => (
                <span className="font-mono font-semibold text-danger-700">
                    {formatCurrency(it.tongTien)}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filter */}
            <Card>
                <DateRangePresets
                    fromDate={fromDate}
                    toDate={toDate}
                    onApply={handleApply}
                    loading={loading}
                    actions={(
                      <ReportExportActions
                        filename={`bao-cao-tai-chinh-${fromDate}-${toDate}`}
                        title="Báo cáo tài chính"
                        subtitle={`Từ ${dayjs(fromDate).format('DD/MM/YYYY')} đến ${dayjs(toDate).format('DD/MM/YYYY')}`}
                        sections={reportSections}
                        disabled={!data || loading}
                        className="justify-start lg:justify-end"
                      />
                    )}
                />
            </Card>

            {ss?.kyTruoc && (
                <p className="text-caption text-neutral-500 -mt-3">
                    Đang so sánh với {dayjs(ss.kyTruoc.fromDate).format('DD/MM/YYYY')} – {dayjs(ss.kyTruoc.toDate).format('DD/MM/YYYY')} (cùng độ dài kỳ trước).
                </p>
            )}

            {/* Stats chính */}
            {data && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {mainStats.map((s) => (
                        <div key={s.label} className="relative">
                            <StatCard {...s} />
                            {s.delta && (
                                <div className="absolute top-3 right-3">
                                    <DeltaIndicator pct={s.delta.pct} inverted={s.delta.inverted} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Stats phụ */}
            {data && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {subStats.map((s) => (
                        <StatCard key={s.label} {...s} size="sm" />
                    ))}
                </div>
            )}

            {/* Biểu đồ: Thu vs Chi theo ngày */}
            {dailyData.length > 0 && (
                <Card
                    title={
                        <span className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary-600" />
                            Thu vs Chi theo ngày
                        </span>
                    }
                    subtitle="Dòng tiền vào/ra trong kỳ"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="ngayLabel" tick={{ fontSize: 12 }} />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)}
                            />
                            <Tooltip formatter={(v) => formatCurrency(v)} />
                            <Legend />
                            <Bar dataKey="tongThu" name="Thu" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="tongChi" name="Chi" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Bar chart chi phi theo nội dung */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card
                    title={
                        <span className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-danger-600" />
                            Chi phí theo nội dung (Top 5)
                        </span>
                    }
                    subtitle="Phân bổ các khoản chi trong kỳ"
                    className="xl:col-span-2"
                >
                    {loading ? (
                        <LoadingState label="Đang tải biểu đồ..." />
                    ) : barData.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-neutral-500">
                            Chưa có phiếu chi nào trong kỳ
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 30, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : v}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="noiDung"
                                    width={180}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="tongTien" name="Tổng tiền" radius={[0, 4, 4, 0]}>
                                    {barData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Chi tiết các khoản chi" padding={false}>
                    {data && (
                        <Table
                            columns={columnsChi}
                            data={data.chiTheoNoiDung}
                            rowKey="noiDung"
                            emptyTitle="Chưa có phiếu chi"
                        />
                    )}
                </Card>
            </div>

            {/* Phân tích dòng tiền */}
            {data && (
                <Card
                    title={
                        <span className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-primary-600" />
                            Phân tích dòng tiền trong kỳ
                        </span>
                    }
                    subtitle="Tổng quan dòng tiền vào/ra theo khoảng thời gian đã chọn"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-success-50 rounded-card border border-success-100">
                            <p className="text-caption text-success-700 uppercase font-semibold">
                                Dòng tiền vào
                            </p>
                            <p className="mt-1 text-h2 font-bold text-success-700 font-mono">
                                {formatCurrency(data.tongQuan.tongThu)}
                            </p>
                            <p className="mt-1 text-caption text-success-700">
                                Từ {data.tongQuan.soHoaDon.toLocaleString('vi-VN')} hóa đơn bán hàng
                            </p>
                        </div>
                        <div className="p-4 bg-danger-50 rounded-card border border-danger-100">
                            <p className="text-caption text-danger-700 uppercase font-semibold">
                                Dòng tiền ra
                            </p>
                            <p className="mt-1 text-h2 font-bold text-danger-700 font-mono">
                                {formatCurrency(data.tongQuan.tongChi)}
                            </p>
                            <p className="mt-1 text-caption text-danger-700">
                                Tổng các phiếu chi đã ghi nhận trong kỳ
                            </p>
                        </div>
                        <div
                            className={`p-4 rounded-card border ${
                                data.tongQuan.soDuTienMat >= 0
                                    ? 'bg-primary-50 border-primary-100'
                                    : 'bg-danger-50 border-danger-100'
                            }`}
                        >
                            <p
                                className={`text-caption uppercase font-semibold ${
                                    data.tongQuan.soDuTienMat >= 0 ? 'text-primary-700' : 'text-danger-700'
                                }`}
                            >
                                Số dư tiền mặt (kỳ này)
                            </p>
                            <p
                                className={`mt-1 text-h2 font-bold font-mono ${
                                    data.tongQuan.soDuTienMat >= 0 ? 'text-primary-700' : 'text-danger-700'
                                }`}
                            >
                                {formatCurrency(data.tongQuan.soDuTienMat)}
                            </p>
                            <p
                                className={`mt-1 text-caption ${
                                    data.tongQuan.soDuTienMat >= 0 ? 'text-primary-700' : 'text-danger-700'
                                }`}
                            >
                                {data.tongQuan.soDuTienMat >= 0
                                    ? 'Dòng tiền dương - kinh doanh ổn định'
                                    : 'Dòng tiền âm - cần theo dõi'}
                            </p>
                        </div>
                    </div>

                    <p className="mt-3 text-caption text-neutral-500">
                        Giá trị hàng nhập trong kỳ: {formatCurrency(data.tongQuan.tongChiNhapHang)}.
                        Khoản này chỉ ảnh hưởng quỹ khi được ghi nhận bằng phiếu chi.
                    </p>

                    <div className="mt-4 flex justify-end gap-4">
                        <Link
                            to="/phieu-chi"
                            className="text-caption font-semibold text-primary-700 hover:text-primary-600"
                        >
                            Xem lịch sử phiếu chi →
                        </Link>
                        <Link
                            to="/tai-chinh"
                            className="text-caption font-semibold text-primary-700 hover:text-primary-600"
                        >
                            Xem tổng quan tài chính →
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}

export default ThongKeTaiChinhTab;

/**
 * TaiChinhPage - Hub tổng hợp tài chính (Admin only)
 *
 * Nâng cấp:
 *  • 4 StatCards: Tổng thu / Tổng chi / Số dư quỹ / Số phiếu chi
 *  • Filter thời gian: 7 / 30 / 90 ngày, Tháng này, Năm nay
 *  • Biểu đồ cột (BarChart): Thu vs Chi theo ngày (SVG tự code)
 *  • Biểu đồ đường (LineChart): Số dư quỹ cuối ngày theo ngày
 *  • Bảng top 5 phiếu chi gần nhất + Top 5 nội dung chi phổ biến
 *  • Quick links giữ nguyên
 *
 * NOTE: Phiếu thu đã gộp vào đây (từ sidebar "Nghiệp vụ" chuyển về "Quản trị")
 *  - Hiển thị phiếu thu gần nhất bên cạnh phiếu chi
 *  - Quick link đến /phieu-thu (NV_BanHang có thể tạo "Thu khác")
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Wallet, TrendingUp, TrendingDown, Scale, History,
    Calendar, Receipt, BarChart3, LineChart as LineChartIcon,
    ChevronRight, ReceiptText,
} from 'lucide-react';
import dayjs from 'dayjs';
import phieuChiService from '../../services/phieuChiService';
import phieuThuService from '../../services/phieuThuService';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import LoadingState from '../../components/ui/LoadingState';
import { cn } from '../../utils/cn';
import { formatCurrency, formatCurrencyCompact } from '../../utils/format';
import PhieuThuSubPage from './PhieuThuSubPage';
import PhieuChiSubPage from './PhieuChiSubPage';

// ─── Range presets ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
    { key: '7', label: '7 ngày' },
    { key: '30', label: '30 ngày' },
    { key: '90', label: '90 ngày' },
    { key: 'month', label: 'Tháng này' },
    { key: 'year', label: 'Năm nay' },
];

function resolveDays(range) {
    if (range === 'month') {
        const now = dayjs();
        return now.date(); // ngày hiện tại của tháng (1-31)
    }
    if (range === 'year') {
        const start = dayjs().startOf('year');
        const today = dayjs();
        return today.diff(start, 'day') + 1;
    }
    return parseInt(range, 10) || 30;
}

// ─── BarChart: Thu vs Chi theo ngày ──────────────────────────────────────────

function BarChart({ data, width = 720, height = 260 }) {
    const padding = { top: 20, right: 16, bottom: 36, left: 56 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const maxVal = Math.max(
        ...data.flatMap((d) => [d.thu, d.chi]),
        1
    );
    const stepX = data.length > 0 ? innerW / data.length : 0;
    const barGroupW = stepX * 0.7;
    // Đảm bảo width > 0 (tránh lỗi React: <rect> attribute width: A negative value is not valid)
    // Khi data.length lớn (vd Năm nay = 260-365 ngày), stepX rất nhỏ → barW âm.
    const barW = Math.max(0, barGroupW / 2 - 1);
    const barGap = barW > 0 ? 1 : 0;

    // Y ticks (5 mức)
    const ticks = useMemo(() => {
        const t = [];
        for (let i = 0; i <= 4; i++) {
            t.push((maxVal / 4) * i);
        }
        return t;
    }, [maxVal]);

    // Format trục X: chỉ hiển thị vài label đầu/cuối + middle
    const xLabels = useMemo(() => {
        if (data.length <= 7) return data.map((d, i) => ({ idx: i, label: dayjs(d.date).format('DD/MM') }));
        const labels = [];
        const step = Math.floor(data.length / 6);
        data.forEach((d, i) => {
            if (i === 0 || i === data.length - 1 || i % step === 0) {
                labels.push({ idx: i, label: dayjs(d.date).format('DD/MM') });
            }
        });
        return labels;
    }, [data]);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Biểu đồ thu chi">
            {/* Grid lines */}
            {ticks.map((v, i) => {
                const y = padding.top + innerH - (v / maxVal) * innerH;
                return (
                    <g key={`g${i}`}>
                        <line x1={padding.left} x2={width - padding.right} y1={y} y2={y}
                              stroke="currentColor" className="text-neutral-200" strokeWidth="1" />
                        <text x={padding.left - 6} y={y + 4}
                              textAnchor="end" className="text-[10px] fill-neutral-500">
                            {formatCurrencyCompact(v)}
                        </text>
                    </g>
                );
            })}

            {/* Bars */}
            {data.map((d, i) => {
                const groupX = padding.left + i * stepX + (stepX - barGroupW) / 2;
                const thuH = (d.thu / maxVal) * innerH;
                const chiH = (d.chi / maxVal) * innerH;
                return (
                    <g key={d.date}>
                        {/* Thu (xanh) */}
                        <rect
                            x={groupX} y={padding.top + innerH - thuH}
                            width={barW} height={thuH}
                            fill="currentColor" className="text-success-500"
                            rx="2"
                        >
                            <title>{`${dayjs(d.date).format('DD/MM/YYYY')}: Thu ${formatCurrency(d.thu)}`}</title>
                        </rect>
                        {/* Chi (đỏ) */}
                        <rect
                            x={groupX + barW + barGap} y={padding.top + innerH - chiH}
                            width={barW} height={chiH}
                            fill="currentColor" className="text-danger-500"
                            rx="2"
                        >
                            <title>{`${dayjs(d.date).format('DD/MM/YYYY')}: Chi ${formatCurrency(d.chi)}`}</title>
                        </rect>
                    </g>
                );
            })}

            {/* X labels */}
            {xLabels.map(({ idx, label }) => {
                const x = padding.left + idx * stepX + stepX / 2;
                return (
                    <text key={`xl${idx}`} x={x} y={height - 12}
                          textAnchor="middle" className="text-[10px] fill-neutral-500">
                        {label}
                    </text>
                );
            })}

            {/* Trục */}
            <line x1={padding.left} x2={width - padding.right}
                  y1={padding.top + innerH} y2={padding.top + innerH}
                  stroke="currentColor" className="text-neutral-300" strokeWidth="1" />
        </svg>
    );
}

// ─── LineChart: Số dư quỹ cuối ngày ─────────────────────────────────────────

function LineChart({ data, width = 720, height = 260 }) {
    const padding = { top: 20, right: 16, bottom: 36, left: 64 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    if (data.length === 0) {
        return <div className="text-center text-neutral-400 py-8 text-body">Chưa có dữ liệu</div>;
    }

    const values = data.map((d) => d.soDu);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    // Pad range
    const range = maxVal - minVal || 1;
    const yPad = range * 0.1;
    const yMin = minVal - yPad;
    const yMax = maxVal + yPad;
    const yRange = yMax - yMin;

    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const points = data.map((d, i) => {
        const x = padding.left + i * stepX;
        const y = padding.top + innerH - ((d.soDu - yMin) / yRange) * innerH;
        return { x, y, ...d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath =
        `${linePath} L${points[points.length - 1].x},${padding.top + innerH} ` +
        `L${points[0].x},${padding.top + innerH} Z`;

    // Y ticks
    const ticks = useMemo(() => {
        const t = [];
        for (let i = 0; i <= 4; i++) {
            t.push(yMin + (yRange / 4) * i);
        }
        return t;
    }, [yMin, yRange]);

    // X labels
    const xLabels = useMemo(() => {
        if (data.length <= 7) return data.map((d, i) => ({ idx: i, label: dayjs(d.date).format('DD/MM') }));
        const labels = [];
        const step = Math.floor(data.length / 6);
        data.forEach((d, i) => {
            if (i === 0 || i === data.length - 1 || i % step === 0) {
                labels.push({ idx: i, label: dayjs(d.date).format('DD/MM') });
            }
        });
        return labels;
    }, [data]);

    // Zero line if applicable
    const zeroY = (() => {
        if (yMin > 0 || yMax < 0) return null;
        return padding.top + innerH - ((0 - yMin) / yRange) * innerH;
    })();

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Biểu đồ số dư quỹ">
            {/* Grid lines */}
            {ticks.map((v, i) => {
                const y = padding.top + innerH - ((v - yMin) / yRange) * innerH;
                return (
                    <g key={`g${i}`}>
                        <line x1={padding.left} x2={width - padding.right} y1={y} y2={y}
                              stroke="currentColor" className="text-neutral-200" strokeWidth="1" />
                        <text x={padding.left - 6} y={y + 4}
                              textAnchor="end" className="text-[10px] fill-neutral-500">
                            {formatCurrencyCompact(v)}
                        </text>
                    </g>
                );
            })}

            {/* Zero line */}
            {zeroY !== null && (
                <line x1={padding.left} x2={width - padding.right}
                      y1={zeroY} y2={zeroY}
                      stroke="currentColor" className="text-danger-400" strokeWidth="1" strokeDasharray="4 4" />
            )}

            {/* Area */}
            <path d={areaPath} fill="currentColor" className="text-primary-100/60" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="currentColor"
                  className="text-primary-600" strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round" />

            {/* Points */}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3"
                        fill="white" stroke="currentColor"
                        className="text-primary-600" strokeWidth="2">
                    <title>{`${dayjs(p.date).format('DD/MM/YYYY')}: ${formatCurrency(p.soDu)}`}</title>
                </circle>
            ))}

            {/* X labels */}
            {xLabels.map(({ idx, label }) => {
                const x = padding.left + idx * stepX;
                return (
                    <text key={`xl${idx}`} x={x} y={height - 12}
                          textAnchor="middle" className="text-[10px] fill-neutral-500">
                        {label}
                    </text>
                );
            })}

            {/* Trục */}
            <line x1={padding.left} x2={width - padding.right}
                  y1={padding.top + innerH} y2={padding.top + innerH}
                  stroke="currentColor" className="text-neutral-300" strokeWidth="1" />
        </svg>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function TaiChinhPage() {
    const navigate = useNavigate();
    // Tab nội bộ: 'overview' | 'phieu-thu' | 'phieu-chi'
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [recentThu, setRecentThu] = useState([]);
    const [totalPhieuThu, setTotalPhieuThu] = useState(0);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('30');

    const fetchStats = useCallback(async (days) => {
        setLoading(true);
        try {
            const [statsRes, thuRes] = await Promise.all([
                phieuChiService.getStats({ days }),
                phieuThuService.getAll({ page: 1, limit: 5 }).catch(() => ({ data: { items: [], pagination: { total: 0 } } })),
            ]);
            setStats(statsRes.data);
            setRecentThu(thuRes.data?.items || []);
            setTotalPhieuThu(thuRes.data?.pagination?.total || 0);
        } catch (err) {
            toast.error('Không thể tải thông tin tài chính');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats(resolveDays(range));
    }, [range, fetchStats]);

    const goToChiList = () => setActiveTab('phieu-chi');

    if (loading && !stats) {
        return <LoadingState label="Đang tải thông tin tài chính..." />;
    }

    const soDu = stats?.soDu ?? 0;
    const tongThu = stats?.tongThu ?? 0;
    const tongChi = stats?.tongChi ?? 0;
    const tongThuKhoang = stats?.tongThuTrongKhoang ?? 0;
    const tongChiKhoang = stats?.tongChiTrongKhoang ?? 0;
    const soDuCuoiKy = stats?.soDuCuoiKy ?? soDu;
    const soPhieuChi = stats?.soPhieuChi ?? 0;
    const soPhieuThu = totalPhieuThu;

    const chartData = stats?.chartData || [];
    const balanceChart = stats?.balanceChart || [];
    const topNoiDung = stats?.topNoiDung || [];
    const recentPhieuChi = stats?.recentPhieuChi || [];

    // Tổng tiền top 5 nội dung
    const tongNoiDung = topNoiDung.reduce((s, x) => s + (x.tongTien || 0), 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeader
                icon={<Wallet />}
                title="Tài chính"
                subtitle="Theo dõi dòng tiền vào/ra và số dư quỹ hiện tại"
            />

            {/* ── Stats row (5 cards, cùng 1 hàng) ───────────────────── */}
            <section
                aria-label="Tổng quan tài chính"
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            >
                <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Tổng thu"
                    value={formatCurrency(tongThu)}
                    color="success"
                />
                <StatCard
                    icon={<TrendingDown className="h-5 w-5" />}
                    label="Tổng chi"
                    value={formatCurrency(tongChi)}
                    color="danger"
                />
                <StatCard
                    icon={<Scale className="h-5 w-5" />}
                    label="Số dư quỹ"
                    value={formatCurrency(soDu)}
                    color={soDu >= 0 ? 'primary' : 'danger'}
                />
                <StatCard
                    icon={<ReceiptText className="h-5 w-5" />}
                    label="Số phiếu thu"
                    value={(soPhieuThu ?? 0).toLocaleString('vi-VN')}
                    color="success"
                />
                <StatCard
                    icon={<Receipt className="h-5 w-5" />}
                    label="Số phiếu chi"
                    value={(soPhieuChi ?? 0).toLocaleString('vi-VN')}
                    color="info"
                />
            </section>

            {/* ── Sub-nav (3 tab: Tổng quan / Phiếu thu / Phiếu chi) ────── */}
            <nav aria-label="Mục tài chính" className="border-b border-neutral-200">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                        { key: 'overview', label: 'Tổng quan', icon: Wallet },
                        { key: 'phieu-thu', label: 'Phiếu thu', icon: ReceiptText },
                        { key: 'phieu-chi', label: 'Phiếu chi', icon: Receipt },
                    ].map(({ key, label, icon: Icon }) => (
                        <button key={key} type="button"
                            onClick={() => setActiveTab(key)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2.5 text-body font-medium border-b-2 transition-colors whitespace-nowrap',
                                activeTab === key
                                    ? 'border-primary-600 text-primary-700'
                                    : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                            )}>
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── Nội dung theo tab ───────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <>
                    {/* Range filter + biểu đồ + tables đã render bên dưới */}
                </>
            )}
            {activeTab === 'phieu-thu' && <PhieuThuSubPage />}
            {activeTab === 'phieu-chi' && <PhieuChiSubPage />}

            {/* ── Range filter + Biểu đồ + Tables (chỉ hiện ở Tổng quan) ─── */}
            {activeTab === 'overview' && (
            <>
            {/* Range filter + secondary KPIs */}
            <Card>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-x-6 gap-y-3">
                    {/* Range buttons */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span className="text-caption font-medium text-neutral-600 flex-shrink-0">Khoảng thời gian:</span>
                        <div className="flex items-center gap-1">
                            {RANGE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setRange(opt.key)}
                                    className={cn(
                                        'px-2.5 py-1 text-caption rounded-btn border transition-colors whitespace-nowrap',
                                        range === opt.key
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trong khoảng stats */}
                    <div className="flex items-center gap-4 lg:gap-6">
                        <div>
                            <p className="text-caption text-neutral-500">Thu trong kỳ</p>
                            <p className="text-body font-bold text-success-700 font-mono">
                                {formatCurrency(tongThuKhoang)}
                            </p>
                        </div>
                        <div>
                            <p className="text-caption text-neutral-500">Chi trong kỳ</p>
                            <p className="text-body font-bold text-danger-700 font-mono">
                                {formatCurrency(tongChiKhoang)}
                            </p>
                        </div>
                        <div>
                            <p className="text-caption text-neutral-500">Số dư cuối kỳ</p>
                            <p className={cn(
                                'text-body font-bold font-mono',
                                soDuCuoiKy >= 0 ? 'text-primary-700' : 'text-danger-700'
                            )}>
                                {formatCurrency(soDuCuoiKy)}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── Biểu đồ ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* BarChart: Thu vs Chi */}
                <Card
                    title={
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary-600" />
                            <span>Thu vs Chi theo ngày</span>
                        </div>
                    }
                    subtitle={`${chartData.length} ngày gần nhất`}
                >
                    {chartData.length === 0 ? (
                        <div className="text-center text-neutral-400 py-12 text-body">
                            Chưa có dữ liệu thu chi trong khoảng
                        </div>
                    ) : (
                        <>
                            <BarChart data={chartData} />
                            <div className="flex items-center justify-center gap-6 mt-3 text-caption">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-success-500 inline-block" />
                                    <span className="text-neutral-700">Thu</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-danger-500 inline-block" />
                                    <span className="text-neutral-700">Chi</span>
                                </span>
                            </div>
                        </>
                    )}
                </Card>

                {/* LineChart: Số dư quỹ */}
                <Card
                    title={
                        <div className="flex items-center gap-2">
                            <LineChartIcon className="w-4 h-4 text-primary-600" />
                            <span>Số dư quỹ theo ngày</span>
                        </div>
                    }
                    subtitle="Số dư cuối ngày (tích lũy)"
                >
                    {balanceChart.length === 0 ? (
                        <div className="text-center text-neutral-400 py-12 text-body">
                            Chưa có dữ liệu
                        </div>
                    ) : (
                        <LineChart data={balanceChart} />
                    )}
                </Card>
            </div>

            {/* ── Tables: Recent + Top nội dung chi ───────────────────────── */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Recent phiếu chi - 2/3 */}
                <Card
                    className="xl:col-span-2"
                    title={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-primary-600" />
                                <span>Phiếu chi gần nhất</span>
                            </div>
                            <button
                                type="button"
                                onClick={goToChiList}
                                className="text-caption text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                Xem tất cả
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    }
                    subtitle={`${recentPhieuChi.length} phiếu mới nhất`}
                >
                    {recentPhieuChi.length === 0 ? (
                        <div className="text-center text-neutral-400 py-8 text-body">
                            Chưa có phiếu chi nào
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-100 -mx-4">
                            {recentPhieuChi.map((pc) => (
                                <button
                                    key={pc.MaPhieuChi}
                                    type="button"
                                    onClick={() => navigate('/tai-chinh/phieu-chi', { state: { viewId: pc.MaPhieuChi } })}
                                    className="w-full px-4 py-3 hover:bg-neutral-50 transition-colors flex items-center gap-3 text-left focus:outline-none focus-visible:bg-primary-50"
                                >
                                    <span className="w-10 h-10 rounded-card bg-danger-50 text-danger-700 flex items-center justify-center flex-shrink-0">
                                        <TrendingDown className="w-5 h-5" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body text-neutral-900 truncate" title={pc.NoiDung}>
                                            {pc.NoiDung}
                                        </p>
                                        <p className="text-caption text-neutral-500 flex items-center gap-2 flex-wrap">
                                            <span className="font-mono">#{pc.MaPhieuChi}</span>
                                            <span>•</span>
                                            <span>{pc.TenNV || `NV #${pc.MaNV}`}</span>
                                            <span>•</span>
                                            <span>{dayjs(pc.NgayLap).format('DD/MM/YYYY HH:mm')}</span>
                                        </p>
                                    </div>
                                    <span className="text-body font-bold text-danger-700 font-mono flex-shrink-0">
                                        −{formatCurrency(pc.SoTien)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Top nội dung chi - 1/3 */}
                <Card
                    title={
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary-600" />
                            <span>Top nội dung chi</span>
                        </div>
                    }
                    subtitle="5 khoản chi phổ biến nhất"
                >
                    {topNoiDung.length === 0 ? (
                        <div className="text-center text-neutral-400 py-8 text-body">
                            Chưa có dữ liệu
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topNoiDung.map((item, idx) => {
                                const pct = tongNoiDung > 0 ? (item.tongTien / tongNoiDung) * 100 : 0;
                                return (
                                    <div key={`${item.noiDung}-${idx}`}>
                                        <div className="flex items-center justify-between text-caption mb-1">
                                            <span className="text-neutral-800 truncate flex-1 min-w-0" title={item.noiDung}>
                                                {idx + 1}. {item.noiDung}
                                            </span>
                                            <span className="font-mono font-semibold text-danger-700 flex-shrink-0 ml-2">
                                                {formatCurrency(item.tongTien)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-danger-500 rounded-full transition-all"
                                                    style={{ width: `${Math.max(pct, 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-caption text-neutral-500 w-12 text-right flex-shrink-0">
                                                {item.soLan} lần
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
            </>
            )}
        </div>
    );
}

export default TaiChinhPage;

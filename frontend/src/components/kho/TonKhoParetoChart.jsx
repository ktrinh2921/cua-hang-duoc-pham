/**
 * TonKhoParetoChart - Biểu đồ phân bổ tồn kho theo danh mục
 *
 * Dùng BarChart ngang (Recharts) — phù hợp với tên danh mục dài,
 * sắp xếp giảm dần theo số lượng tồn.
 *
 * Props:
 *  - data: [{ maDM, tenDM, soLuongTon, giaTri, soThuoc }]
 */
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import LoadingState from '../ui/LoadingState';
import { formatCurrencyCompact } from '../../utils/format';

const PALETTE = [
    '#3B82F6', // primary blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EF4444', // red
    '#06B6D4', // cyan
    '#EC4899', // pink
    '#84CC16', // lime
    '#F97316', // orange
    '#6366F1', // indigo
];

function CustomTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-neutral-900 text-white text-caption rounded-btn px-3 py-2 shadow-lg">
            <p className="font-semibold mb-1">{d.tenDM}</p>
            <p>
                Tồn:{' '}
                <span className="font-mono font-bold">
                    {d.soLuongTon.toLocaleString('vi-VN')}
                </span>
            </p>
            <p>
                Giá trị:{' '}
                <span className="font-mono font-bold">
                    {formatCurrencyCompact(d.giaTri)}
                </span>
            </p>
            <p>Số thuốc: {d.soThuoc}</p>
            <p>Tỷ lệ: {d.tyLe.toFixed(1)}%</p>
        </div>
    );
}

export default function TonKhoParetoChart({ data, loading = false }) {
    if (loading) {
        return (
            <div className="bg-white rounded-card shadow-card border border-neutral-200/60 p-6 h-full min-h-[320px] flex items-center justify-center">
                <LoadingState label="Đang tổng hợp phân bổ kho..." />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-card shadow-card border border-neutral-200/60 p-6 h-full min-h-[320px] flex flex-col items-center justify-center text-neutral-500">
                <Package className="w-10 h-10 mb-3 text-neutral-300" />
                <p className="text-body font-medium">Chưa có dữ liệu tồn kho</p>
                <p className="text-caption mt-1">Cần có phiếu nhập Đã nhập để thống kê</p>
            </div>
        );
    }

    // Sort giảm dần theo số lượng, lấy tối đa 10 danh mục (Pareto)
    const sorted = [...data]
        .sort((a, b) => b.soLuongTon - a.soLuongTon)
        .slice(0, 10);
    const tong = sorted.reduce((s, d) => s + d.soLuongTon, 0);
    const chartData = sorted.map((d, idx) => ({
        ...d,
        tyLe: tong > 0 ? (d.soLuongTon / tong) * 100 : 0,
        color: PALETTE[idx % PALETTE.length],
    }));

    return (
        <div className="bg-white rounded-card shadow-card border border-neutral-200/60 p-6 h-full flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-11 h-11 rounded-card bg-info-50 text-info-600 flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                    >
                        <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-h3 text-neutral-900 truncate">
                            Phân bổ tồn kho theo danh mục
                        </h3>
                        <p className="text-caption text-neutral-500">
                            Top {chartData.length} danh mục — tổng{' '}
                            {tong.toLocaleString('vi-VN')} sản phẩm
                        </p>
                    </div>
                </div>
                <Link
                    to="/kho/ton-kho"
                    className="text-caption font-medium text-primary-700 hover:text-primary-800 flex items-center gap-1 flex-shrink-0"
                >
                    Chi tiết <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis
                            type="number"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => v.toLocaleString('vi-VN')}
                        />
                        <YAxis
                            type="category"
                            dataKey="tenDM"
                            stroke="#6B7280"
                            tick={{ fontSize: 12 }}
                            width={140}
                            tickFormatter={(v) =>
                                v.length > 22 ? v.slice(0, 20) + '...' : v
                            }
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                        />
                        <Bar dataKey="soLuongTon" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {chartData.map((entry, i) => (
                                <Cell key={`c-${i}`} fill={entry.color} />
                            ))}
                            <LabelList
                                dataKey="soLuongTon"
                                position="right"
                                formatter={(v) => v.toLocaleString('vi-VN')}
                                style={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

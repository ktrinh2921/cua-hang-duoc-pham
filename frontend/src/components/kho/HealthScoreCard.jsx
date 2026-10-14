/**
 * HealthScoreCard - "Sức khỏe kho" 0-100
 *
 * Tính điểm tổng hợp từ 4 tiêu chí (đã có sẵn trên Hub, FE-only):
 *  - Tỷ lệ sắp hết hàng trên tổng tồn        (weight 30)
 *  - Tỷ lệ sắp hết hạn (≤30 ngày)            (weight 50 — cao nhất vì dược)
 *  - Tỷ lệ đã hết hạn                        (weight 100 — rất nặng)
 *  - Hiệu suất nhập hàng (đang tạm bỏ qua)
 *
 * Score = 100 - Σ (tyLe × trongSo)
 * Bị clamp [0, 100].
 *
 * Phân loại:
 *  - ≥ 85  : Khỏe mạnh         (success - xanh)
 *  - 60-84 : Cần chú ý         (warning - vàng)
 *  - < 60  : Cần xử lý ngay    (danger  - đỏ)
 */
import { useMemo } from 'react';
import { Activity, Heart, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

function calcScore({ tongTon, sapHetHang, sapHetHan, daHetHan }) {
    const tong = Math.max(1, Number(tongTon) || 0); // tránh chia 0
    const slHang = Math.max(0, Number(sapHetHang) || 0);
    const slHan = Math.max(0, Number(sapHetHan) || 0);
    const slQuaHan = Math.max(0, Number(daHetHan) || 0);

    // Tỷ lệ 0..1
    const pHang = slHang / tong;
    const pHan = slHan / tong;
    const pQuaHan = slQuaHan / tong;

    // Trừ điểm (có trọng số)
    const diemTru = pHang * 30 + pHan * 50 + pQuaHan * 100;

    return Math.max(0, Math.min(100, Math.round(100 - diemTru)));
}

function getLevel(score) {
    if (score >= 85) return { tier: 'success', label: 'Khỏe mạnh', desc: 'Kho đang vận hành ổn định' };
    if (score >= 60) return { tier: 'warning', label: 'Cần chú ý', desc: 'Có một số cảnh báo cần xử lý' };
    return { tier: 'danger', label: 'Cần xử lý ngay', desc: 'Kho đang có rủi ro nghiêm trọng' };
}

const TIER_STYLES = {
    success: {
        ring: 'text-success-500',
        text: 'text-success-700',
        bg: 'bg-success-50',
        border: 'border-success-200',
        stroke: '#10B981',
    },
    warning: {
        ring: 'text-warning-500',
        text: 'text-warning-700',
        bg: 'bg-warning-50',
        border: 'border-warning-200',
        stroke: '#F59E0B',
    },
    danger: {
        ring: 'text-danger-500',
        text: 'text-danger-700',
        bg: 'bg-danger-50',
        border: 'border-danger-200',
        stroke: '#EF4444',
    },
};

export default function HealthScoreCard({
    tongTon = 0,
    sapHetHang = 0,
    sapHetHan = 0,
    daHetHan = 0,
}) {
    const score = useMemo(
        () => calcScore({ tongTon, sapHetHang, sapHetHan, daHetHan }),
        [tongTon, sapHetHang, sapHetHan, daHetHan]
    );

    const level = getLevel(score);
    const style = TIER_STYLES[level.tier];

    // Tính % hiển thị vòng cung (chu vi hình tròn với r=40 là ~251)
    const CIRCUMFERENCE = 2 * Math.PI * 40;
    const dashOffset = CIRCUMFERENCE * (1 - score / 100);

    return (
        <div
            className={cn(
                'bg-white rounded-card shadow-card border border-neutral-200/60 p-6',
                'transition-shadow duration-150 hover:shadow-card-hover',
                'h-full min-h-[180px] flex flex-col'
            )}
        >
            <div className="flex items-center gap-3 mb-4">
                <div
                    className={cn(
                        'w-11 h-11 rounded-card flex items-center justify-center flex-shrink-0',
                        style.bg,
                        style.ring
                    )}
                    aria-hidden="true"
                >
                    {level.tier === 'success' ? (
                        <Heart className="w-5 h-5" />
                    ) : level.tier === 'warning' ? (
                        <Activity className="w-5 h-5" />
                    ) : (
                        <AlertTriangle className="w-5 h-5" />
                    )}
                </div>
                <div>
                    <h3 className="text-h3 text-neutral-900">Sức khỏe kho</h3>
                    <p className="text-caption text-neutral-500">
                        Đánh giá tổng hợp các chỉ số tồn kho
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6 flex-1">
                {/* Donut */}
                <div className="relative flex-shrink-0" aria-hidden="true">
                    <svg width="110" height="110" viewBox="0 0 110 110" className="-rotate-90">
                        {/* Vòng nền */}
                        <circle
                            cx="55"
                            cy="55"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="10"
                            fill="none"
                            className="text-neutral-100"
                        />
                        {/* Vòng điểm */}
                        <circle
                            cx="55"
                            cy="55"
                            r="40"
                            stroke={style.stroke}
                            strokeWidth="10"
                            fill="none"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn('text-h1 font-bold leading-none', style.text)}>
                            {score}
                        </span>
                        <span className="text-caption text-neutral-500 mt-1">/ 100</span>
                    </div>
                </div>

                {/* Chi tiết */}
                <div className="flex-1 min-w-0 space-y-2">
                    <div>
                        <span
                            className={cn(
                                'inline-flex items-center px-2.5 py-1 rounded-pill text-body font-semibold',
                                style.bg,
                                style.text
                            )}
                        >
                            {level.label}
                        </span>
                    </div>
                    <p className="text-caption text-neutral-600">{level.desc}</p>
                    <dl className="text-caption space-y-0.5 text-neutral-600">
                        <div className="flex items-center justify-between gap-2">
                            <dt>Tổng tồn:</dt>
                            <dd className="font-mono font-semibold">
                                {tongTon.toLocaleString('vi-VN')}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <dt>Sắp hết hàng:</dt>
                            <dd className="font-mono font-semibold text-warning-700">
                                {sapHetHang.toLocaleString('vi-VN')}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <dt>Sắp hết hạn:</dt>
                            <dd className="font-mono font-semibold text-danger-700">
                                {sapHetHan.toLocaleString('vi-VN')}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}

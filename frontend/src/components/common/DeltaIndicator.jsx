/**
 * DeltaIndicator - Hiển thị chỉ số so sánh với kỳ trước (%)
 *
 * @param {number} pct - phần trăm thay đổi (vd: 12.5 tức +12.5%)
 * @param {string} label - nhãn (vd: "vs kỳ trước")
 * @param {boolean} inverted - nếu true, tăng là xấu (vd: tỷ lệ hủy đơn)
 * @param {'sm'|'md'} size
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function DeltaIndicator({
    pct,
    label = 'vs kỳ trước',
    inverted = false,
    size = 'sm',
    className,
}) {
    if (pct === null || pct === undefined || isNaN(pct)) return null;

    // Quy ước màu:
    // - inverted = false: tăng (xanh) / giảm (đỏ)
    // - inverted = true:  tăng (đỏ) / giảm (xanh)
    const isUp = pct > 0;
    const isDown = pct < 0;
    const good = inverted ? isDown : isUp;

    let colorCls = 'text-neutral-500 bg-neutral-100';
    let Icon = Minus;
    if (isUp) Icon = TrendingUp;
    if (isDown) Icon = TrendingDown;

    if (good) {
        colorCls = inverted
            ? 'text-success-700 bg-success-50'
            : 'text-success-700 bg-success-50';
    } else if (pct !== 0) {
        colorCls = inverted
            ? 'text-danger-700 bg-danger-50'
            : 'text-danger-700 bg-danger-50';
    }

    const display = `${pct > 0 ? '+' : ''}${pct}%`;
    const sizeCls = size === 'sm'
        ? 'px-2 py-0.5 text-caption'
        : 'px-2.5 py-1 text-body';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full font-semibold font-mono',
                colorCls,
                sizeCls,
                className
            )}
            title={label}
        >
            <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
            <span>{display}</span>
            {size === 'md' && (
                <span className="font-sans text-caption opacity-70 ml-0.5">{label}</span>
            )}
        </span>
    );
}

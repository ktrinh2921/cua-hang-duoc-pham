/**
 * DateRangePresets - Bộ lọc khoảng thời gian có presets cho trang Thống kê
 *
 * Các preset:
 *  - Hôm nay
 *  - 7 ngày qua
 *  - 30 ngày qua (mặc định)
 *  - Tháng này
 *  - Quý này
 *  - Năm nay
 *
 * Props:
 *  - fromDate, toDate (YYYY-MM-DD)
 *  - onChange({ fromDate, toDate }) - được gọi khi user chọn preset hoặc đổi ngày custom
 *  - onApply() - bắt buộc click nút "Thống kê" mới fetch (tránh gọi API liên tục khi đổi ngày custom)
 *  - loading
 *  - actions: nhóm hành động phụ (ví dụ xuất Excel/PDF)
 */
import { useId, useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { ArrowRight, Calendar, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';

const PRESETS = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7', label: '7 ngày qua' },
    { key: '30', label: '30 ngày qua' },
    { key: 'month', label: 'Tháng này' },
    { key: 'quarter', label: 'Quý này' },
    { key: 'year', label: 'Năm nay' },
];

function resolvePreset(key) {
    const today = dayjs();
    switch (key) {
        case 'today':
            return { fromDate: today.format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        case '7':
            return { fromDate: today.subtract(6, 'day').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        case '30':
            return { fromDate: today.subtract(29, 'day').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        case 'month':
            return { fromDate: today.startOf('month').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        case 'quarter':
            return { fromDate: today.startOf('quarter').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        case 'year':
            return { fromDate: today.startOf('year').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
        default:
            return null;
    }
}

export default function DateRangePresets({
    fromDate,
    toDate,
    onApply,
    loading = false,
    actions,
    className,
}) {
    const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
    const fieldId = useId();
    const fromId = `${fieldId}-from`;
    const toId = `${fieldId}-to`;
    const errorId = `${fieldId}-error`;

    // State cục bộ cho input (chỉ apply khi bấm nút)
    const [localFrom, setLocalFrom] = useState(fromDate);
    const [localTo, setLocalTo] = useState(toDate);

    // Detect preset đang active dựa trên fromDate/toDate hiện tại
    const activePreset = useMemo(() => {
        for (const p of PRESETS) {
            const r = resolvePreset(p.key);
            if (r && r.fromDate === fromDate && r.toDate === toDate) return p.key;
        }
        return null;
    }, [fromDate, toDate]);

    // Khi prop đổi (parent reset), sync local
    useEffect(() => { setLocalFrom(fromDate); }, [fromDate]);
    useEffect(() => { setLocalTo(toDate); }, [toDate]);

    const handlePresetClick = (key) => {
        const r = resolvePreset(key);
        if (!r) return;
        // Apply ngay khi click preset
        onApply(r.fromDate, r.toDate);
    };

    const handleApplyCustom = (event) => {
        event?.preventDefault();
        // Validate: from <= to
        if (localFrom && localTo && localFrom > localTo) {
            return; // không apply nếu sai thứ tự
        }
        onApply(localFrom || null, localTo || null);
    };

    const hasCustomRange = activePreset === null;
    const canApply = localFrom && localTo && localFrom <= localTo;
    const invalidRange = localFrom && localTo && localFrom > localTo;

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
                    <div className="flex flex-shrink-0 items-center gap-2 text-body font-semibold text-neutral-800">
                        <Calendar className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        <span>Khoảng thời gian</span>
                    </div>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="Chọn nhanh khoảng thời gian"
                    >
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                onClick={() => handlePresetClick(preset.key)}
                                disabled={loading}
                                aria-pressed={activePreset === preset.key}
                                className={cn(
                                    'h-9 rounded-btn border px-3 text-caption font-medium transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                                    'disabled:cursor-not-allowed disabled:opacity-50',
                                    activePreset === preset.key
                                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                                        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                        {hasCustomRange && (
                            <span className="inline-flex h-9 items-center rounded-btn border border-info-200 bg-info-50 px-3 text-caption font-medium text-info-700">
                                Tùy chỉnh
                            </span>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex-shrink-0 border-t border-neutral-100 pt-3 lg:border-0 lg:pt-0">
                        {actions}
                    </div>
                )}
            </div>

            <form
                className="border-t border-neutral-200 pt-4"
                onSubmit={handleApplyCustom}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="flex w-full flex-col sm:w-[180px]">
                        <label htmlFor={fromId} className="mb-1.5 text-caption font-semibold text-neutral-700">
                            Từ ngày
                        </label>
                        <input
                            id={fromId}
                            type="date"
                            value={localFrom || ''}
                            max={localTo || todayStr}
                            aria-invalid={invalidRange || undefined}
                            aria-describedby={invalidRange ? errorId : undefined}
                            onChange={(event) => setLocalFrom(event.target.value)}
                            className="h-10 w-full rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    <div className="hidden h-10 items-center text-neutral-400 sm:flex" aria-hidden="true">
                        <ArrowRight className="h-4 w-4" />
                    </div>

                    <div className="flex w-full flex-col sm:w-[180px]">
                        <label htmlFor={toId} className="mb-1.5 text-caption font-semibold text-neutral-700">
                            Đến ngày
                        </label>
                        <input
                            id={toId}
                            type="date"
                            value={localTo || ''}
                            min={localFrom || undefined}
                            max={todayStr}
                            aria-invalid={invalidRange || undefined}
                            aria-describedby={invalidRange ? errorId : undefined}
                            onChange={(event) => setLocalTo(event.target.value)}
                            className="h-10 w-full rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        icon={<Search className="h-4 w-4" />}
                        disabled={!canApply}
                        loading={loading}
                        className="w-full sm:w-auto"
                    >
                        Thống kê
                    </Button>

                    {hasCustomRange && (localFrom || localTo) && (
                        <button
                            type="button"
                            onClick={() => {
                                const range = resolvePreset('30');
                                onApply(range.fromDate, range.toDate);
                            }}
                            disabled={loading}
                            className="h-10 self-start px-1 text-caption font-medium text-neutral-500 underline-offset-4 hover:text-primary-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                        >
                            Về 30 ngày qua
                        </button>
                    )}
                </div>
                {invalidRange && (
                    <p id={errorId} role="alert" className="mt-2 text-caption text-danger-600">
                        Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
                    </p>
                )}
            </form>
        </div>
    );
}

DateRangePresets.resolvePreset = resolvePreset;

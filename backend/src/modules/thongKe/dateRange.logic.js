const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
        throw new Error('Ngày phải có định dạng YYYY-MM-DD');
    }
    const [year, month, day] = value.split('-').map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        throw new Error('Ngày không hợp lệ');
    }
    return timestamp;
}

function formatDateOnly(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

function validateDateRange(fromDate, toDate, maxDays = 366) {
    if (!fromDate && !toDate) return null;
    if (!fromDate || !toDate) {
        throw new Error('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
    }
    const from = parseDateOnly(fromDate);
    const to = parseDateOnly(toDate);
    if (from > to) throw new Error('Ngày bắt đầu không được sau ngày kết thúc');
    const days = Math.floor((to - from) / DAY_MS) + 1;
    if (days > maxDays) throw new Error(`Khoảng báo cáo tối đa ${maxDays} ngày`);
    return { from, to, days };
}

function buildDateRange(fromDate, toDate) {
    const range = validateDateRange(fromDate, toDate);
    return Array.from(
        { length: range.days },
        (_, index) => formatDateOnly(range.from + index * DAY_MS)
    );
}

function previousDateRange(fromDate, toDate) {
    const range = validateDateRange(fromDate, toDate);
    const previousTo = range.from - DAY_MS;
    const previousFrom = previousTo - (range.days - 1) * DAY_MS;
    return {
        fromDate: formatDateOnly(previousFrom),
        toDate: formatDateOnly(previousTo),
    };
}

module.exports = { buildDateRange, previousDateRange, validateDateRange };


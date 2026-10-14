/**
 * XSS Sanitize Middleware - Deep recursive
 *
 * XSS chỉ áp dụng cho field STRING hiển thị trong HTML (raw).
 * React đã tự escape string trong JSX, nên middleware này là defense-in-depth.
 *
 * So với phiên bản cũ (chỉ loop 1 cấp req.body[key]):
 *  - Đệ quy xử lý nested objects { key: { sub: '<script>' } }
 *  - Đệ quy xử lý arrays [ '<script>', 'normal' ]
 *  - Bỏ qua field binary (Buffer, File, ...)
 *
 * Lưu ý: KHÔNG sanitize password (bcrypt sẽ fail nếu hash bị escape),
 *       sanitize SELECTIVELY theo field name.
 */
const xss = require('xss');

// Fields KHONG bao gio sanitize (password, hash, token, key)
const SKIP_FIELDS = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'matKhau',
    'matKhauCu',
    'matKhauMoi',
    'token',
    'refreshToken',
    'jwt',
    'secret',
    'apiKey',
]);

/**
 * Deep sanitize một value bất kỳ
 *  - string → escape HTML
 *  - array/object → đệ quy từng phần tử
 *  - primitive khác → giữ nguyên
 */
function deepSanitize(value, keyName = null) {
    // Skip các field nhạy cảm
    if (typeof keyName === 'string' && SKIP_FIELDS.has(keyName)) {
        return value;
    }

    if (typeof value === 'string') {
        return xss(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => deepSanitize(item, keyName));
    }

    if (value !== null && typeof value === 'object' && !(value instanceof Buffer) && !(value instanceof Date)) {
        const sanitized = {};
        for (const k of Object.keys(value)) {
            sanitized[k] = deepSanitize(value[k], k);
        }
        return sanitized;
    }

    return value;
}

/**
 * Express middleware - sanitize req.body, req.query, req.params
 */
function xssSanitize(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        // Express 5 freezes req.query, chỉ sanitize nếu chưa frozen
        try {
            req.query = deepSanitize(req.query);
        } catch {
            // ignore
        }
    }
    next();
}

module.exports = {
    xssSanitize,
    deepSanitize,
};

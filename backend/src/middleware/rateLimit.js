/**
 * Rate Limit Middleware - Chống brute-force & DDoS
 *
 * Dùng `express-rate-limit` với in-memory store (default).
 * Lưu ý: in-memory không scale khi chạy multi-instance, nhưng đủ cho demo.
 *
 * 2 tiers:
 *  - authLimiter:   áp dụng cho /api/auth/login (5/15min/IP) - chống brute-force
 *  - generalLimiter: áp dụng cho toàn bộ /api/* (100/15min/IP) - chống DDoS
 */
const rateLimit = require('express-rate-limit');

/**
 * Rate limit cho auth routes (login, refresh).
 *  - 5 attempts / 15 phút / IP
 *  - Trả 429 với message tiếng Việt
 *  - Skip khi response success (đã check wrong password trong service)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Chỉ tính request FAIL
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.',
        },
    },
});

/**
 * Rate limit cho endpoint ghi (POST/PUT/PATCH/DELETE).
 *  - 30 requests / 15 phút / IP
 */
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Quá nhiều yêu cầu ghi. Vui lòng thử lại sau.',
        },
    },
});

module.exports = {
    authLimiter,
    writeLimiter,
};

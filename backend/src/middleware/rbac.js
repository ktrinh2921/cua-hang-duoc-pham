/**
 * RBAC Middleware - Role-Based Access Control
 *
 * Lưu ý về role alias:
 *   DB có thể chứa role dạng tiếng Việt có dấu (do seed cũ hoặc tool import)
 *   → map về role chuẩn để middleware so sánh đúng.
 *   - 'Admin'        ↔ 'Quản lý' / 'Quan ly' / 'QL' / 'admin'
 *   - 'NV_BanHang'   ↔ 'Nhân viên bán hàng' / 'NV BanHang' / 'BanHang' / 'nv_banhang'
 *   - 'NV_Kho'       ↔ 'Thủ kho' / 'Thu kho' / 'NV Kho' / 'nv_kho'
 *
 * Chuẩn hoá về key rồi so sánh → không phân biệt hoa/thường, có/không dấu.
 */
const { forbidden } = require('../utils/response');

// Chuẩn hoá: lowerCase + bỏ dấu tiếng Việt, gộp space
function normalizeRole(role) {
    if (!role || typeof role !== 'string') return '';
    const map = { à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a', â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a', è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e', ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e', ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i', ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o', ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o', ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u', ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y', đ: 'd' };
    return role
        .toLowerCase()
        .split('')
        .map(ch => map[ch] || ch)
        .join('')
        .replace(/\s+/g, '')
        .replace(/_/g, '');
}

// Map role bất kỳ (tiếng Việt có dấu / viết tắt) → role chuẩn trong DB
function canonicalRole(role) {
    const r = normalizeRole(role);
    if (['admin', 'quanly', 'ql', 'manager'].includes(r)) return 'Admin';
    if (['nvbanhang', 'nv_banhang', 'banhang', 'seller'].includes(r)) return 'NV_BanHang';
    if (['nvkho', 'nv_kho', 'kho', 'thukho', 'warehouse'].includes(r)) return 'NV_Kho';
    return role; // giữ nguyên nếu không nhận diện được
}

/**
 * Check if user has required role(s)
 * @param  {...string} allowedRoles - Allowed roles (chuẩn hoặc alias)
 * @returns {Function} Middleware function
 */
function requireRole(...allowedRoles) {
    const canonicalAllowed = allowedRoles.map(canonicalRole);
    return (req, res, next) => {
        if (!req.user) {
            return forbidden(res, 'Vui lòng đăng nhập');
        }

        const userRole = canonicalRole(req.user.role);
        if (!canonicalAllowed.includes(userRole)) {
            return forbidden(res, 'Bạn không có quyền thực hiện chức năng này');
        }

        next();
    };
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
    return requireRole('Admin')(req, res, next);
}

/**
 * Check if user is NV_BanHang or Admin
 */
function requireSeller(req, res, next) {
    return requireRole('Admin', 'NV_BanHang')(req, res, next);
}

/**
 * Check if user is the owner of the resource or admin
 * @param {Function} getOwnerId - Function to get owner ID from request
 */
function requireOwnerOrAdmin(getOwnerId) {
    return (req, res, next) => {
        if (!req.user) {
            return forbidden(res, 'Vui lòng đăng nhập');
        }

        // Admin (kể cả alias 'Quản lý') can access everything
        if (canonicalRole(req.user.role) === 'Admin') {
            return next();
        }

        const ownerId = getOwnerId(req);
        if (ownerId === req.user.maNV) {
            return next();
        }

        return forbidden(res, 'Bạn không có quyền thực hiện thao tác này');
    };
}

module.exports = {
    requireRole,
    requireAdmin,
    requireSeller,
    requireOwnerOrAdmin,
    // Export cho test / dùng ngoài
    canonicalRole,
    normalizeRole,
};

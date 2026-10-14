/**
 * Auth Controller
 */
const authService = require('./auth.service');
const { success, unauthorized, error } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/errorHandler');
const { logAudit } = require('../../middleware/audit');

/**
 * POST /api/auth/login
 * Login with username and password
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return error(res, 'Vui lòng nhập tên đăng nhập và mật khẩu', 400);
    }
    
    const result = await authService.login(username, password);
    
    if (!result.success) {
        return error(res, result.message, 401);
    }
    
    // Log successful login
    await logAudit(req, 'LOGIN');
    
    return success(res, result.data, 'Đăng nhập thành công');
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
const logout = asyncHandler(async (req, res) => {
    await authService.revokeRefreshTokens(req.user.username);
    // Log logout
    await logAudit(req, 'LOGOUT');
    
    return success(res, null, 'Đăng xuất thành công');
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return error(res, 'Refresh token is required', 400);
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    if (!result.success) {
        return error(res, result.message, 401);
    }
    
    return success(res, result.data, 'Token refreshed');
});

/**
 * GET /api/auth/me
 * Get current user info
 */
const getMe = asyncHandler(async (req, res) => {
    const userInfo = await authService.getUserInfo(req.user.maNV);
    
    if (!userInfo) {
        return error(res, 'Không tìm thấy thông tin người dùng', 404);
    }
    
    return success(res, userInfo, 'Thành công');
});

/**
 * POST /api/auth/change-password
 * Change password for current user
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const username = req.user.username;
    
    if (!currentPassword || !newPassword) {
        return error(res, 'Vui lòng nhập đầy đủ thông tin', 400);
    }
    
    if (newPassword !== confirmPassword) {
        return error(res, 'Mật khẩu mới không khớp', 400);
    }
    
    if (newPassword.length < 6) {
        return error(res, 'Mật khẩu mới phải có ít nhất 6 ký tự', 400);
    }
    
    const result = await authService.changePassword(username, currentPassword, newPassword);
    
    if (!result.success) {
        return error(res, result.message, 400);
    }
    
    await logAudit(req, 'CHANGE_PASSWORD');
    
    return success(res, null, 'Đổi mật khẩu thành công');
});

module.exports = {
    login,
    logout,
    refresh,
    getMe,
    changePassword
};

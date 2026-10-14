/**
 * Auth Middleware - JWT Authentication
 */
const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response');

/**
 * Verify JWT token
 */
function authenticate(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorized(res, 'Vui lòng đăng nhập');
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return unauthorized(res, 'Vui lòng đăng nhập');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request
        req.user = {
            username: decoded.sub,
            role: decoded.role,
            maNV: decoded.maNV
        };
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return unauthorized(res, 'Phiên đăng nhập đã hết hạn');
        }
        return unauthorized(res, 'Token không hợp lệ');
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = {
                    username: decoded.sub,
                    role: decoded.role,
                    maNV: decoded.maNV
                };
            }
        }
    } catch (err) {
        // Ignore errors for optional auth
    }
    next();
}

module.exports = {
    authenticate,
    optionalAuth
};

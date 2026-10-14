/**
 * Response Utilities - Format response统一
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function success(res, data = null, message = 'Thành công', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
}

/**
 * Send success response with pagination
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {Object} extra - Extra fields to include in data (e.g. counts for filter chips)
 */
function successPaginated(res, items, total, page = 1, limit = 10, extra = {}) {
    return res.status(200).json({
        success: true,
        message: 'Thành công',
        data: {
            items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / parseInt(limit))
            },
            ...extra
        }
    });
}

/**
 * Send created response
 * @param {Object} res - Express response object
 * @param {Object} data - Created data
 * @param {string} message - Success message
 */
function created(res, data, message = 'Tạo mới thành công') {
    return success(res, data, message, 201);
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} code - Error code for frontend handling
 */
function error(res, message = 'Đã xảy ra lỗi', statusCode = 400, code = 'ERROR') {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message
        }
    });
}

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
function validationError(res, errors) {
    return res.status(400).json({
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu không hợp lệ',
            details: errors
        }
    });
}

/**
 * Send unauthorized error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function unauthorized(res, message = 'Chưa xác thực') {
    return error(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Send forbidden error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function forbidden(res, message = 'Không có quyền truy cập') {
    return error(res, message, 403, 'FORBIDDEN');
}

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function notFound(res, message = 'Không tìm thấy') {
    return error(res, message, 404, 'NOT_FOUND');
}

/**
 * Send conflict error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function conflict(res, message = 'Xung đột dữ liệu') {
    return error(res, message, 409, 'CONFLICT');
}

module.exports = {
    success,
    successPaginated,
    created,
    error,
    validationError,
    unauthorized,
    forbidden,
    notFound,
    conflict
};

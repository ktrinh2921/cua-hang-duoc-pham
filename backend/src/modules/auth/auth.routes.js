/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { authLimiter, writeLimiter } = require('../../middleware/rateLimit');

// Public routes

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     description: |
 *       Xác thực username + password, trả về JWT access token (8h) + refresh token.
 *       Rate-limit: 5 lần / phút / IP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Sai tài khoản / mật khẩu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Quá nhiều request (rate-limit)
 */
router.post('/login', authLimiter, authController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Cấp lại access token từ refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Cấp token mới thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Refresh token không hợp lệ / hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authLimiter, authController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất (vô hiệu hóa refresh token hiện tại)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Chưa đăng nhập / token hết hạn
 */
router.post('/logout', authenticate, authController.logout);

// Protected routes

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Thông tin nhân viên đang đăng nhập
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/NhanVien'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Đổi mật khẩu (yêu cầu mật khẩu cũ)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matKhauCu, matKhauMoi]
 *             properties:
 *               matKhauCu: { type: string, format: password }
 *               matKhauMoi:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: |
 *                   Tối thiểu 8 ký tự, có chữ hoa + thường + số + ký tự đặc biệt.
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu mới không đủ mạnh / sai mật khẩu cũ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/change-password', writeLimiter, authenticate, authController.changePassword);

module.exports = router;

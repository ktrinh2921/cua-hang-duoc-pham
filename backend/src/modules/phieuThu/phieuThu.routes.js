const express = require('express');
const router = express.Router();
const controller = require('./phieuThu.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);
router.use(requireRole('Admin', 'NV_BanHang'));

/**
 * @openapi
 * /api/phieu-thu:
 *   get:
 *     tags: [Phiếu thu]
 *     summary: Danh sách phiếu thu (Admin + NV_BanHang)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: maKH
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', controller.getAll);

/**
 * @openapi
 * /api/phieu-thu/{id}:
 *   get:
 *     tags: [Phiếu thu]
 *     summary: Chi tiết phiếu thu
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 */
router.get('/:id', controller.getById);

/**
 * @openapi
 * /api/phieu-thu:
 *   post:
 *     tags: [Phiếu thu]
 *     summary: Tạo phiếu thu — ghi nhận khách trả nợ hoặc thu khác
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soTien, maKH, ngayThu]
 *             properties:
 *               soTien: { type: number, example: 200000 }
 *               maKH: { type: integer, example: 12 }
 *               ngayThu: { type: string, format: date }
 *               maHD: { type: integer, nullable: true, description: 'Liên kết hóa đơn nếu thu theo HĐ' }
 *               moTa: { type: string, nullable: true }
 *               phuongThucThanhToan:
 *                 type: string
 *                 enum: [TienMat, ChuyenKhoan, The]
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 */
router.post('/', writeLimiter, controller.create);

module.exports = router;

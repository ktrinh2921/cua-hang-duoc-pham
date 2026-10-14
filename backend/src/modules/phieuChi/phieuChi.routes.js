/**
 * PhieuChi Routes - Admin only
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./phieuChi.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { writeLimiter } = require('../../middleware/rateLimit');

// Tất cả route cần đăng nhập + Admin
router.use(authenticate);
router.use(requireRole('Admin'));

/**
 * @openapi
 * /api/phieu-chi:
 *   get:
 *     tags: [Phiếu chi]
 *     summary: Danh sách phiếu chi (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: loaiChi
 *         schema: { type: string, enum: [NhapHang, LuongNV, ChiPhiKhac] }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/phieu-chi/stats:
 *   get:
 *     tags: [Phiếu chi]
 *     summary: Thống kê phiếu chi cho dashboard tài chính
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tổng chi theo kỳ, theo loại... }
 */
router.get('/stats', ctrl.getStats);

/**
 * @openapi
 * /api/phieu-chi/so-du:
 *   get:
 *     tags: [Phiếu chi]
 *     summary: Số dư quỹ tiền mặt hiện tại (Thu - Chi)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Số dư }
 */
router.get('/so-du', ctrl.getSoDu);

/**
 * @openapi
 * /api/phieu-chi/{id}:
 *   get:
 *     tags: [Phiếu chi]
 *     summary: Chi tiết phiếu chi
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
router.get('/:id', ctrl.getById);

/**
 * @openapi
 * /api/phieu-chi:
 *   post:
 *     tags: [Phiếu chi]
 *     summary: Tạo phiếu chi (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soTien, loaiChi, ngayChi]
 *             properties:
 *               soTien: { type: number, example: 5000000 }
 *               loaiChi:
 *                 type: string
 *                 enum: [NhapHang, LuongNV, ChiPhiKhac]
 *                 example: LuongNV
 *               ngayChi: { type: string, format: date }
 *               moTa: { type: string, nullable: true }
 *               maPN: { type: integer, nullable: true, description: 'Liên kết phiếu nhập nếu loaiChi=NhapHang' }
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.post('/', writeLimiter, ctrl.create);

module.exports = router;

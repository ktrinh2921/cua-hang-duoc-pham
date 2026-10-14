/**
 * NhaCungCap Routes
 * Write: Admin only
 *
 * Endpoints:
 *  GET    /api/nha-cung-cap              - Danh sách + filter
 *  GET    /api/nha-cung-cap/stats       - Thống kê tổng quan
 *  GET    /api/nha-cung-cap/:id         - Chi tiết NCC
 *  GET    /api/nha-cung-cap/:id/phieu-nhap - Lịch sử phiếu nhập
 *  POST   /api/nha-cung-cap             - Tạo mới
 *  PUT    /api/nha-cung-cap/:id         - Cập nhật
 *  DELETE /api/nha-cung-cap/:id         - Xóa
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./nhaCungCap.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { audit } = require('../../middleware/audit');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);

/**
 * @openapi
 * /api/nha-cung-cap/stats:
 *   get:
 *     tags: [Nhà cung cấp]
 *     summary: Thống kê tổng quan nhà cung cấp
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tổng NCC, NCC đang giao dịch, tổng tiền đã nhập... }
 */
router.get('/stats', ctrl.getStats);

/**
 * @openapi
 * /api/nha-cung-cap:
 *   get:
 *     tags: [Nhà cung cấp]
 *     summary: Danh sách nhà cung cấp (filter + phân trang)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/nha-cung-cap/{id}:
 *   get:
 *     tags: [Nhà cung cấp]
 *     summary: Chi tiết nhà cung cấp
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
 * /api/nha-cung-cap/{id}/phieu-nhap:
 *   get:
 *     tags: [Nhà cung cấp]
 *     summary: Lịch sử phiếu nhập của 1 NCC
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng phiếu nhập }
 */
router.get('/:id/phieu-nhap', ctrl.getPhieuNhapByNCC);

// Write operations — chỉ Admin
/**
 * @openapi
 * /api/nha-cung-cap:
 *   post:
 *     tags: [Nhà cung cấp]
 *     summary: Tạo nhà cung cấp (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenNCC]
 *             properties:
 *               tenNCC:
 *                 type: string
 *                 example: 'Công ty Dược Hậu Giang'
 *               sdt:
 *                 type: string
 *                 example: '02923891234'
 *               email:
 *                 type: string
 *                 nullable: true
 *               diaChi:
 *                 type: string
 *                 nullable: true
 *               maSoThue:
 *                 type: string
 *                 nullable: true
 *               nguoiDaiDien:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không đủ quyền (cần Admin)
 */
router.post('/', writeLimiter, requireRole('Admin'), audit('CREATE_NCC'), ctrl.create);

/**
 * @openapi
 * /api/nha-cung-cap/{id}:
 *   put:
 *     tags: [Nhà cung cấp]
 *     summary: Cập nhật nhà cung cấp (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenNCC: { type: string }
 *               sdt: { type: string }
 *               email: { type: string }
 *               diaChi: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.put('/:id', writeLimiter, requireRole('Admin'), audit('UPDATE_NCC'), ctrl.update);

/**
 * @openapi
 * /api/nha-cung-cap/{id}:
 *   delete:
 *     tags: [Nhà cung cấp]
 *     summary: Xóa nhà cung cấp (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Xóa thành công }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.delete('/:id', writeLimiter, requireRole('Admin'), audit('DELETE_NCC'), ctrl.remove);

module.exports = router;

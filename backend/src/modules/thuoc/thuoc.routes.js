/**
 * Thuoc Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./thuoc.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { audit } = require('../../middleware/audit');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);

/**
 * @openapi
 * /api/thuoc:
 *   get:
 *     tags: [Thuốc]
 *     summary: Danh sách thuốc (filter + phân trang)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo tên / mã thuốc
 *       - in: query
 *         name: maDM
 *         schema: { type: string }
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Trả về danh sách thuốc
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/thuoc/{id}/similar:
 *   get:
 *     tags: [Thuốc]
 *     summary: Gợi ý thuốc tương tự (cùng danh mục)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng thuốc gợi ý }
 */
router.get('/:id/similar', ctrl.getSimilar);

/**
 * @openapi
 * /api/thuoc/{id}:
 *   get:
 *     tags: [Thuốc]
 *     summary: Chi tiết 1 thuốc
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

// Write - Admin only
/**
 * @openapi
 * /api/thuoc:
 *   post:
 *     tags: [Thuốc]
 *     summary: Tạo thuốc mới (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenThuoc, maDM, donViTinh]
 *             properties:
 *               tenThuoc: { type: string, example: 'Paracetamol 500mg' }
 *               maDM: { type: string, example: 'DM001' }
 *               donViTinh: { type: string, example: 'Viên' }
 *               hamLuong: { type: string, nullable: true, example: '500mg' }
 *               giaBanThamKhao: { type: number, example: 25000 }
 *               giaNhapThamKhao: { type: number, example: 18000 }
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.post('/', writeLimiter, requireRole('Admin'), audit('CREATE_THUOC'), ctrl.create);

/**
 * @openapi
 * /api/thuoc/{id}:
 *   put:
 *     tags: [Thuốc]
 *     summary: Cập nhật thuốc (Admin)
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
 *               tenThuoc: { type: string }
 *               maDM: { type: string }
 *               donViTinh: { type: string }
 *               giaBanThamKhao: { type: number }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.put('/:id', writeLimiter, requireRole('Admin'), audit('UPDATE_THUOC'), ctrl.update);

/**
 * @openapi
 * /api/thuoc/{id}:
 *   delete:
 *     tags: [Thuốc]
 *     summary: Xóa thuốc (Admin — soft delete nếu còn lô)
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
 *       409: { description: Thuốc còn lô tồn kho }
 */
router.delete('/:id', writeLimiter, requireRole('Admin'), audit('DELETE_THUOC'), ctrl.remove);

module.exports = router;

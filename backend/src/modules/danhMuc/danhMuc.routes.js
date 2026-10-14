/**
 * DanhMuc Routes
 *  - Public (authenticated): GET
 *  - Admin only: POST, PUT, DELETE
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./danhMuc.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { audit } = require('../../middleware/audit');
const { writeLimiter } = require('../../middleware/rateLimit');

// Tất cả route đều cần đăng nhập
router.use(authenticate);

/**
 * @openapi
 * /api/danh-muc:
 *   get:
 *     tags: [Danh mục]
 *     summary: Danh sách danh mục thuốc
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Trả về mảng danh mục
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       maDM: { type: string, example: 'DM001' }
 *                       tenDM: { type: string, example: 'Kháng sinh' }
 *                       moTa: { type: string, nullable: true }
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/danh-muc/{maDM}:
 *   get:
 *     tags: [Danh mục]
 *     summary: Chi tiết 1 danh mục
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: maDM
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 */
router.get('/:maDM', ctrl.getById);

// Write - chỉ Admin
/**
 * @openapi
 * /api/danh-muc:
 *   post:
 *     tags: [Danh mục]
 *     summary: Tạo danh mục mới (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenDM]
 *             properties:
 *               maDM: { type: string, description: 'Tự sinh nếu bỏ trống' }
 *               tenDM: { type: string, example: 'Kháng sinh' }
 *               moTa: { type: string, nullable: true }
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.post('/', writeLimiter, requireRole('Admin'), audit('CREATE_DANHMUC'), ctrl.create);

/**
 * @openapi
 * /api/danh-muc/{maDM}:
 *   put:
 *     tags: [Danh mục]
 *     summary: Cập nhật danh mục (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: maDM
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenDM: { type: string }
 *               moTa: { type: string, nullable: true }
 *     responses:
 *       200: { description: Cập nhật thành công }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.put('/:maDM', writeLimiter, requireRole('Admin'), audit('UPDATE_DANHMUC'), ctrl.update);

/**
 * @openapi
 * /api/danh-muc/{maDM}:
 *   delete:
 *     tags: [Danh mục]
 *     summary: Xóa danh mục (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: maDM
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Xóa thành công }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 *       409: { description: Danh mục còn thuốc, không thể xóa }
 */
router.delete('/:maDM', writeLimiter, requireRole('Admin'), audit('DELETE_DANHMUC'), ctrl.remove);

module.exports = router;

/**
 * KhachHang Routes
 *
 * Read: Admin + NV_BanHang (NV_Kho không được phép xem thông tin khách hàng theo RBAC matrix)
 * Write: Admin + NV_BanHang
 *
 * Endpoints:
 *  GET    /api/khach-hang              - Danh sách + filter
 *  GET    /api/khach-hang/stats       - Thống kê tổng quan
 *  GET    /api/khach-hang/:id         - Chi tiết KH
 *  GET    /api/khach-hang/:id/hoa-don - Lịch sử hóa đơn
 *  POST   /api/khach-hang             - Tạo mới
 *  PUT    /api/khach-hang/:id         - Cập nhật
 *  DELETE /api/khach-hang/:id         - Xóa
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./khachHang.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { audit } = require('../../middleware/audit');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);

/**
 * @openapi
 * /api/khach-hang:
 *   get:
 *     tags: [Khách hàng]
 *     summary: Danh sách khách hàng (filter + phân trang)
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
 *       403: { description: Không đủ quyền (NV_Kho không được xem) }
 */
router.get('/', requireRole('Admin', 'NV_BanHang'), ctrl.getAll);

/**
 * @openapi
 * /api/khach-hang/stats:
 *   get:
 *     tags: [Khách hàng]
 *     summary: Thống kê tổng quan khách hàng
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tổng KH, KH mới trong kỳ... }
 */
router.get('/stats', requireRole('Admin', 'NV_BanHang'), ctrl.getStats);

/**
 * @openapi
 * /api/khach-hang/{id}:
 *   get:
 *     tags: [Khách hàng]
 *     summary: Chi tiết khách hàng
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
router.get('/:id', requireRole('Admin', 'NV_BanHang'), ctrl.getById);

/**
 * @openapi
 * /api/khach-hang/{id}/hoa-don:
 *   get:
 *     tags: [Khách hàng]
 *     summary: Lịch sử hóa đơn của 1 khách hàng
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng hóa đơn }
 */
router.get('/:id/hoa-don', requireRole('Admin', 'NV_BanHang'), ctrl.getHoaDonByKhachHang);

// Write operations — giới hạn theo role
/**
 * @openapi
 * /api/khach-hang:
 *   post:
 *     tags: [Khách hàng]
 *     summary: Tạo khách hàng mới (Admin + NV_BanHang)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenKH, sdt]
 *             properties:
 *               tenKH: { type: string, example: 'Nguyễn Văn A' }
 *               sdt: { type: string, example: '0901234567' }
 *               email: { type: string, nullable: true }
 *               diaChi: { type: string, nullable: true }
 *               ngaySinh: { type: string, format: date, nullable: true }
 *               gioiTinh: { type: string, enum: [Nam, Nu, Khac], nullable: true }
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ / SĐT trùng }
 */
router.post('/', writeLimiter, requireRole('Admin', 'NV_BanHang'), audit('CREATE_KH'), ctrl.create);

/**
 * @openapi
 * /api/khach-hang/{id}:
 *   put:
 *     tags: [Khách hàng]
 *     summary: Cập nhật khách hàng (Admin + NV_BanHang)
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
 *               tenKH: { type: string }
 *               sdt: { type: string }
 *               email: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 */
router.put('/:id', writeLimiter, requireRole('Admin', 'NV_BanHang'), audit('UPDATE_KH'), ctrl.update);

/**
 * @openapi
 * /api/khach-hang/{id}:
 *   delete:
 *     tags: [Khách hàng]
 *     summary: Xóa khách hàng (Admin only)
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
router.delete('/:id', writeLimiter, requireRole('Admin'), audit('DELETE_KH'), ctrl.remove);

module.exports = router;

/**
 * HoaDon Routes - Resource chính cho hóa đơn
 *
 *  GET  /             — Danh sách (Admin, NV_BanHang)
 *  GET  /:id          — Chi tiết (Admin, NV_BanHang)
 *  PUT  /:id/huy      — Hủy hóa đơn (Admin only)
 *
 * POST /api/ban-hang (action) vẫn ở banHang.routes.js vì là action riêng
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./banHang.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);

/**
 * @openapi
 * /api/hoa-don:
 *   get:
 *     tags: [Hóa đơn]
 *     summary: Danh sách hóa đơn (Admin + NV_BanHang)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: maKH
 *         schema: { type: integer }
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: trangThai
 *         schema: { type: string, enum: [DaThanhToan, DaHuy] }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 *       403: { description: Không đủ quyền }
 */
router.get('/', requireRole('Admin', 'NV_BanHang'), ctrl.getAll);

/**
 * @openapi
 * /api/hoa-don/{id}:
 *   get:
 *     tags: [Hóa đơn]
 *     summary: Chi tiết hóa đơn
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
 * /api/hoa-don/{id}/huy:
 *   put:
 *     tags: [Hóa đơn]
 *     summary: Hủy hóa đơn (Admin only) — hoàn lại tồn kho các lô
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lyDo: { type: string }
 *     responses:
 *       200: { description: Hủy thành công }
 *       403: { description: Không đủ quyền (cần Admin) }
 *       404: { description: Không tìm thấy }
 *       409: { description: Hóa đơn đã hủy trước đó }
 */
router.put('/:id/huy', writeLimiter, requireRole('Admin'), ctrl.cancel);

module.exports = router;

/**
 * PhieuNhap Routes - Phiếu nhập thuốc
 * Write (POST, PUT /:id/huy): Admin + NV_Kho
 * Read (GET): Admin + NV_Kho
 *
 * Audit log: Controller goi logAudit() truc tiep de co du MaPN, ChiTiet
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./phieuNhap.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { writeLimiter } = require('../../middleware/rateLimit');

// Tất cả route cần đăng nhập + là Admin hoặc NV_Kho
router.use(authenticate);
router.use(requireRole('Admin', 'NV_Kho'));

/**
 * @openapi
 * /api/phieu-nhap:
 *   get:
 *     tags: [Phiếu nhập]
 *     summary: Danh sách phiếu nhập (Admin + NV_Kho)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: maNCC
 *         schema: { type: integer }
 *       - in: query
 *         name: trangThai
 *         schema: { type: string, enum: [ChoDuyet, DaNhap, DaHuy] }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedResponse' }
 *       403: { description: Không đủ quyền }
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/phieu-nhap/{id}:
 *   get:
 *     tags: [Phiếu nhập]
 *     summary: Chi tiết phiếu nhập (kèm chi tiết lô thuốc)
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
 * /api/phieu-nhap:
 *   post:
 *     tags: [Phiếu nhập]
 *     summary: Tạo phiếu nhập (Admin + NV_Kho) — atomic tạo phiếu + sinh lô thuốc
 *     description: |
 *       Tạo phiếu nhập và tự động sinh `LoThuoc` cho từng dòng chi tiết.
 *       Tồn kho được cộng ngay khi phiếu ở trạng thái `DaNhap`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [maNCC, chiTiet]
 *             properties:
 *               maNCC: { type: integer, example: 1 }
 *               ngayNhap: { type: string, format: date }
 *               ghiChu: { type: string, nullable: true }
 *               chiTiet:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [maThuoc, soLuong, giaNhap]
 *                   properties:
 *                     maThuoc: { type: integer }
 *                     soLuong: { type: integer, minimum: 1 }
 *                     giaNhap: { type: number }
 *                     hanSuDung: { type: string, format: date }
 *                     soLoNSX: { type: string, nullable: true }
 *     responses:
 *       201: { description: Tạo phiếu + lô thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       403: { description: Không đủ quyền }
 */
router.post('/', writeLimiter, ctrl.create);

/**
 * @openapi
 * /api/phieu-nhap/{id}/huy:
 *   put:
 *     tags: [Phiếu nhập]
 *     summary: Hủy phiếu nhập (Admin + NV_Kho) — hoàn lại tồn kho các lô liên quan
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
 *               lyDo: { type: string, example: 'Nhập sai NCC' }
 *     responses:
 *       200: { description: Hủy thành công }
 *       404: { description: Không tìm thấy }
 *       409: { description: Phiếu đã hủy / không thể hủy }
 */
router.put('/:id/huy', writeLimiter, ctrl.cancel);

module.exports = router;

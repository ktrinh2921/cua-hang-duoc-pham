/**
 * Kho Routes - Tồn kho + cảnh báo
 * Read: All roles
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./kho.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);

/**
 * @openapi
 * /api/kho/thong-ke-tong:
 *   get:
 *     tags: [Kho]
 *     summary: Thống kê tổng quan kho (Admin + NV_Kho)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tổng giá trị tồn, số lô, cảnh báo... }
 */
router.get('/thong-ke-tong', requireRole('Admin', 'NV_Kho'), ctrl.getThongKeTong);

/**
 * @openapi
 * /api/kho/ton-kho:
 *   get:
 *     tags: [Kho]
 *     summary: Danh sách tồn kho hiện tại
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: maThuoc
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Mảng tồn kho }
 */
router.get('/ton-kho', ctrl.getTonKho);

/**
 * @openapi
 * /api/kho/sap-het-hang:
 *   get:
 *     tags: [Kho]
 *     summary: Cảnh báo thuốc sắp hết hàng
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Mảng thuốc dưới ngưỡng tồn kho }
 */
router.get('/sap-het-hang', ctrl.getSapHetHang);

/**
 * @openapi
 * /api/kho/sap-het-han:
 *   get:
 *     tags: [Kho]
 *     summary: Cảnh báo lô thuốc sắp hết hạn
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Mảng lô thuốc sắp hết hạn }
 */
router.get('/sap-het-han', ctrl.getSapHetHan);

/**
 * @openapi
 * /api/kho/dieu-chinh:
 *   get:
 *     tags: [Kho]
 *     summary: Lịch sử điều chỉnh tồn kho (Admin + NV_Kho)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Mảng lịch sử điều chỉnh }
 */
router.get('/dieu-chinh', requireRole('Admin', 'NV_Kho'), ctrl.getDieuChinhList);

/**
 * @openapi
 * /api/kho/lo/{maThuoc}:
 *   get:
 *     tags: [Kho]
 *     summary: Danh sách lô thuốc của 1 mã thuốc
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: maThuoc
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng các lô (còn hạn / đã hết) }
 */
router.get('/lo/:maThuoc', ctrl.getLoByThuoc);

/**
 * @openapi
 * /api/kho/lo/{maLo}/ton-kho:
 *   patch:
 *     tags: [Kho]
 *     summary: Điều chỉnh tồn kho của 1 lô (Admin + NV_Kho)
 *     description: Dùng để sửa lệch khi kiểm kê, hư hỏng, mất mát. Có audit log.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: maLo
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soLuongMoi, lyDo]
 *             properties:
 *               soLuongMoi: { type: integer, minimum: 0, example: 95 }
 *               lyDo: { type: string, example: 'Kiểm kê cuối ngày' }
 *     responses:
 *       200: { description: Điều chỉnh thành công }
 *       403: { description: Không đủ quyền }
 *       404: { description: Không tìm thấy lô }
 */
router.patch('/lo/:maLo/ton-kho', writeLimiter, requireRole('Admin', 'NV_Kho'), ctrl.adjustLotStock);

module.exports = router;

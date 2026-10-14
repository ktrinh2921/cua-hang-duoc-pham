/**
 * ThongKe Routes - 3 dashboard
 *  - /kho        [All]     tồn kho + cảnh báo
 *  - /hoa-don    [All]     doanh thu + top thuốc
 *  - /tai-chinh  [Admin]   tổng thu/chi/lợi nhuận (Admin check trong routes)
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./thongKe.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(authenticate);

/**
 * @openapi
 * /api/thong-ke/kho:
 *   get:
 *     tags: [Thống kê]
 *     summary: Dashboard tồn kho — tổng giá trị, số lô, cảnh báo hết hàng / hết hạn
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/kho', ctrl.getKho);

/**
 * @openapi
 * /api/thong-ke/hoa-don:
 *   get:
 *     tags: [Thống kê]
 *     summary: Dashboard doanh thu — tổng HĐ, doanh thu theo ngày, top thuốc bán chạy
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: OK }
 */
router.get('/hoa-don', ctrl.getHoaDon);

/**
 * @openapi
 * /api/thong-ke/tai-chinh:
 *   get:
 *     tags: [Thống kê]
 *     summary: Dashboard tài chính (Admin only) — tổng thu/chi/lợi nhuận
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.get('/hoa-don/list', ctrl.getHoaDonList);

/**
 * @openapi
 * /api/thong-ke/tai-chinh:
 *   get:
 *     tags: [Thống kê]
 *     summary: Dashboard tài chính (Admin only) — tổng thu/chi/lợi nhuận
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: denNgay
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.get('/tai-chinh', requireRole('Admin'), ctrl.getTaiChinh);

module.exports = router;

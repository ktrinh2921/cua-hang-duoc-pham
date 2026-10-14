/**
 * BanHang Routes - Action "bán hàng"
 *
 *  POST /api/ban-hang  — Tạo hóa đơn mới + trừ tồn kho (Admin, NV_BanHang)
 *
 * Tách riêng khỏi hoaDon.routes.js vì:
 *  - /api/ban-hang là ACTION (verb-like)
 *  - /api/hoa-don là RESOURCE (collection of invoices)
 *  - Tách ra tránh nhầm lẫn REST: 1 URL = 1 resource
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
 * /api/ban-hang:
 *   post:
 *     tags: [Bán hàng]
 *     summary: "Tạo hóa đơn bán hàng (atomic: tạo HĐ + trừ tồn kho)"
 *     description: |
 *       Endpoint "action" (theo convention RESTful của dự án):
 *       `/api/ban-hang` chỉ nhận POST. Sau khi tạo HĐ thành công, tồn kho các lô thuốc tương ứng được trừ (FIFO).
 *
 *       Quy tắc nghiệp vụ:
 *         * Mỗi `chiTiet` phải kèm `maLo` cụ thể (đã chọn lô) hoặc để trống để server chọn lô theo FIFO.
 *         * Tổng tiền hóa đơn được tính lại server-side, KHÔNG tin tưởng client.
 *         * Khách hàng tùy chọn — bỏ trống nếu khách lẻ.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chiTiet, phuongThucThanhToan]
 *             properties:
 *               maKH:
 *                 type: integer
 *                 nullable: true
 *                 description: ID khách hàng — null nếu khách lẻ
 *                 example: 12
 *               phuongThucThanhToan:
 *                 type: string
 *                 enum: [TienMat, ChuyenKhoan, The]
 *                 example: TienMat
 *               ghiChu:
 *                 type: string
 *                 nullable: true
 *               chiTiet:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [maThuoc, soLuong, donGia]
 *                   properties:
 *                     maThuoc: { type: integer, example: 5 }
 *                     maLo:
 *                       type: string
 *                       nullable: true
 *                       description: Mã lô thuốc cụ thể — bỏ trống để server chọn FIFO
 *                       example: 'LO20260917-005'
 *                     soLuong: { type: integer, minimum: 1, example: 2 }
 *                     donGia: { type: number, description: 'Đơn giá bán / đơn vị', example: 25000 }
 *     responses:
 *       201:
 *         description: Tạo hóa đơn thành công, trừ tồn kho thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     maHD: { type: integer }
 *                     tongTien: { type: number }
 *                     items:
 *                       type: array
 *                       items: { type: object }
 *       400:
 *         description: Payload không hợp lệ / tồn kho không đủ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không đủ quyền (cần Admin hoặc NV_BanHang)
 */
router.post('/', writeLimiter, requireRole('Admin', 'NV_BanHang'), ctrl.create);

module.exports = router;

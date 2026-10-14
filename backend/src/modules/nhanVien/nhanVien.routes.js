/**
 * NhanVien Routes
 * Tất cả: Admin only
 *
 * Endpoints:
 *  GET    /api/nhan-vien                - Danhơn danh sách + filter
 *  GET    /api/nhan-vien/stats         - Thống kê tổng quan
 *  GET    /api/nhan-vien/:id           - Chi tiết NV
 *  GET    /api/nhan-vien/:id/hoa-don   - Lịch sử hóa đơn đã thanh toán
 *  POST   /api/nhan-vien               - Tạo mới
 *  PUT    /api/nhan-vien/:id           - Cập nhật
 *  DELETE /api/nhan-vien/:id           - Xóa
 */
const express = require('express');
const router = express.Router();
const ctrl = require('./nhanVien.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { audit } = require('../../middleware/audit');
const { writeLimiter } = require('../../middleware/rateLimit');

router.use(authenticate);
router.use(requireRole('Admin'));

/**
 * @openapi
 * /api/nhan-vien/stats:
 *   get:
 *     tags: [Nhân viên]
 *     summary: Thống kê tổng quan nhân viên
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tổng NV, theo vai trò, đang làm việc... }
 */
router.get('/stats', ctrl.getStats);

/**
 * @openapi
 * /api/nhan-vien:
 *   get:
 *     tags: [Nhân viên]
 *     summary: Danh sách nhân viên
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: vaiTro
 *         schema: { type: string, enum: [Admin, NV_BanHang, NV_Kho] }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/NhanVien' }
 */
router.get('/', ctrl.getAll);

/**
 * @openapi
 * /api/nhan-vien/{id}:
 *   get:
 *     tags: [Nhân viên]
 *     summary: Chi tiết nhân viên
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/NhanVien' }
 *       404: { description: Không tìm thấy }
 */
router.get('/:id', ctrl.getById);

/**
 * @openapi
 * /api/nhan-vien/{id}/hoa-don:
 *   get:
 *     tags: [Nhân viên]
 *     summary: Lịch sử hóa đơn do nhân viên này thanh toán
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng hóa đơn }
 */
router.get('/:id/hoa-don', ctrl.getHoaDonByNV);

/**
 * @openapi
 * /api/nhan-vien/{id}/phieu-nhap:
 *   get:
 *     tags: [Nhân viên]
 *     summary: Lịch sử phiếu nhập do nhân viên này tạo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Mảng phiếu nhập }
 */
router.get('/:id/phieu-nhap', ctrl.getPhieuNhapByNV);

/**
 * @openapi
 * /api/nhan-vien:
 *   post:
 *     tags: [Nhân viên]
 *     summary: Tạo nhân viên + tài khoản (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenNV, tenDangNhap, matKhau, vaiTro]
 *             properties:
 *               tenNV: { type: string, example: 'Nguyễn Thị Hương' }
 *               tenDangNhap: { type: string, example: 'admin.huong' }
 *               matKhau:
 *                 type: string
 *                 format: password
 *                 description: 'Mật khẩu plaintext — sẽ được hash bằng bcrypt'
 *               vaiTro:
 *                 type: string
 *                 enum: [Admin, NV_BanHang, NV_Kho]
 *               sdt: { type: string, nullable: true }
 *               email: { type: string, format: email, nullable: true }
 *     responses:
 *       201: { description: Tạo thành công }
 *       400: { description: Dữ liệu không hợp lệ / tên đăng nhập trùng }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.post('/', writeLimiter, audit('CREATE_NV'), ctrl.create);

/**
 * @openapi
 * /api/nhan-vien/{id}:
 *   put:
 *     tags: [Nhân viên]
 *     summary: Cập nhật nhân viên (Admin)
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
 *               tenNV: { type: string }
 *               vaiTro: { type: string, enum: [Admin, NV_BanHang, NV_Kho] }
 *               trangThai: { type: string, example: 'DangLamViec' }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền (cần Admin) }
 */
router.put('/:id', writeLimiter, audit('UPDATE_NV'), ctrl.update);

/**
 * @openapi
 * /api/nhan-vien/{id}:
 *   delete:
 *     tags: [Nhân viên]
 *     summary: Xóa nhân viên (Admin) — không xóa được chính mình
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Xóa thành công }
 *       404: { description: Không tìm thấy }
 *       403: { description: Không đủ quyền hoặc tự xóa chính mình }
 */
router.delete('/:id', writeLimiter, audit('DELETE_NV'), ctrl.remove);

/**
 * @openapi
 * /api/nhan-vien/{id}/tai-khoan:
 *   post:
 *     tags: [Nhân viên]
 *     summary: Cấp tài khoản cho nhân viên chưa có tài khoản (Admin)
 *     description: |
 *       Tạo bản ghi TaiKhoan gắn với nhân viên hiện tại.
 *       Username phải unique, password ≥ 8 ký tự (hoa/thường/số/đặc biệt).
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
 *             required: [tenDangNhap, matKhau, vaiTro]
 *             properties:
 *               tenDangNhap: { type: string, example: 'banhang.anh' }
 *               matKhau: { type: string, format: password }
 *               vaiTro:
 *                 type: string
 *                 enum: [Admin, NV_BanHang, NV_Kho]
 *               trangThai:
 *                 type: string
 *                 enum: [HoatDong, Khoa]
 *                 default: HoatDong
 *     responses:
 *       201: { description: Cấp tài khoản thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       404: { description: Không tìm thấy nhân viên }
 *       409: { description: NV đã có tài khoản / username trùng }
 */
router.post('/:id/tai-khoan', writeLimiter, audit('CREATE_ACCOUNT_NV'), ctrl.createAccount);

/**
 * @openapi
 * /api/nhan-vien/{id}/tai-khoan:
 *   patch:
 *     tags: [Nhân viên]
 *     summary: Đổi vai trò / khóa-mở khóa tài khoản NV (Admin)
 *     description: |
 *       Cập nhật VaiTro và/hoặc TrangThai (HoatDong/Khoa) của tài khoản NV.
 *       Admin không thể tự khóa / tự đổi vai trò chính mình.
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
 *               vaiTro:
 *                 type: string
 *                 enum: [Admin, NV_BanHang, NV_Kho]
 *               trangThai:
 *                 type: string
 *                 enum: [HoatDong, Khoa]
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy }
 *       409: { description: NV chưa có tài khoản }
 */
router.patch('/:id/tai-khoan', writeLimiter, audit('UPDATE_ACCOUNT_NV'), ctrl.updateAccount);

/**
 * @openapi
 * /api/nhan-vien/{id}/reset-mat-khau:
 *   post:
 *     tags: [Nhân viên]
 *     summary: Admin reset mật khẩu cho NV
 *     description: |
 *       Nếu không truyền `matKhauMoi` thì hệ thống tự sinh mật khẩu tạm ngẫu nhiên
 *       (12 ký tự, đảm bảo chữ hoa/thường/số/đặc biệt). Trả về `matKhauTam` để Admin
 *       chuyển cho NV. NV nên đổi lại qua `/api/auth/change-password` ngay sau đó.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matKhauMoi: { type: string, format: password, nullable: true }
 *     responses:
 *       200: { description: OK, trả về matKhauTam }
 *       404: { description: Không tìm thấy NV / chưa có tài khoản }
 */
router.post('/:id/reset-mat-khau', writeLimiter, audit('RESET_PASSWORD_NV'), ctrl.resetPassword);

module.exports = router;

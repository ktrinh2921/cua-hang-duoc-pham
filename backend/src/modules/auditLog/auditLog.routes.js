/**
 * AuditLog Routes
 *
 * Route: /api/audit-log
 * All endpoints require Admin role
 *
 * GET  /api/audit-log        - Danh sach audit log (filter + phan trang)
 * GET  /api/audit-log/stats - Thong ke tong quan (7 ngay)
 * GET  /api/audit-log/actions - Danh sach action types
 * GET  /api/audit-log/tables - Danh sach bang duoc ghi
 * GET  /api/audit-log/:id    - Chi tiet 1 ban ghi
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./auditLog.controller');

/**
 * @openapi
 * /api/audit-log:
 *   get:
 *     summary: Lay danh sach audit log (Admin only)
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Loc tu ngay (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Loc den ngay (YYYY-MM-DD)
 *       - in: query
 *         name: tenDangNhap
 *         schema:
 *           type: string
 *         description: Loc theo ten dang nhap
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Loc theo action (VD LOGIN CREATE_THUOC)
 *       - in: query
 *         name: tableName
 *         schema:
 *           type: string
 *         description: Loc theo ten bang
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Danh sach audit log
 *       401:
 *         description: Chua dang nhap
 *       403:
 *         description: Khong co quyen Admin
 */
router.use(authenticate, requireRole('Admin'));

router.get('/', ctrl.getAuditLogs);

/**
 * @swagger
 * /api/audit-log/stats:
 *   get:
 *     summary: Thong ke tong quan audit log (7 ngay gan nhat)
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thong ke audit
 */
router.get('/stats', ctrl.getAuditStats);

/**
 * @swagger
 * /api/audit-log/actions:
 *   get:
 *     summary: Lay danh sach cac loai action co mat trong log
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sach action types
 */
router.get('/actions', ctrl.getActionTypes);

/**
 * @swagger
 * /api/audit-log/tables:
 *   get:
 *     summary: Lay danh sach cac bang duoc ghi log
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sach ten bang
 */
router.get('/tables', ctrl.getTableNames);

/**
 * @swagger
 * /api/audit-log/{id}:
 *   get:
 *     summary: Lay chi tiet 1 ban ghi audit
 *     tags: [Audit Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiet audit log
 *       404:
 *         description: Khong tim thay
 */
router.get('/:id', ctrl.getAuditLogById);

module.exports = router;

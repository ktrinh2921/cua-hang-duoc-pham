/**
 * SystemConfig Routes
 *
 * Route: /api/system-config
 * All endpoints require Admin role
 *
 * GET  /api/system-config       - Lay tat ca cau hinh
 * GET  /api/system-config/:key  - Lay 1 cau hinh
 * PUT  /api/system-config/:key  - Cap nhat 1 cau hinh
 * PUT  /api/system-config       - Cap nhat nhieu cau hinh
 * DELETE /api/system-config/:key - Xoa 1 cau hinh
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const ctrl = require('./systemConfig.controller');

/**
 * @swagger
 * /api/system-config:
 *   get:
 *     summary: Lay tat ca cau hinh he thong (Admin only)
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sach cau hinh
 *       403:
 *         description: Khong co quyen
 */
router.use(authenticate, requireRole('Admin'));

router.get('/', ctrl.getAll);

/**
 * @swagger
 * /api/system-config/{key}:
 *   get:
 *     summary: Lay 1 cau hinh theo key
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gia tri cau hinh
 */
router.get('/:key', ctrl.getOne);

/**
 * @swagger
 * /api/system-config/{key}:
 *   put:
 *     summary: Cap nhat 1 cau hinh
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 description: Gia tri cau hinh (se tu dong parse JSON neu la object)
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cap nhat thanh cong
 */
router.put('/:key', ctrl.setOne);

/**
 * @swagger
 * /api/system-config:
 *   put:
 *     summary: Cap nhat nhieu cau hinh cung luc
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configs:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cap nhat thanh cong
 */
router.put('/', ctrl.setMany);

/**
 * @swagger
 * /api/system-config/{key}:
 *   delete:
 *     summary: Xoa 1 cau hinh
 *     tags: [System Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xoa thanh cong
 */
router.delete('/:key', ctrl.removeOne);

module.exports = router;

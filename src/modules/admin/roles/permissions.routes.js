const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const rolesController = require('./roles.controller');

/**
 * @swagger
 * /api/v1/admin/permissions:
 *   get:
 *     summary: Admin xem danh sach permission
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions
 */
router.get('/', requirePermission('admin.roles.read'), rolesController.listPermissions);

module.exports = router;

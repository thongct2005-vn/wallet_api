const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const rolesController = require('./roles.controller');
const rolesValidator = require('./roles.validator');

/**
 * @swagger
 * /api/v1/admin/roles:
 *   get:
 *     summary: Admin xem danh sach role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles
 *   post:
 *     summary: Super Admin tao role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created
 *       400:
 *         description: Bad Request
 * /api/v1/admin/roles/{id}:
 *   get:
 *     summary: Admin xem chi tiet role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID cua role
 *     responses:
 *       200:
 *         description: Role detail
 *       400:
 *         description: Validation Error
 *   patch:
 *     summary: Super Admin cap nhat role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID cua role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Validation Error
 */


// Roles CRUD
router.get('/', requirePermission('admin.roles.read'), rolesController.listRoles);
router.post('/', requirePermission('admin.roles.create'), rolesValidator.validateCreateRole, rolesController.createRole);
router.get('/:id', requirePermission('admin.roles.read'), rolesValidator.validateIdParam, rolesController.getRoleDetail);
router.patch('/:id', requirePermission('admin.roles.update'), rolesValidator.validateIdParam, rolesValidator.validateUpdateRole, rolesController.updateRole);

module.exports = router;

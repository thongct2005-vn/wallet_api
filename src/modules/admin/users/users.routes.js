const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const usersController = require('./users.controller');
const usersValidator = require('./users.validator');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Admin xem danh sach user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, PENDING_VERIFY, LOCKED, BLOCKED, INACTIVE]
 *       - in: query
 *         name: user_type
 *         schema:
 *           type: string
 *           enum: [USER, MERCHANT_USER, ADMIN, SUPER_ADMIN, SUPPORT_STAFF]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sach user
 *   post:
 *     summary: Admin tao user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, password]
 *             properties:
 *               full_name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: Password@123
 *               role_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["USER"]
 *     responses:
 *       201:
 *         description: User created
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Admin xem chi tiet user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User detail
 *   patch:
 *     summary: Admin cap nhat user (Roles)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               is_kyc_verified:
 *                 type: boolean
 *               role_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sach Ma Role de gan cho user (Super Admin moi duoc phep doi sang cac Role he thong)
 *     responses:
 *       200:
 *         description: User updated
 * /api/v1/admin/users/{id}/wallet:
 *   get:
 *     summary: Admin xem vi cua user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User wallet
 * /api/v1/admin/users/{id}/actions/lock:
 *   post:
 *     summary: Admin khoa user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User locked
 * /api/v1/admin/users/{id}/actions/unlock:
 *   post:
 *     summary: Admin mo khoa user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User unlocked
 * /api/v1/admin/users/{id}/actions/reset-password:
 *   post:
 *     summary: Admin reset password cho user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_password, confirm_new_password, reason]
 *             properties:
 *               new_password:
 *                 type: string
 *                 example: NewPassword@123
 *               confirm_new_password:
 *                 type: string
 *                 example: NewPassword@123
 *               reason:
 *                 type: string
 *                 example: User requested account recovery
 *     responses:
 *       200:
 *         description: Password reset
 *       400:
 *         description: Du lieu khong hop le
 *       403:
 *         description: Khong co quyen reset tai khoan nay
 * /api/v1/admin/users/{id}/audit-logs:
 *   get:
 *     summary: Admin xem audit log lien quan user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs cua user
 */


router.get('/users', requirePermission('admin.users.read'), usersController.listUsers);
router.post('/customers', requirePermission('admin.users.create'), usersValidator.validateCreateCustomer, usersController.createCustomer);
router.post('/staffs', requirePermission('admin.users.create'), usersValidator.validateCreateStaff, usersController.createStaff);
router.get('/users/:id', requirePermission('admin.users.read'), usersValidator.validateIdParam, usersController.getUserDetail);
router.patch('/users/:id', requirePermission('admin.users.update'), usersValidator.validateIdParam, usersController.updateUser);
router.get('/users/:id/wallet', requirePermission('admin.wallets.read'), usersValidator.validateIdParam, usersController.getUserWallet);
router.post('/users/:id/actions/lock', requirePermission('admin.users.lock'), usersValidator.validateIdParam, usersValidator.validateReason, usersController.lockUser);
router.post('/users/:id/actions/unlock', requirePermission('admin.users.lock'), usersValidator.validateIdParam, usersValidator.validateReason, usersController.unlockUser);
router.post('/users/:id/actions/reset-password', requirePermission('admin.users.reset_password'), usersValidator.validateIdParam, usersValidator.validateResetPassword, usersController.resetUserPassword);
router.get('/users/:id/audit-logs', requirePermission('admin.audit_logs.read'), usersValidator.validateIdParam, usersController.getUserAuditLogs);

module.exports = router;

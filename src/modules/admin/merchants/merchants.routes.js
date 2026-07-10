/**
 * Admin Merchants Routes
 * 
 * Endpoints:
 * - GET    /                          → listMerchants
 * - GET    /:id                       → getMerchantDetail
 * - POST   /:id/actions/approve       → approveMerchant
 * - POST   /:id/actions/reject        → rejectMerchant
 * - POST   /:id/actions/suspend       → suspendMerchant
 * - POST   /:id/actions/activate      → activateMerchant
 * - GET    /:id/api-keys              → getMerchantApiKeys
 */
/**
 * Admin Merchants Routes
 * 
 * Endpoints:
 * - GET    /                          → listMerchants
 * - GET    /:id                       → getMerchantDetail
 * - POST   /:id/actions/approve       → approveMerchant
 * - POST   /:id/actions/reject        → rejectMerchant
 * - POST   /:id/actions/suspend       → suspendMerchant
 * - POST   /:id/actions/activate      → activateMerchant
 * - GET    /:id/api-keys              → getMerchantApiKeys
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const merchantsController = require('./merchants.controller');
const merchantsValidator = require('./merchants.validator');

/**
 * @swagger
 * /api/v1/admin/merchants:
 *   get:
 *     summary: Admin xem danh sach merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Merchants
 *   post:
 *     summary: Admin dang ky merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchant_name, business_type, owner_info]
 *             properties:
 *               merchant_name: { type: string, example: "Công Ty TNHH Lập Trình AI" }
 *               business_type: { type: string, enum: [ONLINE, OFFLINE, BOTH], example: "ONLINE" }
 *               representative_name: { type: string, example: "Lê Văn Thông" }
 *               tax_code: { type: string, example: "0312345678" }
 *               phone: { type: string, example: "02873001111" }
 *               email: { type: string, example: "contact@laptrinh-ai.com" }
 *               address: { type: string, example: "Tòa nhà Bitexco, Quận 1, TP.HCM" }
 *               owner_info:
 *                 type: object
 *                 required: [full_name, username, phone, email]
 *                 properties:
 *                   full_name: { type: string, example: "Lê Văn Thông" }
 *                   username: { type: string, example: "thong_ai" }
 *                   phone: { type: string, example: "0987654111" }
 *                   email: { type: string, example: "contact@laptrinh-ai.com" }
 *               callback:
 *                 type: object
 *                 properties:
 *                   default_callback_url: { type: string, example: "https://laptrinh-ai.com/api/webhook" }
 *                   default_redirect_url: { type: string, example: "https://laptrinh-ai.com/payment/success" }
 *     responses:
 *       201:
 *         description: Merchant created
 * /api/v1/admin/merchants/{id}:
 *   get:
 *     summary: Admin xem chi tiet merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Merchant detail
 *   patch:
 *     summary: Admin cap nhat thong tin merchant va cau hinh callback
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               callback:
 *                 type: object
 *                 properties:
 *                   default_callback_url: { type: string }
 *                   default_redirect_url: { type: string }
 *     responses:
 *       200:
 *         description: Merchant updated
 * /api/v1/admin/merchants/{id}/actions/approve:
 *   post:
 *     summary: Admin duyet merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Merchant approved
 * /api/v1/admin/merchants/{id}/actions/reject:
 *   post:
 *     summary: Admin tu choi merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Merchant rejected
 * /api/v1/admin/merchants/{id}/actions/suspend:
 *   post:
 *     summary: Admin tam ngung merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Merchant suspended
 * /api/v1/admin/merchants/{id}/actions/activate:
 *   post:
 *     summary: Admin kich hoat lai merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Merchant activated
 * /api/v1/admin/merchants/{id}/api-keys:
 *   get:
 *     summary: Admin xem API keys cua merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Merchant API keys
 *   post:
 *     summary: Admin cap API Key cho merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key_name, environment]
 *             properties:
 *               key_name: { type: string }
 *               environment: { type: string, enum: [SANDBOX, PRODUCTION] }
 *     responses:
 *       201:
 *         description: API Key created
 * /api/v1/admin/merchants/{id}/api-keys/{keyId}/actions/rotate:
 *   post:
 *     summary: Admin rotate API Key
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: API Key rotated
 * /api/v1/admin/merchants/{id}/api-keys/{keyId}/actions/revoke:
 *   post:
 *     summary: Admin thu hoi API Key
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: API Key revoked
 */


// Validation middleware chaining for actions
const validateAction = [merchantsValidator.validateIdParam, merchantsValidator.validateActionReason];
const validateKeyAction = [merchantsValidator.validateIdParam, merchantsValidator.validateKeyIdParam, merchantsValidator.validateActionReason];

router.post('/', requirePermission('admin.merchants.manage'), merchantsValidator.validateCreateMerchant, merchantsController.createMerchant);
router.get('/', requirePermission('admin.merchants.read'), merchantsController.listMerchants);

router.get('/:id', requirePermission('admin.merchants.read'), merchantsValidator.validateIdParam, merchantsController.getMerchantDetail);
router.patch('/:id', requirePermission('admin.merchants.manage'), merchantsValidator.validateIdParam, merchantsController.updateMerchant);

router.post('/:id/actions/approve', requirePermission('admin.merchants.manage'), validateAction, merchantsController.approveMerchant);
router.post('/:id/actions/reject', requirePermission('admin.merchants.manage'), validateAction, merchantsController.rejectMerchant);
router.post('/:id/actions/suspend', requirePermission('admin.merchants.manage'), validateAction, merchantsController.suspendMerchant);
router.post('/:id/actions/activate', requirePermission('admin.merchants.manage'), validateAction, merchantsController.activateMerchant);

router.get('/:id/api-keys', requirePermission('admin.merchants.read'), merchantsValidator.validateIdParam, merchantsController.getMerchantApiKeys);
router.post('/:id/api-keys', requirePermission('admin.merchants.manage'), merchantsValidator.validateIdParam, merchantsValidator.validateCreateApiKey, merchantsController.createApiKey);

router.post('/:id/api-keys/:keyId/actions/rotate', requirePermission('admin.merchants.manage'), validateKeyAction, merchantsController.rotateApiKey);
router.post('/:id/api-keys/:keyId/actions/revoke', requirePermission('admin.merchants.manage'), validateKeyAction, merchantsController.revokeApiKey);

module.exports = router;

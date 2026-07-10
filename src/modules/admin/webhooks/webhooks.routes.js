/**
 * Admin Webhooks Routes
 * 
 * Endpoints:
 * - GET    /                      → listWebhooks
 * - GET    /:id                   → getWebhookDetail
 * - POST   /:id/actions/retry     → retryWebhook
 * - POST   /jobs/retry-due        → runRetryDueJob
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const webhooksController = require('./webhooks.controller');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/webhooks:
 *   get:
 *     summary: Admin xem toan bo callback/webhook
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: So trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: So luong moi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trang thai webhook
 *       - in: query
 *         name: merchant_id
 *         schema:
 *           type: string
 *         description: ID cua merchant
 *     responses:
 *       200:
 *         description: Webhooks
 * /api/v1/admin/webhooks/{id}:
 *   get:
 *     summary: Admin xem chi tiet callback/webhook
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Webhook detail
 * /api/v1/admin/webhooks/{id}/actions/retry:
 *   post:
 *     summary: Admin retry callback
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Retry queued
 * /api/v1/admin/webhooks/jobs/retry-due:
 *   post:
 *     summary: Admin chay job retry due demo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retry due job result
 */

const READ_PERM = requirePermission('admin.webhooks.read');
const UPDATE_PERM = requirePermission('admin.webhooks.retry');
const webhooksValidator = require('./webhooks.validator');
const validateId = webhooksValidator.validateIdParam;

router.get('/', READ_PERM, webhooksController.listWebhooks);
router.get('/:id', READ_PERM, validateId, webhooksController.getWebhookDetail);
router.post('/:id/actions/retry', UPDATE_PERM, validateId, webhooksController.retryWebhook);
router.post('/jobs/retry-due', UPDATE_PERM, webhooksController.runRetryDueJob);

module.exports = router;

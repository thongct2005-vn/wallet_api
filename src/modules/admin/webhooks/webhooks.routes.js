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
 *     responses:
 *       200:
 *         description: Webhooks
 * /api/v1/admin/webhooks/{id}:
 *   get:
 *     summary: Admin xem chi tiet callback/webhook
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook detail
 * /api/v1/admin/webhooks/{id}/actions/retry:
 *   post:
 *     summary: Admin retry callback
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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



module.exports = router;

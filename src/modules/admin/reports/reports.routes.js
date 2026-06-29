/**
 * Admin Reports Routes
 * 
 * Endpoints:
 * - GET    /topups       → getTopupReport
 * - GET    /transfers    → getTransferReport
 * - GET    /payments     → getPaymentReport
 * - GET    /refunds      → getRefundReport
 * - GET    /merchants    → getMerchantReport
 * - GET    /webhooks     → getWebhookReport
 * - GET    /ledger       → getLedgerReport
 * - GET    /export       → exportReport
 */
const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/reports/topups:
 *   get:
 *     summary: Bao cao topup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topup report
 * /api/v1/admin/reports/transfers:
 *   get:
 *     summary: Bao cao transfer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer report
 * /api/v1/admin/reports/payments:
 *   get:
 *     summary: Bao cao payment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment report
 * /api/v1/admin/reports/refunds:
 *   get:
 *     summary: Bao cao refund
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refund report
 * /api/v1/admin/reports/merchants:
 *   get:
 *     summary: Bao cao merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Merchant report
 * /api/v1/admin/reports/webhooks:
 *   get:
 *     summary: Bao cao webhook
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook report
 * /api/v1/admin/reports/ledger:
 *   get:
 *     summary: Bao cao ledger
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ledger report
 * /api/v1/admin/reports/export:
 *   get:
 *     summary: Export bao cao
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report export file
 */

router.get('/wallet-transactions', reportsController.getWalletTransactions);
router.get('/topups', reportsController.getTopupReport);
router.get('/transfers', reportsController.getTransferReport);
router.get('/payments', reportsController.getPaymentReport);
router.get('/refunds', reportsController.getRefundReport);
router.get('/merchants', reportsController.getMerchantReport);
router.get('/webhooks', notImplemented('GET /admin/reports/webhooks'));
router.get('/ledger', notImplemented('GET /admin/reports/ledger'));
router.get('/export', reportsController.exportReport);

module.exports = router;

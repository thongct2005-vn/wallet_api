
/**
 * Admin Payments Routes
 * 
 * Endpoints:
 * - GET    /payment-orders                    → listPaymentOrders
 * - GET    /payment-orders/:id                → getPaymentOrderDetail
 * - GET    /payment-orders/:id/timeline       → getPaymentTimeline
 * - GET    /payment-orders/:id/ledger         → getPaymentLedger
 * - GET    /payment-orders/:id/callbacks      → getPaymentCallbacks
 * - GET    /qr-payments                       → listQrPayments
 * - GET    /qr-payments/:id                   → getQrPaymentDetail
 * - POST   /qr-payments/jobs/expire           → runExpireJob
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const paymentsController = require('./payments.controller');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/topups:
 *   get:
 *     summary: Admin xem toan bo topup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topups
 * /api/v1/admin/topups/{id}:
 *   get:
 *     summary: Admin xem chi tiet topup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topup detail
 * /api/v1/admin/transfers:
 *   get:
 *     summary: Admin xem toan bo transfer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfers
 * /api/v1/admin/transfers/{id}:
 *   get:
 *     summary: Admin xem chi tiet transfer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer detail
 */


/**
 * @swagger
 * /api/v1/admin/payments/payment-orders:
 *   get:
 *     summary: Admin xem danh sach payment orders
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment orders
 * /api/v1/admin/payments/payment-orders/{id}:
 *   get:
 *     summary: Admin xem chi tiet payment order
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment order detail
 * /api/v1/admin/payments/payment-orders/{id}/timeline:
 *   get:
 *     summary: Admin xem timeline payment flow
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment timeline
 * /api/v1/admin/payments/payment-orders/{id}/ledger:
 *   get:
 *     summary: Admin xem ledger cua payment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment ledger
 * /api/v1/admin/payments/payment-orders/{id}/callbacks:
 *   get:
 *     summary: Admin xem callback cua payment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment callbacks
 */


/**
 * @swagger
 * /api/v1/admin/payments/qr-payments:
 *   get:
 *     summary: Admin tra cuu QR payments
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR payments
 * /api/v1/admin/payments/qr-payments/{id}:
 *   get:
 *     summary: Admin xem chi tiet QR/payment flow
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR payment detail
 * /api/v1/admin/payments/qr-payments/jobs/expire:
 *   post:
 *     summary: Admin chay job expire QR demo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expire job result
 */


/**
 * @swagger
 * /api/v1/admin/payments/refunds:
 *   get:
 *     summary: Admin xem toan bo refund
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refunds
 *   post:
 *     summary: Admin tao refund
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Refund created
 * /api/v1/admin/payments/refunds/{id}:
 *   get:
 *     summary: Admin xem chi tiet refund
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refund detail
 */

const READ_PERM   = requirePermission('admin.transactions.read');
const MANAGE_PERM = requirePermission('admin.transactions.manage');
const paymentsValidator = require('./payments.validator');
const validateId = paymentsValidator.validateIdParam;

// Payment Orders
router.get('/payment-orders',                READ_PERM,   paymentsController.listPaymentOrders);
router.get('/payment-orders/:id',            READ_PERM,   validateId, paymentsController.getPaymentOrderDetail);
router.get('/payment-orders/:id/timeline',   READ_PERM,   validateId, paymentsController.getPaymentTimeline);
router.get('/payment-orders/:id/ledger',     READ_PERM,   validateId, paymentsController.getPaymentLedger);
router.get('/payment-orders/:id/callbacks',  READ_PERM,   validateId, paymentsController.getPaymentCallbacks);

// Refunds
router.get('/refunds',     READ_PERM, paymentsController.listRefunds);
router.get('/refunds/:id', READ_PERM, validateId, paymentsController.getRefundDetail);

// QR Payments
router.get('/qr-payments',              READ_PERM,   paymentsController.listQrPayments);
router.get('/qr-payments/:id',          READ_PERM,   validateId, paymentsController.getQrPaymentDetail);
router.post('/qr-payments/jobs/expire', MANAGE_PERM, paymentsController.runExpireJob);

module.exports = router;

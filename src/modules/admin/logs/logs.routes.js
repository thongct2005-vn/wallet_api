/**
 * Admin Logs Routes
 * 
 * Endpoints:
 * - GET    /audit-logs                      → listAuditLogs
 * - GET    /audit-logs/:id                  → getAuditLogDetail
 * - GET    /system-logs                     → listSystemLogs
 * - GET    /payment-traces/:payment_order_id → getPaymentTrace
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const logsController = require('./logs.controller');
const notImplemented = require('../../../utils/notImplemented');

// TODO: Di chuyển routes từ admin.routes.js (L1030-1033)
router.get('/api', logsController.getApiLogs);
router.get('/system', logsController.getSystemLogs);
router.get('/traces', logsController.getPaymentTraces);

module.exports = router;

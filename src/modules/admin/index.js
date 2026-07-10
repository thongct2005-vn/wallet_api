/**
 * Admin Module - Root Router
 * 
 * Gom tất cả admin sub-routes vào 1 entry point.
 * File routes/index.js chỉ cần: router.use('/admin', require('../modules/admin/index'))
 * 
 * Cấu trúc:
 *   admin/
 *   ├── _shared/          → Code dùng chung (helpers, validators, pagination)
 *   ├── users/            → Quản lý users
 *   ├── roles/            → Quản lý roles/permissions
 *   ├── wallets/          → Quản lý ví
 *   ├── merchants/        → Quản lý merchant + API keys
 *   ├── transactions/     → Topups, transfers, refunds, ledger, reconcile
 *   ├── payments/         → Payment orders + QR payments
 *   ├── webhooks/         → Callback/webhook management
 *   ├── dashboard/        → KPIs, charts, alerts
 *   ├── reports/          → Báo cáo + export
 *   ├── settings/         → Cấu hình hệ thống
 *   ├── logs/             → Audit logs + system logs
 *   └── index.js          → File này (router gốc)
 */
const express = require('express');
const router = express.Router();
const { authenticateJwt, requireAdmin } = require('../../middlewares/auth.middleware');

// ═══════════════════════════════════════════
// Áp dụng auth middleware cho TẤT CẢ admin routes
// ═══════════════════════════════════════════
router.use(authenticateJwt, requireAdmin);

// ═══════════════════════════════════════════
// Gom tất cả sub-routes
// ═══════════════════════════════════════════
router.use('/', require('./users/users.routes'));          // /admin/users, /admin/staffs
router.use('/roles', require('./roles/roles.routes'));          // /admin/roles
router.use('/permissions', require('./roles/permissions.routes'));    // /admin/permissions
router.use('/wallets', require('./wallets/wallets.routes'));      // /admin/wallets
router.use('/merchants', require('./merchants/merchants.routes'));  // /admin/merchants
router.use('/transactions', require('./transactions/transactions.routes')); // /admin/transactions/topups, etc
router.use('/payments', require('./payments/payments.routes'));    // /admin/payments
router.use('/webhooks', require('./webhooks/webhooks.routes'));    // /admin/webhooks
router.use('/dashboard', require('./dashboard/dashboard.routes'));  // /admin/dashboard/*
router.use('/reports', require('./reports/reports.routes'));      // /admin/reports/*
router.use('/settings', require('./settings/settings.routes'));    // /admin/settings
router.use('/logs', require('./logs/logs.routes'));            // /admin/logs/api, /admin/logs/system
router.use('/kyc', require('./kyc/kyc.routes'));              // /admin/kyc

module.exports = router;

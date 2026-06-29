/**
 * Admin Dashboard Routes
 * 
 * Endpoints:
 * - GET    /kpis                  → getDashboardKPIs
 * - GET    /transactions-chart    → getTransactionsChart
 * - GET    /success-rate          → getSuccessRate
 * - GET    /top-merchants         → getTopMerchants
 * - GET    /recent-activities     → getRecentActivities
 * - GET    /alerts                → getAlerts
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/dashboard/kpis:
 *   get:
 *     summary: Admin dashboard KPIs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard KPIs
 * /api/v1/admin/dashboard/transactions-chart:
 *   get:
 *     summary: Admin bieu do giao dich
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction chart
 * /api/v1/admin/dashboard/success-rate:
 *   get:
 *     summary: Admin ty le thanh cong
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success rate
 * /api/v1/admin/dashboard/top-merchants:
 *   get:
 *     summary: Admin top merchant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top merchants
 * /api/v1/admin/dashboard/recent-activities:
 *   get:
 *     summary: Admin hoat dong gan day
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent activities
 * /api/v1/admin/dashboard/alerts:
 *   get:
 *     summary: Admin canh bao he thong
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System alerts
 */

router.get('/kpis', dashboardController.getDashboardKPIs);
router.get('/transactions-chart', notImplemented('GET /admin/dashboard/transactions-chart'));
router.get('/success-rate', notImplemented('GET /admin/dashboard/success-rate'));
router.get('/top-merchants', notImplemented('GET /admin/dashboard/top-merchants'));
router.get('/recent-activities', notImplemented('GET /admin/dashboard/recent-activities'));
router.get('/alerts', notImplemented('GET /admin/dashboard/alerts'));

module.exports = router;

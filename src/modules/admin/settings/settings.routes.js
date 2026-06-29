/**
 * Admin Settings Routes
 * 
 * Endpoints:
 * - GET    /            → listSettings
 * - PATCH  /:key        → updateSetting
 * - GET    /history     → getSettingHistory
 */
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const settingsController = require('./settings.controller');
const notImplemented = require('../../../utils/notImplemented');

/**
 * @swagger
 * /api/v1/admin/settings:
 *   get:
 *     summary: Admin xem cau hinh he thong
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings
 * /api/v1/admin/settings/{key}:
 *   patch:
 *     summary: Admin cap nhat mot setting
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setting updated
 * /api/v1/admin/settings/history:
 *   get:
 *     summary: Admin xem lich su thay doi setting
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setting histories
 */



module.exports = router;

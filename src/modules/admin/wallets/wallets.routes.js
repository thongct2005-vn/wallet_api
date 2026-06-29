const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const walletsController = require('./wallets.controller');
const walletsValidator = require('./wallets.validator');

/**
 * @swagger
 * /api/v1/admin/wallets:
 *   get:
 *     summary: Admin xem danh sach vi
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
 *           enum: [ACTIVE, LOCKED, CLOSED]
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
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
 *         description: Wallets
 * /api/v1/admin/wallets/{wallet_id}:
 *   get:
 *     summary: Admin xem chi tiet vi
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wallet_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet detail
 * /api/v1/admin/wallets/{wallet_id}/summary:
 *   get:
 *     summary: Admin xem tong quan vi
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wallet_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet summary
 * /api/v1/admin/wallets/{wallet_id}/ledger:
 *   get:
 *     summary: Admin xem ledger cua vi
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wallet_id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Wallet ledger
 * /api/v1/admin/wallets/{wallet_id}/actions/lock:
 *   post:
 *     summary: Admin khoa vi
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wallet_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Giao dịch bị nghi ngờ là gian lận
 *     responses:
 *       200:
 *         description: Wallet locked
 *       400:
 *         description: Thieu ly do hoac wallet_id khong hop le
 *       409:
 *         description: Vi da khoa hoac da dong
 * /api/v1/admin/wallets/{wallet_id}/actions/unlock:
 *   post:
 *     summary: Admin mo khoa vi
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: wallet_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Đánh giá rủi ro đã hoàn thành
 *     responses:
 *       200:
 *         description: Wallet unlocked
 *       400:
 *         description: Thieu ly do hoac wallet_id khong hop le
 *       409:
 *         description: Vi khong bi khoa hoac da dong
 */


router.get('/', requirePermission('admin.wallets.read'), walletsController.listWallets);
router.get('/:id', requirePermission('admin.wallets.read'), walletsValidator.validateIdParam, walletsController.getWalletDetail);
router.get('/:id/summary', requirePermission('admin.wallets.read'), walletsValidator.validateIdParam, walletsController.getWalletSummary);
router.get('/:id/ledger', requirePermission('admin.wallets.read'), walletsValidator.validateIdParam, walletsController.getWalletLedger);
router.post('/:id/actions/lock', requirePermission('admin.wallets.lock'), walletsValidator.validateIdParam, walletsValidator.validateReason, walletsController.lockWallet);
router.post('/:id/actions/unlock', requirePermission('admin.wallets.lock'), walletsValidator.validateIdParam, walletsValidator.validateReason, walletsController.unlockWallet);

module.exports = router;

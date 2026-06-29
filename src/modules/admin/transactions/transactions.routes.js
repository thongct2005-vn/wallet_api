const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../../middlewares/auth.middleware');
const transactionsController = require('./transactions.controller');
const transactionsValidator = require('./transactions.validator');

/**
 * @swagger
 * tags:
 *   name: AdminTransactions
 *   description: Admin tra cuu giao dich, nap tien, chuyen khoan va so cai
 * 
 * /api/v1/admin/transactions/topups:
 *   get:
 *     summary: Danh sach giao dich nap tien
 *     tags: [AdminTransactions]
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
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: wallet_id
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
 *         description: OK
 * 
 * /api/v1/admin/transactions/topups/{id}:
 *   get:
 *     summary: Chi tiet giao dich nap tien
 *     tags: [AdminTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 * 
 * /api/v1/admin/transactions/transfers:
 *   get:
 *     summary: Danh sach giao dich chuyen khoan
 *     tags: [AdminTransactions]
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
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: wallet_id
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
 *         description: OK
 * 
 * /api/v1/admin/transactions/transfers/{id}:
 *   get:
 *     summary: Chi tiet giao dich chuyen khoan
 *     tags: [AdminTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 * 
 * /api/v1/admin/transactions/ledger:
 *   get:
 *     summary: Danh sach giao dich so cai (Ledger Transactions)
 *     tags: [AdminTransactions]
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
 *       - in: query
 *         name: type
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
 *         description: OK
 * 
 * /api/v1/admin/transactions/ledger/{id}:
 *   get:
 *     summary: Chi tiet giao dich so cai va but toan (Ledger Entries)
 *     tags: [AdminTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 * 
 * /api/v1/admin/transactions/ledger-entries:
 *   get:
 *     summary: Danh sach tat ca but toan (Ledger Entries)
 *     tags: [AdminTransactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: wallet_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: merchant_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: account_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: entry_type
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
 *         description: OK
 */

const READ_PERM = requirePermission('admin.transactions.read');

// Topups
router.get('/topups', READ_PERM, transactionsController.listTopups);
router.get('/topups/:id', READ_PERM, transactionsValidator.validateIdParam, transactionsController.getTopupDetail);

// Transfers
router.get('/transfers', READ_PERM, transactionsController.listTransfers);
router.get('/transfers/:id', READ_PERM, transactionsValidator.validateIdParam, transactionsController.getTransferDetail);

// Ledger Transactions
router.get('/ledger', READ_PERM, transactionsController.listLedgerTransactions);
router.get('/ledger/:id', READ_PERM, transactionsValidator.validateIdParam, transactionsController.getLedgerTransactionDetail);

// Ledger Entries (All)
router.get('/ledger-entries', READ_PERM, transactionsController.listLedgerEntries);

module.exports = router;

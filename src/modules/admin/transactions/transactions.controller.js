const transactionsService = require('./transactions.service');
const { success, handleAdminError } = require('../_shared');

const transactionsController = {
    listTopups: async (req, res) => {
        try {
            const result = await transactionsService.listTopups(req.query);
            return success(res, result, 'Lay danh sach nap tien thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list topups:');
        }
    },

    getTopupDetail: async (req, res) => {
        try {
            const result = await transactionsService.getTopupDetail(req.params.id);
            return success(res, result, 'Lay chi tiet nap tien thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get topup detail:');
        }
    },

    listTransfers: async (req, res) => {
        try {
            const result = await transactionsService.listTransfers(req.query);
            return success(res, result, 'Lay danh sach chuyen khoan thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list transfers:');
        }
    },

    getTransferDetail: async (req, res) => {
        try {
            const result = await transactionsService.getTransferDetail(req.params.id);
            return success(res, result, 'Lay chi tiet chuyen khoan thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get transfer detail:');
        }
    },

    listLedgerTransactions: async (req, res) => {
        try {
            const result = await transactionsService.listLedgerTransactions(req.query);
            return success(res, result, 'Lay danh sach giao dich so cai thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list ledger transactions:');
        }
    },

    getLedgerTransactionDetail: async (req, res) => {
        try {
            const result = await transactionsService.getLedgerTransactionDetail(req.params.id);
            return success(res, result, 'Lay chi tiet giao dich so cai thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get ledger transaction detail:');
        }
    },

    listLedgerEntries: async (req, res) => {
        try {
            const result = await transactionsService.listLedgerEntries(req.query);
            return success(res, result, 'Lay danh sach but toan so cai thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list ledger entries:');
        }
    }
};

module.exports = transactionsController;

const walletsService = require('./wallets.service');
const { getRequestMeta, success, handleAdminError } = require('../_shared');

const walletsController = {
    listWallets: async (req, res) => {
        try {
            const result = await walletsService.listWallets(req.query);
            return success(res, result, 'Lay danh sach vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list wallets:');
        }
    },

    getWalletDetail: async (req, res) => {
        try {
            const result = await walletsService.getWalletDetail(req.params.id);
            return success(res, result, 'Lay chi tiet vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get wallet detail:');
        }
    },

    getWalletSummary: async (req, res) => {
        try {
            const result = await walletsService.getWalletSummary(req.params.id);
            return success(res, result, 'Lay tong quan vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get wallet summary:');
        }
    },

    getWalletLedger: async (req, res) => {
        try {
            const result = await walletsService.getWalletLedger({
                walletId: req.params.id,
                query: req.query
            });
            return success(res, result, 'Lay ledger vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get wallet ledger:');
        }
    },

    lockWallet: async (req, res) => {
        try {
            const result = await walletsService.lockWallet({
                actor: req.user,
                walletId: req.params.id,
                reason: req.body?.reason,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Khoa vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin lock wallet:');
        }
    },

    unlockWallet: async (req, res) => {
        try {
            const result = await walletsService.unlockWallet({
                actor: req.user,
                walletId: req.params.id,
                reason: req.body?.reason,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Mo khoa vi thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin unlock wallet:');
        }
    }
};

module.exports = walletsController;

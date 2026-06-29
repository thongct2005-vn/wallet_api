const walletsRepository = require('./wallets.repository');
const { ensureWriteAccess, ensureUuid } = require('../_shared');
const walletService = require('../../wallet/wallet.service');

const walletsService = {
    listWallets: async (query) => {
        return walletsRepository.listWallets({
            page: query.page,
            limit: query.limit,
            q: query.q || query.search,
            status: query.status,
            userId: query.user_id
        });
    },

    getWalletDetail: async (walletId) => {
        ensureUuid(walletId, 'Invalid_Wallet_Id');
        const wallet = await walletsRepository.findWalletById(walletId);
        if (!wallet) throw new Error('Wallet_Not_Found');
        return wallet;
    },

    getWalletSummary: async (walletId) => {
        const wallet = await walletsService.getWalletDetail(walletId);
        return {
            wallet_id: wallet.id,
            wallet_no: wallet.wallet_no,
            currency: wallet.currency,
            status: wallet.status,
            owner: wallet.user,
            available_balance: wallet.available_balance,
            locked_balance: wallet.locked_balance,
            total_balance: wallet.total_balance,
            balance_updated_at: wallet.balance_updated_at
        };
    },

    getWalletLedger: async ({ walletId, query }) => {
        await walletsService.getWalletDetail(walletId);
        return walletsRepository.listWalletLedger({
            walletId,
            page: query.page,
            limit: query.limit
        });
    },

    lockWallet: async ({ actor, walletId, reason, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        await walletService.lockByAdmin({
            walletId,
            actorId: actor.userId || actor.id,
            reason,
            ipAddress,
            userAgent
        });

        return walletsService.getWalletDetail(walletId);
    },

    unlockWallet: async ({ actor, walletId, reason, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        await walletService.unlockByAdmin({
            walletId,
            actorId: actor.userId || actor.id,
            reason,
            ipAddress,
            userAgent
        });

        return walletsService.getWalletDetail(walletId);
    }
};

module.exports = walletsService;

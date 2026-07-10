const walletsRepository = require('./wallets.repository');
const { ensureWriteAccess, ensureUuid, withTransaction, writeAuditLog } = require('../_shared');
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
        const stats = await walletsRepository.getWalletStats(walletId);
        
        return {
            wallet_id: wallet.id,
            wallet_no: wallet.wallet_no,
            currency: wallet.currency,
            status: wallet.status,
            owner: wallet.user,
            balance: {
                available_balance: wallet.available_balance,
                locked_balance: wallet.locked_balance,
                total_balance: wallet.total_balance,
            },
            balance_updated_at: wallet.balance_updated_at,
            stats: stats
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

    lockWallet: async ({ actor, walletId, reason, actorId, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const resolvedActorId = actorId || actor.userId || actor.id;

        const wallet = await walletsService.getWalletDetail(walletId);
        if (wallet.status === 'LOCKED') throw new Error('Wallet_Already_Locked');

        const updated = await withTransaction(async client => {
            return walletsRepository.lockWalletByAdmin(client, walletId, resolvedActorId, reason);
        });

        await writeAuditLog({
            actorId: resolvedActorId,
            action: 'admin.wallet_locked',
            entityType: 'wallets',
            entityId: walletId,
            oldData: { status: wallet.status },
            newData: { status: 'LOCKED', lock_reason: reason },
            reason,
            ipAddress,
            userAgent
        });

        return walletsService.getWalletDetail(walletId);
    },

    unlockWallet: async ({ actor, walletId, reason, actorId, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const resolvedActorId = actorId || actor.userId || actor.id;

        const wallet = await walletsService.getWalletDetail(walletId);
        if (wallet.status !== 'LOCKED') throw new Error('Wallet_Not_Locked');

        const updated = await withTransaction(async client => {
            return walletsRepository.unlockWalletByAdmin(client, walletId);
        });

        await writeAuditLog({
            actorId: resolvedActorId,
            action: 'admin.wallet_unlocked',
            entityType: 'wallets',
            entityId: walletId,
            oldData: { status: wallet.status, lock_reason: wallet.lock_reason },
            newData: { status: 'ACTIVE', lock_reason: null },
            reason,
            ipAddress,
            userAgent
        });

        return walletsService.getWalletDetail(walletId);
    }
};

module.exports = walletsService;

const transactionsRepository = require('./transactions.repository');
const { mapTopupRow, mapTransferRow, mapLedgerTransactionRow, mapLedgerEntryRow } = require('./transactions.mapper');

const transactionsService = {
    listTopups: async (query) => {
        const { rows, total, page, limit } = await transactionsRepository.listTopups({
            q: query.q,
            status: query.status,
            userId: query.user_id,
            walletId: query.wallet_id,
            dateFrom: query.date_from,
            dateTo: query.date_to,
            page: query.page,
            limit: query.limit
        });
        return {
            items: rows.map(mapTopupRow),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        };
    },

    getTopupDetail: async (id) => {
        const row = await transactionsRepository.findTopupById(id);
        if (!row) throw new Error('Topup_Not_Found');
        return mapTopupRow(row);
    },

    listTransfers: async (query) => {
        const { rows, total, page, limit } = await transactionsRepository.listTransfers({
            q: query.q,
            status: query.status,
            userId: query.user_id,
            walletId: query.wallet_id,
            dateFrom: query.date_from,
            dateTo: query.date_to,
            page: query.page,
            limit: query.limit
        });
        return {
            items: rows.map(mapTransferRow),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        };
    },

    getTransferDetail: async (id) => {
        const row = await transactionsRepository.findTransferById(id);
        if (!row) throw new Error('Transfer_Not_Found');
        return mapTransferRow(row);
    },

    listLedgerTransactions: async (query) => {
        const { rows, total, page, limit } = await transactionsRepository.listLedgerTransactions({
            q: query.q,
            status: query.status,
            type: query.type,
            dateFrom: query.date_from,
            dateTo: query.date_to,
            page: query.page,
            limit: query.limit
        });
        return {
            items: rows.map(mapLedgerTransactionRow),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        };
    },

    getLedgerTransactionDetail: async (id) => {
        const row = await transactionsRepository.findLedgerTransactionById(id);
        if (!row) throw new Error('Transaction_Not_Found');
        const entries = await transactionsRepository.findLedgerEntriesByTransactionId(id);
        return {
            ...mapLedgerTransactionRow(row),
            entries: entries.map(mapLedgerEntryRow)
        };
    },

    listLedgerEntries: async (query) => {
        const { rows, total, page, limit } = await transactionsRepository.listLedgerEntries({
            walletId: query.wallet_id,
            merchantId: query.merchant_id,
            accountType: query.account_type,
            entryType: query.entry_type,
            dateFrom: query.date_from,
            dateTo: query.date_to,
            page: query.page,
            limit: query.limit
        });
        return {
            items: rows.map(mapLedgerEntryRow),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        };
    }
};

module.exports = transactionsService;

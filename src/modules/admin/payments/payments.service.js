const paymentsRepository = require('./payments.repository');

const adminPaymentsService = {
    listPaymentOrders: async (page = 1, limit = 20, status, merchantId) => {
        const result = await paymentsRepository.listPaymentOrders(page, limit, status, merchantId);
        return {
            ...result,
            page,
            limit,
            total_pages: Math.ceil(result.total / limit)
        };
    },

    getPaymentOrderDetail: async (id) => {
        return paymentsRepository.getPaymentOrderDetail(id);
    },

    getPaymentTimeline: async (id) => {
        return paymentsRepository.getPaymentTimeline(id);
    },

    getPaymentLedger: async (id) => {
        return paymentsRepository.getPaymentLedger(id);
    },

    getPaymentCallbacks: async (id) => {
        return paymentsRepository.getPaymentCallbacks(id);
    },

    listRefunds: async (page = 1, limit = 20, status, merchantId) => {
        const result = await paymentsRepository.listRefunds(page, limit, status, merchantId);
        return {
            ...result,
            page,
            limit,
            total_pages: Math.ceil(result.total / limit)
        };
    },

    getRefundDetail: async (id) => {
        return paymentsRepository.getRefundDetail(id);
    },

    listQrPayments: async (page = 1, limit = 20, status, q) => {
        const result = await paymentsRepository.listQrPayments(page, limit, status, q);
        return {
            ...result,
            page,
            limit,
            total_pages: Math.ceil(result.total / limit)
        };
    },

    getQrPaymentDetail: async (id) => {
        return paymentsRepository.getQrPaymentDetail(id);
    },

    expireQrPayments: async () => {
        return paymentsRepository.expireQrPayments();
    }
};

module.exports = adminPaymentsService;

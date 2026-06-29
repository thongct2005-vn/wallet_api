/**
 * Admin Payments Service
 * 
 * Cần implement:
 * - listPaymentOrders, getPaymentOrderDetail
 * - getPaymentTimeline, getPaymentLedger, getPaymentCallbacks
 * - listQrPayments, getQrPaymentDetail
 * - runExpireJob
 */
const paymentsRepository = require('./payments.repository');
const { ensureWriteAccess } = require('../_shared/admin-permission');
const { ensureUuid } = require('../_shared/admin-validator');

const paymentsService = {
    // TODO: Implement payment service logic
};

module.exports = paymentsService;

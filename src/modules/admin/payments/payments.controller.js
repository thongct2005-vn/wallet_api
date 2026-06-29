/**
 * Admin Payments Controller
 * 
 * Cần implement:
 * - listPaymentOrders, getPaymentOrderDetail
 * - getPaymentTimeline, getPaymentLedger, getPaymentCallbacks
 * - listQrPayments, getQrPaymentDetail
 * - runExpireJob
 */
const paymentsService = require('./payments.service');
const { getRequestMeta } = require('../_shared/admin-audit');
const { success } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const paymentsController = {
    // TODO: Implement payment management logic
};

module.exports = paymentsController;

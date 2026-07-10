/**
 * Admin Payments Controller
 * 
 * Implemented:
 * - listPaymentOrders, getPaymentOrderDetail
 * - getPaymentTimeline, getPaymentLedger, getPaymentCallbacks
 * - listRefunds, getRefundDetail
 */
const adminPaymentsService = require('./payments.service');
const { getRequestMeta } = require('../_shared/admin-audit');
const { success, error: errorResponse } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const paymentsController = {
    listPaymentOrders: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const merchantId = req.query.merchant_id;

            const result = await adminPaymentsService.listPaymentOrders(page, limit, status, merchantId);
            return success(res, result, 'Lấy danh sách payment orders thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin listPaymentOrders');
        }
    },

    getPaymentOrderDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const detail = await adminPaymentsService.getPaymentOrderDetail(id);
            if (!detail) {
                return errorResponse(res, 404, 'NOT_FOUND', 'Không tìm thấy order');
            }
            return success(res, detail, 'Lấy chi tiết order thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getPaymentOrderDetail');
        }
    },

    getPaymentTimeline: async (req, res) => {
        try {
            const { id } = req.params;
            const timeline = await adminPaymentsService.getPaymentTimeline(id);
            return success(res, timeline, 'Lấy timeline thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getPaymentTimeline');
        }
    },

    getPaymentLedger: async (req, res) => {
        try {
            const { id } = req.params;
            const ledger = await adminPaymentsService.getPaymentLedger(id);
            return success(res, ledger, 'Lấy ledger thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getPaymentLedger');
        }
    },

    getPaymentCallbacks: async (req, res) => {
        try {
            const { id } = req.params;
            const callbacks = await adminPaymentsService.getPaymentCallbacks(id);
            return success(res, callbacks, 'Lấy callbacks thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getPaymentCallbacks');
        }
    },

    listRefunds: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const merchantId = req.query.merchant_id;

            const result = await adminPaymentsService.listRefunds(page, limit, status, merchantId);
            return success(res, result, 'Lấy danh sách refund thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin listRefunds');
        }
    },

    getRefundDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const detail = await adminPaymentsService.getRefundDetail(id);
            if (!detail) {
                return errorResponse(res, 404, 'NOT_FOUND', 'Không tìm thấy refund');
            }
            return success(res, detail, 'Lấy chi tiết refund thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getRefundDetail');
        }
    },

    listQrPayments: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const q = req.query.q || req.query.search;

            const result = await adminPaymentsService.listQrPayments(page, limit, status, q);
            return success(res, result, 'Lấy danh sách mã QR thanh toán thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin listQrPayments');
        }
    },

    getQrPaymentDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const detail = await adminPaymentsService.getQrPaymentDetail(id);
            if (!detail) {
                return errorResponse(res, 404, 'NOT_FOUND', 'Không tìm thấy QR thanh toán');
            }
            return success(res, detail, 'Lấy chi tiết QR thanh toán thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getQrPaymentDetail');
        }
    },

    runExpireJob: async (req, res) => {
        try {
            const result = await adminPaymentsService.expireQrPayments();
            return success(res, result, 'Chạy job hủy QR hết hạn thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin runExpireJob');
        }
    }
};

module.exports = paymentsController;

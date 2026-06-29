/**
 * Admin Reports Controller
 * 
 * Cần implement:
 * - getTopupReport
 * - getTransferReport
 * - getPaymentReport
 * - getRefundReport
 * - getMerchantReport
 * - getWebhookReport
 * - getLedgerReport
 * - exportReport
 */
const reportsService = require('./reports.service');
const { success } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const reportsController = {
    getWalletTransactions: async (req, res) => {
        try {
            const data = await reportsService.getWalletTransactions(req.query);
            return success(res, data, 'Lấy báo cáo giao dịch ví thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getWalletTransactions]');
        }
    },
    getTopupReport: async (req, res) => {
        try {
            const data = await reportsService.getTopupReport(req.query);
            return success(res, data, 'Lấy báo cáo nạp tiền thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getTopupReport]');
        }
    },
    getTransferReport: async (req, res) => {
        try {
            const data = await reportsService.getTransferReport(req.query);
            return success(res, data, 'Lấy báo cáo chuyển tiền thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getTransferReport]');
        }
    },
    getPaymentReport: async (req, res) => {
        try {
            const data = await reportsService.getPaymentReport(req.query);
            return success(res, data, 'Lấy báo cáo thanh toán thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getPaymentReport]');
        }
    },
    getRefundReport: async (req, res) => {
        try {
            const data = await reportsService.getRefundReport(req.query);
            return success(res, data, 'Lấy báo cáo hoàn tiền thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getRefundReport]');
        }
    },
    getMerchantReport: async (req, res) => {
        try {
            const data = await reportsService.getMerchantReport(req.query);
            return success(res, data, 'Lấy báo cáo đối tác thành công');
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][getMerchantReport]');
        }
    },
    exportReport: async (req, res) => {
        try {
            const { buffer, sheetName } = await reportsService.exportReport(req.query);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Report_${sheetName}_${Date.now()}.xlsx`);
            return res.send(buffer);
        } catch (err) {
            return handleAdminError(res, err, '[ReportsController][exportReport]');
        }
    }
};

module.exports = reportsController;

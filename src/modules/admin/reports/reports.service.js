/**
 * Admin Reports Service
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
const ExcelJS = require('exceljs');
const reportsRepository = require('./reports.repository');

const reportsService = {
    getWalletTransactions: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, type, status } = query;
        return reportsRepository.getWalletTransactions({ page, limit, from, to, type, status });
    },
    getTopupReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, status } = query;
        return reportsRepository.getTopupReport({ page, limit, from, to, status });
    },
    getTransferReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, status } = query;
        return reportsRepository.getTransferReport({ page, limit, from, to, status });
    },
    getPaymentReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, status, merchant_id } = query;
        return reportsRepository.getPaymentReport({ page, limit, from, to, status, merchant_id });
    },
    getRefundReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, status, merchant_id } = query;
        return reportsRepository.getRefundReport({ page, limit, from, to, status, merchant_id });
    },
    getMerchantReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { page, limit, status } = query;
        return reportsRepository.getMerchantReport({ page, limit, from, to, status });
    },
    exportReport: async (query) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        const { type, status } = query;
        const params = { page: 1, limit: 10000, from, to, status };
        
        let reportData;
        let columns = [];
        let sheetName = 'Report';
        
        switch (type) {
            case 'topups':
                reportData = await reportsRepository.getTopupReport(params);
                columns = [
                    { header: 'Mã GD', key: 'deposit_no', width: 20 },
                    { header: 'User', key: 'user_name', width: 20 },
                    { header: 'Phương thức', key: 'deposit_method', width: 20 },
                    { header: 'Số tiền', key: 'amount', width: 15 },
                    { header: 'Trạng thái', key: 'status', width: 15 },
                    { header: 'Ngày tạo', key: 'created_at', width: 25 },
                ];
                sheetName = 'Topups';
                break;
            case 'transfers':
                reportData = await reportsRepository.getTransferReport(params);
                columns = [
                    { header: 'Mã GD', key: 'transfer_no', width: 20 },
                    { header: 'Người gửi', key: 'sender_name', width: 20 },
                    { header: 'Người nhận', key: 'receiver_name', width: 20 },
                    { header: 'Số tiền', key: 'amount', width: 15 },
                    { header: 'Trạng thái', key: 'status', width: 15 },
                    { header: 'Ngày tạo', key: 'created_at', width: 25 },
                ];
                sheetName = 'Transfers';
                break;
            case 'payments':
                reportData = await reportsRepository.getPaymentReport(params);
                columns = [
                    { header: 'Mã GD', key: 'payment_no', width: 20 },
                    { header: 'Merchant', key: 'merchant_name', width: 20 },
                    { header: 'Mã đơn MH', key: 'merchant_order_id', width: 20 },
                    { header: 'Số tiền', key: 'amount', width: 15 },
                    { header: 'Trạng thái', key: 'status', width: 15 },
                    { header: 'Ngày tạo', key: 'created_at', width: 25 },
                ];
                sheetName = 'Payments';
                break;
            case 'refunds':
                reportData = await reportsRepository.getRefundReport(params);
                columns = [
                    { header: 'Mã Hoàn', key: 'refund_no', width: 20 },
                    { header: 'Mã Đơn', key: 'payment_no', width: 20 },
                    { header: 'Merchant', key: 'merchant_name', width: 20 },
                    { header: 'Số tiền', key: 'amount', width: 15 },
                    { header: 'Trạng thái', key: 'status', width: 15 },
                    { header: 'Ngày tạo', key: 'created_at', width: 25 },
                ];
                sheetName = 'Refunds';
                break;
            case 'merchants':
                reportData = await reportsRepository.getMerchantReport(params);
                columns = [
                    { header: 'Mã ĐT', key: 'merchant_code', width: 20 },
                    { header: 'Tên đối tác', key: 'merchant_name', width: 30 },
                    { header: 'Số đơn', key: 'total_payments', width: 15 },
                    { header: 'Đơn T.Công', key: 'paid_payments', width: 15 },
                    { header: 'Tổng doanh số', key: 'total_revenue', width: 20 },
                    { header: 'Trạng thái', key: 'status', width: 15 },
                ];
                sheetName = 'Merchants';
                break;
            default:
                throw new Error('Loại báo cáo không hợp lệ: ' + type);
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.columns = columns;

        reportData.data.forEach(item => {
            let rowItem = { ...item };
            if (rowItem.created_at) {
                rowItem.created_at = new Date(rowItem.created_at).toLocaleString('vi-VN');
            }
            worksheet.addRow(rowItem);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return { buffer, sheetName };
    }
};

module.exports = reportsService;

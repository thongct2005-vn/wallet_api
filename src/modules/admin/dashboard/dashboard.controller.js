/**
 * Admin Dashboard Controller
 * 
 * Di chuyển từ admin.controller.js:
 * - getDashboardKPIs (L241-253)
 * 
 * Cần implement thêm:
 * - getTransactionsChart
 * - getSuccessRate
 * - getTopMerchants
 * - getRecentActivities
 * - getAlerts
 */
const dashboardService = require('./dashboard.service');
const { success } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const dashboardController = {
    getDashboardKPIs: async (req, res) => {
        try {
            const result = await dashboardService.getDashboardKPIs();
            return res.status(200).json({ 
                success: true, 
                message: 'Lấy dữ liệu Dashboard thành công', 
                data: result 
            });
        } catch (err) {
            console.error("Lỗi Dashboard:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    // TODO: Implement các controller khác
};

module.exports = dashboardController;

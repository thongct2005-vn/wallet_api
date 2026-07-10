/**
 * Admin Dashboard Service
 * 
 * Di chuyển từ admin.service.js:
 * - getDashboardKPIs (L334-336)
 * 
 * Cần implement thêm:
 * - getTransactionsChart
 * - getSuccessRate
 * - getTopMerchants
 * - getRecentActivities
 * - getAlerts
 */
const dashboardRepository = require('./dashboard.repository');

const dashboardService = {
    getDashboardKPIs: async (query = {}) => {
        const from = query.from || query.fromDate;
        const to = query.to || query.toDate;
        return dashboardRepository.getDashboardStats({ from, to });
    }
};

module.exports = dashboardService;

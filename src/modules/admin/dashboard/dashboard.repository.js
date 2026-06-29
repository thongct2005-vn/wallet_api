/**
 * Admin Dashboard Repository
 * 
 * Di chuyển từ admin.repository.js:
 * - getDashboardStats() (L435-475)
 * 
 * Cần implement thêm:
 * - getTransactionsChartData()
 * - getSuccessRateData()
 * - getTopMerchantsData()
 * - getRecentActivitiesData()
 * - getAlertsData()
 */
const pool = require('../../../config/db');

const dashboardRepository = {
    getDashboardStats: async () => {
        const txQuery = `
            SELECT 
                COUNT(id) AS total_tx, 
                COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) AS total_amount,
                COUNT(id) FILTER (WHERE status = 'FAILED') AS failed_tx
            FROM ledger_transactions 
        `;
        
        const userQuery = `SELECT COUNT(id) AS total_users FROM users WHERE user_type = 'USER'`;
        const merchantQuery = `SELECT COUNT(id) AS total_merchants FROM merchants`;
        const chartQuery = `
            SELECT TO_CHAR(DATE_TRUNC('day', completed_at), 'DD/MM') AS time, COALESCE(SUM(amount), 0) AS amount
            FROM ledger_transactions WHERE status = 'SUCCESS' AND completed_at IS NOT NULL AND completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE_TRUNC('day', completed_at) ORDER BY DATE_TRUNC('day', completed_at) ASC
        `;
        const recentQuery = `
            SELECT transaction_no, transaction_type, amount, currency, status, created_at
            FROM ledger_transactions ORDER BY created_at DESC LIMIT 5
        `;

        const [txRes, userRes, merchantRes, chartRes, recentRes] = await Promise.all([
            pool.query(txQuery), pool.query(userQuery), pool.query(merchantQuery), pool.query(chartQuery), pool.query(recentQuery)
        ]);

        const totalTx = parseInt(txRes.rows[0].total_tx, 10) || 0;
        const failedTx = parseInt(txRes.rows[0].failed_tx, 10) || 0;
        const errorRate = totalTx > 0 ? ((failedTx / totalTx) * 100).toFixed(2) : 0;

        return {
            total_transactions: totalTx,
            total_amount: parseInt(txRes.rows[0].total_amount, 10) || 0,
            error_rate: parseFloat(errorRate),
            total_users: parseInt(userRes.rows[0].total_users, 10) || 0,
            total_merchants: parseInt(merchantRes.rows[0].total_merchants, 10) || 0,
            chart_data: chartRes.rows.map(r => ({ time: r.time, amount: parseInt(r.amount, 10) || 0 })),
            recent_transactions: recentRes.rows
        };
    }
};

module.exports = dashboardRepository;

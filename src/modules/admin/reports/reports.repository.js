const pool = require('../../../config/db');
const { buildPagination } = require('../_shared/admin-pagination');

const reportsRepository = {
    getWalletTransactions: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`created_at <= $${paramIndex++}`);
            values.push(params.to);
        }
        if (params.type) {
            conditions.push(`transaction_type = $${paramIndex++}::ledger_transaction_type`);
            values.push(params.type);
        }
        if (params.status) {
            conditions.push(`status = $${paramIndex++}::transaction_status`);
            values.push(params.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) as total_success_amount,
                COUNT(*) FILTER (WHERE transaction_type = 'TOPUP' AND status = 'SUCCESS') as total_topup_success,
                COUNT(*) FILTER (WHERE transaction_type = 'TRANSFER' AND status = 'SUCCESS') as total_transfer_success,
                COUNT(*) FILTER (WHERE transaction_type = 'PAYMENT' AND status = 'SUCCESS') as total_payment_success,
                COUNT(*) FILTER (WHERE transaction_type = 'REFUND' AND status = 'SUCCESS') as total_refund_success
            FROM ledger_transactions
            ${whereClause}
        `;

        const dataQuery = `
            SELECT id, transaction_no, transaction_type, source_id, amount, currency, status, created_at
            FROM ledger_transactions
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getTopupReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`d.created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`d.created_at <= $${paramIndex++}`);
            values.push(params.to);
        }
        if (params.status) {
            conditions.push(`d.status = $${paramIndex++}::deposit_status`);
            values.push(params.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) as total_success_amount
            FROM deposit_transactions d
            ${whereClause}
        `;

        const dataQuery = `
            SELECT d.id, d.deposit_no, d.amount, d.deposit_method, d.status, d.created_at, w.wallet_no, u.username as user_name
            FROM deposit_transactions d
            JOIN wallets w ON d.wallet_id = w.id
            JOIN users u ON w.user_id = u.id
            ${whereClause}
            ORDER BY d.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getTransferReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`t.created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`t.created_at <= $${paramIndex++}`);
            values.push(params.to);
        }
        if (params.status) {
            conditions.push(`t.status = $${paramIndex++}::transfer_status`);
            values.push(params.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) as total_success_amount
            FROM wallet_transfers t
            ${whereClause}
        `;

        const dataQuery = `
            SELECT t.id, t.transfer_no, t.amount, t.status, t.created_at, 
                   ws.wallet_no as sender_wallet, us.username as sender_name,
                   wr.wallet_no as receiver_wallet, ur.username as receiver_name
            FROM wallet_transfers t
            JOIN wallets ws ON t.sender_wallet_id = ws.id
            JOIN users us ON ws.user_id = us.id
            JOIN wallets wr ON t.receiver_wallet_id = wr.id
            JOIN users ur ON wr.user_id = ur.id
            ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getPaymentReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`p.created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`p.created_at <= $${paramIndex++}`);
            values.push(params.to);
        }
        if (params.status) {
            conditions.push(`p.status = $${paramIndex++}::payment_order_status`);
            values.push(params.status);
        }
        if (params.merchant_id) {
            conditions.push(`p.merchant_id = $${paramIndex++}`);
            values.push(params.merchant_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) as total_success_amount
            FROM payment_orders p
            ${whereClause}
        `;

        const dataQuery = `
            SELECT p.id, p.payment_no, p.amount, p.status, p.created_at, p.paid_at, 
                   m.merchant_name, p.merchant_order_id
            FROM payment_orders p
            LEFT JOIN merchants m ON p.merchant_id = m.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getRefundReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`r.created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`r.created_at <= $${paramIndex++}`);
            values.push(params.to);
        }
        if (params.status) {
            conditions.push(`r.status = $${paramIndex++}::refund_status`);
            values.push(params.status);
        }
        if (params.merchant_id) {
            conditions.push(`p.merchant_id = $${paramIndex++}`);
            values.push(params.merchant_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'SUCCESS'), 0) as total_success_amount
            FROM refund_transactions r
            JOIN payment_transactions pt ON r.payment_transaction_id = pt.id 
            JOIN payment_orders p ON pt.payment_order_id = p.id
            ${whereClause}
        `;

        const dataQuery = `
            SELECT r.id, r.refund_no, r.amount, r.status, r.created_at, r.description,
                   p.payment_no, m.merchant_name
            FROM refund_transactions r
            JOIN payment_transactions pt ON r.payment_transaction_id = pt.id 
            JOIN payment_orders p ON pt.payment_order_id = p.id
            LEFT JOIN merchants m ON p.merchant_id = m.id
            ${whereClause}
            ORDER BY r.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getMerchantReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [];
        let values = [];
        let paramIndex = 1;

        if (params.status) {
            conditions.push(`m.status = $${paramIndex++}::merchant_status`);
            values.push(params.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const summaryQuery = `
            SELECT COUNT(*) as total_count
            FROM merchants m
            ${whereClause}
        `;

        const dataQuery = `
            SELECT m.id, m.merchant_code, m.merchant_name, m.status, m.created_at,
                   COUNT(p.id) as total_payments,
                   COUNT(p.id) FILTER (WHERE p.status = 'PAID') as paid_payments,
                   COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PAID'), 0) as total_revenue
            FROM merchants m
            LEFT JOIN payment_orders p ON m.id = p.merchant_id
            ${whereClause}
            GROUP BY m.id
            ORDER BY total_revenue DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    },

    getFeesReport: async (params) => {
        const { limit, offset } = buildPagination(params.page, params.limit);
        let conditions = [`system_account_code = 'SYS_FEE_MDR'`];
        let values = [];
        let paramIndex = 1;

        if (params.from) {
            conditions.push(`created_at >= $${paramIndex++}`);
            values.push(params.from);
        }
        if (params.to) {
            conditions.push(`created_at <= $${paramIndex++}`);
            values.push(params.to);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0) as total_revenue
            FROM ledger_entries
            ${whereClause}
        `;

        const dataQuery = `
            SELECT id, created_at, amount, ledger_transaction_id
            FROM ledger_entries
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const [summaryRes, dataRes] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(dataQuery, [...values, limit, offset])
        ]);

        return {
            summary: summaryRes.rows[0],
            data: dataRes.rows,
            pagination: { page: parseInt(params.page) || 1, limit, total: parseInt(summaryRes.rows[0].total_count) }
        };
    }
};

module.exports = reportsRepository;

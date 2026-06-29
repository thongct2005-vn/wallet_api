const pool = require('../../../config/db');

const kycRepository = {
    getKycList: async (limit, offset, status) => {
        let query = `
            SELECT 
                k.id, k.user_id, k.id_number, k.full_name, k.kyc_status, k.created_at, u.phone AS phone_number
            FROM user_kyc k
            JOIN users u ON k.user_id = u.id
        `;
        const params = [];
        let countQuery = `SELECT COUNT(*) FROM user_kyc k JOIN users u ON k.user_id = u.id`;
        const countParams = [];

        if (status) {
            query += ` WHERE k.kyc_status = $1`;
            countQuery += ` WHERE k.kyc_status = $1`;
            params.push(status);
            countParams.push(status);
        }

        query += ` ORDER BY k.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [listResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        return {
            data: listResult.rows,
            total: parseInt(countResult.rows[0].count, 10)
        };
    },

    getKycById: async (id) => {
        const query = `
            SELECT 
                k.*, u.phone AS phone_number, u.email 
            FROM user_kyc k
            JOIN users u ON k.user_id = u.id
            WHERE k.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    approveKyc: async (id) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Lấy thông tin KYC
            const kycRes = await client.query('SELECT user_id, full_name FROM user_kyc WHERE id = $1', [id]);
            if (kycRes.rows.length === 0) {
                throw new Error('Không tìm thấy hồ sơ KYC');
            }
            const kycData = kycRes.rows[0];

            // 2. Cập nhật trạng thái KYC
            await client.query("UPDATE user_kyc SET kyc_status = 'APPROVED' WHERE id = $1", [id]);

            // 3. Cập nhật thông tin User
            await client.query(
                "UPDATE users SET is_kyc_verified = TRUE, full_name = $1 WHERE id = $2", 
                [kycData.full_name, kycData.user_id]
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    rejectKyc: async (id) => {
        const query = "UPDATE user_kyc SET kyc_status = 'REJECTED' WHERE id = $1 RETURNING id";
        const result = await pool.query(query, [id]);
        return result.rows.length > 0;
    }
};

module.exports = kycRepository;

const pool = require('../../config/db'); 

const userRepository = {
    searchUsers: async (searchQuery, currentUserId) => {
        const query = `
            SELECT u.id, u.full_name, u.phone, u.email
            FROM users u
            JOIN wallets w ON u.id = w.user_id
            WHERE u.id != $1 
              AND (u.phone = $2 OR u.full_name ILIKE $3 OR u.email ILIKE $3)
            LIMIT 20
        `;
        
        const result = await pool.query(query, [currentUserId, searchQuery, `%${searchQuery}%`]);
        return result.rows;
    },

    getUsersByPhones: async (phones, currentUserId) => {
        if (!phones || phones.length === 0) return [];
        const query = `
            SELECT u.id, u.full_name, u.phone, u.email
            FROM users u
            JOIN wallets w ON u.id = w.user_id
            WHERE u.id != $1 AND u.phone = ANY($2::text[])
        `;
        const result = await pool.query(query, [currentUserId, phones]);
        return result.rows;
    },

    getUserProfile: async (userId) => {
        const query = `
            SELECT u.full_name, u.phone, u.email, u.is_kyc_verified, k.id_number as identity_number
            FROM users u
            LEFT JOIN user_kyc k ON u.id = k.user_id
            WHERE u.id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },


    saveEmailOtp: async (userId, otpCode, minutesValid = 5) => {
        const query = `
            UPDATE users 
            SET email_otp = $1, email_otp_expired_at = NOW() + INTERVAL '${minutesValid} minutes' 
            WHERE id = $2
        `;
        await pool.query(query, [otpCode, userId]);
    },

    checkEmailOtp: async (userId) => {
        const query = `SELECT email_otp, email_otp_expired_at FROM users WHERE id = $1`;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    clearEmailOtp: async (userId) => {
        const query = `UPDATE users SET email_otp = NULL, email_otp_expired_at = NULL WHERE id = $1`;
        await pool.query(query, [userId]);
    },

    updateUserEmail: async (userId, email) => {
        const query = `UPDATE users SET email = $1 WHERE id = $2`;
        await pool.query(query, [email, userId]);
    }
};

module.exports = userRepository;
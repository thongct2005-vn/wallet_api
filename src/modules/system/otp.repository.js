
const pool = require('../../config/db');

const otpRepository = {
    
    findByPhone: async (phone) => {
        const result = await pool.query('SELECT * FROM otp_tracking WHERE phone = $1', [phone]);
        return result.rows[0]; 
    },

    
    upsertOtp: async (phone, email, otpHash, purpose = 'REGISTER') => {
        const { v7: uuidv7 } = require('uuid');
        
        // Since there is no unique constraint on phone, we manually check and update/insert
        const existing = await pool.query('SELECT id FROM otp_tracking WHERE phone = $1', [phone]);
        
        if (existing.rows.length > 0) {
            const query = `
                UPDATE otp_tracking 
                SET email = $1, otp_hash = $2, purpose = $3, failed_attempts = 0, locked_until = NULL, expired_at = NOW() + INTERVAL '5 minutes', created_at = NOW()
                WHERE phone = $4
            `;
            await pool.query(query, [email, otpHash, purpose, phone]);
        } else {
            const id = uuidv7();
            const query = `
                INSERT INTO otp_tracking (id, phone, email, otp_hash, purpose, failed_attempts, locked_until, expired_at, created_at)
                VALUES ($1, $2, $3, $4, $5, 0, NULL, NOW() + INTERVAL '5 minutes', NOW())
            `;
            await pool.query(query, [id, phone, email, otpHash, purpose]);
        }
    },

    
    updateAttempts: async (phone, attempts) => {
        const query = "UPDATE otp_tracking SET failed_attempts = $1 WHERE phone = $2";
        await pool.query(query, [attempts, phone]);
    },

    
    lockAccount: async (phone, attempts, lockMinutes) => {
        const query = `
            UPDATE otp_tracking
            SET failed_attempts = $1,
                locked_until = NOW() + ($3::text || ' minutes')::interval
            WHERE phone = $2
        `;
        await pool.query(query, [attempts, phone, Number(lockMinutes)]);
    },

    
    deleteByPhone: async (phone) => {
        await pool.query('DELETE FROM otp_tracking WHERE phone = $1', [phone]);
    }
};

module.exports = otpRepository;

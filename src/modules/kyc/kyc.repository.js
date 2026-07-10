const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const kycRepository = {
    // --- MỚI THÊM: Kiểm tra trùng lặp CCCD ---
    checkIdExists: async (idNumber) => {
        const query = 'SELECT id_number FROM user_kyc WHERE id_number = $1 LIMIT 1';
        const result = await pool.query(query, [idNumber]);
        return result.rows.length > 0;
    },

    // Gói gọn toàn bộ các thao tác DB vào 1 Transaction
    saveKYCResult: async (userId, ocrData, idFront, idBack, faceImage, status, matchScore) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Xóa bản nháp KYC cũ nếu có
            await client.query('DELETE FROM user_kyc WHERE user_id = $1', [userId]);

            // 2. Thêm hồ sơ KYC mới
            const newId = uuidv7();
            const insertQuery = `
                INSERT INTO user_kyc (
                    id, user_id, id_number, full_name, dob, gender, address, 
                    id_front_image, id_back_image, face_image, kyc_status, face_match_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
            `;
            
            const values = [
                newId, userId, ocrData.id_number, ocrData.full_name, ocrData.dob, ocrData.gender, ocrData.address,
                idFront, idBack, faceImage, status, matchScore
            ];

            const result = await client.query(insertQuery, values);
            
            if (status === 'APPROVED') {
                await client.query("UPDATE users SET is_kyc_verified = TRUE, full_name = $1 WHERE id = $2", [ocrData.full_name, userId]);
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = kycRepository;
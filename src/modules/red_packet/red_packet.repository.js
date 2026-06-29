const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const redPacketRepository = {
    createRedPacket: async (client, creatorUserId, creatorWalletId, totalAmount, totalCount, type, message) => {
        const id = uuidv7();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 1 day

        const query = `
            INSERT INTO group_fundings (
                id, creator_user_id, creator_wallet_id, type, total_amount, remaining_amount, 
                total_count, remaining_count, status, message, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10)
            RETURNING *;
        `;
        const result = await client.query(query, [
            id, creatorUserId, creatorWalletId, 'RED_PACKET', totalAmount.toString(), totalAmount.toString(),
            totalCount, totalCount, message, expiresAt
        ]);
        return result.rows[0];
    },

    getRedPacketById: async (id) => {
        const query = `
            SELECT gf.*, gf.creator_user_id, u.full_name as creator_name, u.phone as creator_phone
            FROM group_fundings gf
            JOIN users u ON gf.creator_user_id = u.id
            WHERE gf.id = $1 AND gf.type = 'RED_PACKET'
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    lockRedPacketForClaim: async (client, id) => {
        const query = `
            SELECT * FROM group_fundings WHERE id = $1 AND type = 'RED_PACKET' FOR UPDATE
        `;
        const result = await client.query(query, [id]);
        return result.rows[0];
    },

    updateRedPacketAfterClaim: async (client, id, remainingAmount, remainingCount, status) => {
        const query = `
            UPDATE group_fundings
            SET remaining_amount = $1, remaining_count = $2, status = $3, updated_at = NOW()
            WHERE id = $4
        `;
        await client.query(query, [remainingAmount.toString(), remainingCount, status, id]);
    },

    addReceiver: async (client, redPacketId, receiverUserId, receiverWalletId, amount) => {
        const id = uuidv7();
        const query = `
            INSERT INTO group_funding_members (id, group_funding_id, user_id, wallet_id, amount, status, paid_at)
            VALUES ($1, $2, $3, $4, $5, 'PAID', NOW())
            RETURNING *;
        `;
        const result = await client.query(query, [id, redPacketId, receiverUserId, receiverWalletId, amount.toString()]);
        return result.rows[0];
    },

    checkIfReceived: async (redPacketId, walletId) => {
        const query = `
            SELECT id FROM group_funding_members 
            WHERE group_funding_id = $1 AND wallet_id = $2 AND status = 'PAID'
        `;
        const result = await pool.query(query, [redPacketId, walletId]);
        return result.rows.length > 0;
    },

    getReceivers: async (redPacketId) => {
        const query = `
            SELECT gfm.*, u.full_name as receiver_name, u.phone as receiver_phone
            FROM group_funding_members gfm
            JOIN users u ON gfm.user_id = u.id
            WHERE gfm.group_funding_id = $1 AND gfm.status = 'PAID'
            ORDER BY gfm.paid_at DESC
        `;
        const result = await pool.query(query, [redPacketId]);
        return result.rows;
    }
};

module.exports = redPacketRepository;

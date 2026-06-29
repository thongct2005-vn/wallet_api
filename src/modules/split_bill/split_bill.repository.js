const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const splitBillRepository = {
    createBill: async (creatorId, totalAmount, note, memberCount, client) => {
        const id = uuidv7();
        const walletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [creatorId]);
        const creatorWalletId = walletRes.rows[0].id;
        const totalAmountInt = Math.round(Number(totalAmount));

        const query = `
            INSERT INTO group_fundings (id, creator_user_id, creator_wallet_id, type, total_amount, remaining_amount, total_count, remaining_count, status, message)
            VALUES ($1, $2, $3, 'SPLIT_BILL', $4, $4, $5, $5, 'PENDING', $6) RETURNING id
        `;
        const res = await client.query(query, [id, creatorId, creatorWalletId, totalAmountInt, memberCount, note]);
        return res.rows[0].id;
    },

    createMember: async (billId, userId, amount, status, paidAt, client) => {
        const id = uuidv7();
        const amountInt = Math.round(Number(amount));
        const query = `
            INSERT INTO group_funding_members (id, group_funding_id, user_id, amount, status, paid_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(query, [id, billId, userId, amountInt, status, paidAt]);
    },

    getReceivablesByCreatorId: async (userId) => {
        const query = `
            SELECT gf.id, gf.total_amount, (gf.total_amount / NULLIF(gf.total_count, 0)) as split_amount, gf.message as note, gf.status, gf.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', gfm.id,
                            'user_id', gfm.user_id,
                            'name', u.full_name,
                            'phone', u.phone,
                            'avatar', NULL,
                            'amount', gfm.amount,
                            'status', gfm.status,
                            'paid_at', gfm.paid_at
                        )
                    ) FILTER (WHERE gfm.id IS NOT NULL), '[]'
                ) as members
            FROM group_fundings gf
            LEFT JOIN group_funding_members gfm ON gf.id = gfm.group_funding_id
            LEFT JOIN users u ON gfm.user_id = u.id
            WHERE gf.creator_user_id = $1 AND gf.type = 'SPLIT_BILL' AND gf.status != 'CANCELLED'
            GROUP BY gf.id
            ORDER BY gf.created_at DESC
        `;
        const res = await pool.query(query, [userId]);
        return res.rows;
    },

    getPayablesByUserId: async (userId) => {
        const query = `
            SELECT gf.id as split_bill_id, gf.total_amount, (gf.total_amount / NULLIF(gf.total_count, 0)) as split_amount, gf.message as note, gf.created_at,
                   gfm.id as member_record_id, gfm.amount as my_amount, gfm.status as my_status,
                   c.id as creator_id, c.full_name as creator_name, c.phone as creator_phone, NULL as creator_avatar
            FROM group_fundings gf
            JOIN group_funding_members gfm ON gf.id = gfm.group_funding_id
            JOIN users c ON gf.creator_user_id = c.id
            WHERE gfm.user_id = $1 AND gf.creator_user_id != $1 AND gf.type = 'SPLIT_BILL' AND gfm.status != 'CANCELLED' AND gf.status != 'CANCELLED'
            ORDER BY gf.created_at DESC
        `;
        const res = await pool.query(query, [userId]);
        return res.rows;
    },

    getMemberRecordWithCreatorInfo: async (memberRecordId, userId) => {
        const query = `
            SELECT gfm.*, gfm.group_funding_id as split_bill_id, gf.creator_user_id as creator_id, c.phone as creator_phone
            FROM group_funding_members gfm
            JOIN group_fundings gf ON gfm.group_funding_id = gf.id
            JOIN users c ON gf.creator_user_id = c.id
            WHERE gfm.id = $1 AND gfm.user_id = $2
        `;
        const res = await pool.query(query, [memberRecordId, userId]);
        return res.rows[0];
    },

    updateMemberStatusToPaid: async (memberRecordId) => {
        await pool.query(
            `UPDATE group_funding_members SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [memberRecordId]
        );
    },

    checkPendingMembersAndCompleteBill: async (billId) => {
        const checkQuery = `
            SELECT COUNT(*) as pending_count 
            FROM group_funding_members 
            WHERE group_funding_id = $1 AND status != 'PAID'
        `;
        const checkRes = await pool.query(checkQuery, [billId]);
        if (parseInt(checkRes.rows[0].pending_count) === 0) {
            await pool.query(`UPDATE group_fundings SET status = 'COMPLETED' WHERE id = $1`, [billId]);
        }
    },

    cancelBill: async (billId, creatorId) => {
        const query = `
            UPDATE group_fundings SET status = 'CANCELLED' 
            WHERE id = $1 AND creator_user_id = $2
        `;
        const res = await pool.query(query, [billId, creatorId]);
        if (res.rowCount > 0) {
            const query2 = `
                UPDATE group_funding_members SET status = 'CANCELLED'
                WHERE group_funding_id = $1 AND status = 'PENDING'
            `;
            await pool.query(query2, [billId]);
        }
    },

    getPendingMembers: async (billId, creatorId) => {
        const q1 = await pool.query(`SELECT id, total_amount, (total_amount / NULLIF(total_count, 0)) as split_amount FROM group_fundings WHERE id=$1 AND creator_user_id=$2 AND type = 'SPLIT_BILL'`, [billId, creatorId]);
        if (q1.rows.length === 0) return [];
        
        const q2 = await pool.query('SELECT user_id, amount FROM group_funding_members WHERE group_funding_id = $1 AND status = $2', [billId, 'PENDING']);
        return q2.rows;
    }
};

module.exports = splitBillRepository;

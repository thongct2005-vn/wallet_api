function mapWalletRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        user_id: row.user_id,
        wallet_no: row.wallet_no,
        wallet_code: row.wallet_code,
        wallet_type: row.wallet_type,
        currency: row.currency,
        status: row.status,
        lock_reason: row.lock_reason,
        locked_at: row.locked_at,
        locked_by: row.locked_by,
        pin_failed_attempts: row.pin_failed_attempts,
        pin_locked_until: row.pin_locked_until,
        available_balance: Number(row.available_balance || 0),
        locked_balance: Number(row.locked_balance || 0),
        total_balance: Number(row.available_balance || 0) + Number(row.locked_balance || 0),
        balance_updated_at: row.balance_updated_at,
        user: {
            id: row.user_id,
            full_name: row.full_name,
            username: row.username,
            email: row.email,
            phone: row.phone,
            user_type: row.user_type,
            status: row.user_status
        },
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

module.exports = {
    mapWalletRow
};

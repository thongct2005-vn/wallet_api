
function mapUserRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        user_type: row.user_type,
        full_name: row.full_name,
        username: row.username,
        email: row.email,
        phone: row.phone,
        status: row.status,
        failed_login_attempts: row.failed_login_attempts,
        locked_until: row.locked_until,
        last_login_at: row.last_login_at,
        is_kyc_verified: row.is_kyc_verified,
        token_version: row.token_version,
        roles: row.roles || [],
        wallet: row.wallet_id ? {
            id: row.wallet_id,
            wallet_no: row.wallet_no,
            wallet_code: row.wallet_code,
            wallet_type: row.wallet_type,
            currency: row.currency,
            status: row.wallet_status,
            available_balance: Number(row.available_balance || 0),
            locked_balance: Number(row.locked_balance || 0),
            total_balance: Number(row.available_balance || 0) + Number(row.locked_balance || 0),
            updated_at: row.balance_updated_at
        } : null,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

module.exports = { mapUserRow };

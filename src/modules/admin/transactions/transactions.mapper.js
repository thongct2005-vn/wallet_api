function mapTopupRow(row) {
    return {
        id: row.id,
        deposit_no: row.deposit_no,
        user_id: row.user_id,
        user_name: row.full_name || null,
        user_phone: row.phone || null,
        wallet_id: row.wallet_id,
        amount: Number(row.amount || 0),
        currency: row.currency,
        deposit_method: row.deposit_method,
        external_reference: row.external_reference || null,
        status: row.status,
        failure_reason: row.failure_reason || null,
        description: row.description || null,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function mapTransferRow(row) {
    return {
        id: row.id,
        transfer_no: row.transfer_no,
        sender: {
            user_id: row.sender_user_id,
            user_name: row.sender_name || null,
            wallet_id: row.sender_wallet_id
        },
        receiver: {
            user_id: row.receiver_user_id,
            user_name: row.receiver_name || null,
            wallet_id: row.receiver_wallet_id
        },
        amount: Number(row.amount || 0),
        currency: row.currency,
        description: row.description || null,
        status: row.status,
        failure_reason: row.failure_reason || null,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function mapLedgerTransactionRow(row) {
    return {
        id: row.id,
        transaction_no: row.transaction_no,
        transaction_type: row.transaction_type,
        status: row.status,
        amount: Number(row.amount || 0),
        currency: row.currency,
        source_type: row.source_type || null,
        source_id: row.source_id || null,
        description: row.description || null,
        created_by: row.created_by || null,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

function mapLedgerEntryRow(row) {
    return {
        id: row.id,
        ledger_transaction_id: row.ledger_transaction_id,
        transaction_no: row.transaction_no || null,
        account_type: row.account_type,
        wallet_id: row.wallet_id || null,
        merchant_id: row.merchant_id || null,
        system_account_code: row.system_account_code || null,
        entry_type: row.entry_type,
        amount: Number(row.amount || 0),
        balance_before: Number(row.balance_before || 0),
        balance_after: Number(row.balance_after || 0),
        description: row.description || null,
        created_at: row.created_at
    };
}

module.exports = { mapTopupRow, mapTransferRow, mapLedgerTransactionRow, mapLedgerEntryRow };

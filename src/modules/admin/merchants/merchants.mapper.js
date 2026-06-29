const mapMerchantRow = (row) => ({
    id: row.id,
    merchant_code: row.merchant_code,
    merchant_name: row.merchant_name,
    business_type: row.business_type,
    email: row.email,
    phone: row.phone,
    status: row.status,
    created_at: row.created_at
});

const mapMerchantDetailRow = (row) => ({
    id: row.id,
    merchant_code: row.merchant_code,
    merchant_name: row.merchant_name,
    business_type: row.business_type,
    representative_name: row.representative_name,
    tax_code: row.tax_code,
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status,
    risk_note: row.risk_note,
    created_at: row.created_at,
    updated_at: row.updated_at
});

const mapApiKeyRow = (row) => {
    // Return only safe info, NO api_secret_hash or raw secret.
    const prefix = row.api_key ? row.api_key.substring(0, 8) + '...' : '';
    
    return {
        id: row.id,
        key_name: row.key_name,
        api_key_prefix: prefix,
        environment: row.environment,
        status: row.status,
        last_used_at: row.last_used_at,
        expired_at: row.expired_at,
        revoked_at: row.revoked_at,
        created_at: row.created_at
    };
};

module.exports = {
    mapMerchantRow,
    mapMerchantDetailRow,
    mapApiKeyRow
};

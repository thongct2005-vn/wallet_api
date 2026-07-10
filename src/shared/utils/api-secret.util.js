const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const ENC_PREFIX = 'enc:';

const getEncKey = () => {
    const hex = process.env.API_SECRET_ENC_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('System_Config_Error: API_SECRET_ENC_KEY phai la 64 hex chars');
    }
    return Buffer.from(hex, 'hex');
};

/**
 * Ma hoa API secret bang AES-256-GCM.
 * Format: "enc:<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
const encryptApiSecret = (rawSecret) => {
    const key = getEncKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(rawSecret, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return `${ENC_PREFIX}${iv.toString('hex')}:${tag}:${ciphertext}`;
};

/**
 * Giai ma API secret.
 * Tra ve null neu la format cu (HMAC one-way hash).
 */
const decryptApiSecret = (storedValue) => {
    if (!storedValue || !storedValue.startsWith(ENC_PREFIX)) {
        return null;
    }

    try {
        const withoutPrefix = storedValue.slice(ENC_PREFIX.length);
        const [ivHex, tagHex, ciphertext] = withoutPrefix.split(':');

        const key = getEncKey();
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null;
    }
};

/**
 * Xac minh HMAC signature cua request tu ben thu ba.
 *
 * Ben thu ba ky theo cong thuc:
 *   message   = "<timestamp>.<JSON.stringify(body)>"
 *   signature = HMAC_SHA256(message, raw_secret)
 *
 * Headers bat buoc: X-Timestamp, X-Signature
 */
const verifyHmacSignature = (timestamp, body, signature, rawSecret) => {
    // Chong replay attack: timestamp khong duoc qua 5 phut
    const TOLERANCE_MS = 5 * 60 * 1000;
    const ts = parseInt(timestamp, 10);

    if (isNaN(ts) || Math.abs(Date.now() - ts) > TOLERANCE_MS) {
        return { valid: false, reason: 'Timestamp het han (qua 5 phut)' };
    }

    const message = `${timestamp}.${JSON.stringify(body)}`;
    const expected = crypto
        .createHmac('sha256', rawSecret)
        .update(message)
        .digest('hex');

    try {
        const valid = crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expected, 'hex')
        );
        return { valid };
    } catch {
        return { valid: false, reason: 'Chu ky sai dinh dang' };
    }
};

module.exports = { encryptApiSecret, decryptApiSecret, verifyHmacSignature };

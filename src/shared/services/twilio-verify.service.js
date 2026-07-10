const twilio = require('twilio');

/**
 * Format phone number for Twilio starting with +84
 * @param {string} phone 
 * @returns {string}
 */
const formatPhoneForTwilio = (phone) => {
    if (!phone) return '';
    let formatted = phone.trim().replace(/[^0-9+]/g, '');
    if (formatted.startsWith('+84')) {
        return formatted;
    } else if (formatted.startsWith('84')) {
        return '+' + formatted;
    } else if (formatted.startsWith('0')) {
        return '+84' + formatted.substring(1);
    }
    return '+' + formatted;
};

const twilioVerifyService = {
    sendVerification: async ({ phone }) => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!accountSid || !authToken || !verifyServiceSid) {
            console.error(`[TWILIO VERIFY ERROR] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID.`);
            return {
                success: false,
                error_code: 'MISSING_CONFIG',
                error_message: 'Twilio Verify configuration is missing in environment variables.'
            };
        }

        try {
            const normalizedPhone = formatPhoneForTwilio(phone);
            const client = twilio(accountSid, authToken);

            const verification = await client.verify.v2.services(verifyServiceSid)
                .verifications
                .create({ to: normalizedPhone, channel: 'sms' });

            console.log(`[TWILIO VERIFY RESPONSE] To: ${normalizedPhone}, Status: ${verification.status}, SID: ${verification.sid}`);

            return {
                success: true,
                status: verification.status,
                sid: verification.sid
            };
        } catch (error) {
            console.error(`[TWILIO VERIFY ERROR] Exception when calling sendVerification for ${phone}. Code: ${error.code}, Message: ${error.message}`);
            return {
                success: false,
                error_code: error.code || 'TWILIO_VERIFY_ERROR',
                error_message: error.message
            };
        }
    },

    checkVerification: async ({ phone, code }) => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!accountSid || !authToken || !verifyServiceSid) {
            throw new Error('MISSING_CONFIG');
        }

        try {
            const normalizedPhone = formatPhoneForTwilio(phone);
            const client = twilio(accountSid, authToken);

            const verificationCheck = await client.verify.v2.services(verifyServiceSid)
                .verificationChecks
                .create({ to: normalizedPhone, code });

            console.log(`[TWILIO VERIFY CHECK RESPONSE] To: ${normalizedPhone}, Status: ${verificationCheck.status}`);

            if (verificationCheck.status === 'approved' || verificationCheck.valid === true) {
                return { success: true };
            } else {
                return { success: false, status: verificationCheck.status };
            }
        } catch (error) {
            console.error(`[TWILIO VERIFY CHECK ERROR] Exception when checking verification for ${phone}. Code: ${error.code}, Message: ${error.message}`);
            throw error;
        }
    },

    formatPhoneForTwilio
};

module.exports = twilioVerifyService;

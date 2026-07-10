const axios = require('axios');

/**
 * Format phone number to standard Vietnam format starting with 84
 * @param {string} phone 
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    let formatted = phone.trim().replace(/[^0-9+]/g, '');
    if (formatted.startsWith('+84')) {
        formatted = formatted.substring(1);
    } else if (formatted.startsWith('0')) {
        formatted = '84' + formatted.substring(1);
    }
    return formatted;
};

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

const sendSms = async ({ phone, content, requestId }) => {
    const isEnabled = process.env.SMS_ENABLED === 'true';
    const provider = process.env.SMS_PROVIDER || 'ESMS';
    const isSandbox = process.env.SMS_SANDBOX === 'true';

    // Format phone
    const formattedPhone = formatPhoneNumber(phone);
    
    // Mask phone for logging (e.g. 849****456 or 090****456)
    const maskedPhone = phone ? phone.substring(0, phone.length - 4).replace(/[0-9]/g, '*') + phone.substring(phone.length - 4) : 'UNKNOWN';

    if (!isEnabled || provider === 'MOCK') {
        console.log(`[SMS MOCK] RequestId: ${requestId || 'N/A'}`);
        console.log(`[SMS MOCK] To: ${maskedPhone} (Original: ${formattedPhone})`);
        console.log(`[SMS MOCK] Content: ${content}`);
        return {
            success: false,
            mocked: true,
            provider: 'MOCK',
            sandbox: isSandbox,
            message_id: `mock-${Date.now()}`,
            error_code: null,
            error_message: null
        };
    }

    if (provider === 'ESMS') {
        const apiKey = process.env.ESMS_API_KEY;
        const secretKey = process.env.ESMS_SECRET_KEY;
        const brandname = process.env.ESMS_BRANDNAME;
        const smsType = process.env.ESMS_SMS_TYPE || 2;

        if (!apiKey || !secretKey || !brandname) {
            console.error(`[SMS ERROR] Missing ESMS configuration keys.`);
            return {
                success: false,
                provider,
                sandbox: isSandbox,
                message_id: null,
                error_code: 'MISSING_CONFIG',
                error_message: 'ESMS configuration is missing in environment variables.'
            };
        }

        try {
            if (isSandbox) {
                console.log(`[SMS SANDBOX] Pretending to send via ESMS to ${maskedPhone}`);
                return {
                    success: false,
                    mocked: true,
                    provider: 'MOCK',
                    sandbox: true,
                    message_id: `sandbox-${Date.now()}`,
                    error_code: null,
                    error_message: null
                };
            }

            // Real SMS Call
            const response = await axios.get('http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get', {
                params: {
                    Phone: formattedPhone,
                    Content: content,
                    ApiKey: apiKey,
                    SecretKey: secretKey,
                    Brandname: brandname,
                    SmsType: smsType
                }
            });

            const data = response.data;
            
            // Securely log eSMS response without exposing keys
            console.log(`[SMS ESMS RESPONSE] To: ${maskedPhone}, CodeResult: ${data?.CodeResult}, ErrorMessage: ${data?.ErrorMessage || 'None'}, SMSID: ${data?.SMSID || 'None'}`);

            // eSMS usually returns CodeResult == '100' for success
            if (data && data.CodeResult === '100') {
                return {
                    success: true,
                    provider,
                    sandbox: false,
                    message_id: data.SMSID,
                    error_code: null,
                    error_message: null
                };
            } else {
                console.error(`[SMS ERROR] ESMS Provider returned error for ${maskedPhone}. Code: ${data?.CodeResult}, Error: ${data?.ErrorMessage}`);
                return {
                    success: false,
                    provider,
                    sandbox: false,
                    message_id: data?.SMSID || null,
                    error_code: data?.CodeResult || 'UNKNOWN_ERROR',
                    error_message: data?.ErrorMessage || 'Unknown error from ESMS'
                };
            }

        } catch (error) {
            console.error(`[SMS ERROR] Exception when calling ESMS for ${maskedPhone}:`, error.message);
            return {
                success: false,
                provider,
                sandbox: false,
                message_id: null,
                error_code: 'EXCEPTION',
                error_message: error.message
            };
        }
    }

    if (provider === 'TWILIO') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            console.error(`[SMS ERROR] Missing TWILIO configuration keys.`);
            return {
                success: false,
                mocked: false,
                provider: 'TWILIO',
                sandbox: isSandbox,
                message_id: null,
                error_code: 'MISSING_CONFIG',
                error_message: 'TWILIO configuration is missing in environment variables.'
            };
        }

        try {
            if (isSandbox) {
                console.log(`[SMS SANDBOX] Pretending to send via TWILIO to ${maskedPhone}`);
                return {
                    success: false,
                    mocked: true,
                    provider: 'TWILIO',
                    sandbox: true,
                    message_id: `sandbox-${Date.now()}`,
                    error_code: null,
                    error_message: null
                };
            }

            const twilioPhone = formatPhoneForTwilio(phone);
            const client = require('twilio')(accountSid, authToken);

            const message = await client.messages.create({
                body: content,
                from: fromNumber,
                to: twilioPhone
            });

            console.log(`[SMS TWILIO RESPONSE] To: ${maskedPhone}, Status: ${message.status}, SID: ${message.sid || 'None'}`);

            return {
                success: true,
                mocked: false,
                provider: 'TWILIO',
                message_id: message.sid,
                error_code: null,
                error_message: null
            };

        } catch (error) {
            console.error(`[SMS ERROR] Exception when calling TWILIO for ${maskedPhone}. Code: ${error.code}, Message: ${error.message}`);
            return {
                success: false,
                mocked: false,
                provider: 'TWILIO',
                message_id: null,
                error_code: error.code || 'TWILIO_ERROR',
                error_message: error.message
            };
        }
    }

    // Fallback for unsupported provider
    console.error(`[SMS ERROR] Unsupported SMS provider: ${provider}`);
    return {
        success: false,
        provider,
        sandbox: isSandbox,
        message_id: null,
        error_code: 'UNSUPPORTED_PROVIDER',
        error_message: `Provider ${provider} is not supported.`
    };
};

module.exports = {
    sendSms,
    formatPhoneNumber
};

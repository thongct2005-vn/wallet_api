const twilio = require('twilio');
require('dotenv').config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

const formatPhone = (phone) => {
  let p = String(phone).trim();
  if (p.startsWith('0')) return '+84' + p.slice(1);
  if (!p.startsWith('+')) return '+' + p;
  return p;
};

const sendOTP = async (phoneNumber) => {
  try {
    const formattedPhone = formatPhone(phoneNumber);
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms'
      });

    return {
      success: true,
      status: verification.status,
      message: 'OTP đã được gửi thành công'
    };
  } catch (error) {
    console.error('\n============== TWILIO SEND OTP ERROR ==============');
    console.error('Phone Number (Original):', phoneNumber);
    console.error('Error Code:', error.code);
    console.error('Error Status:', error.status);
    console.error('Error Message:', error.message);
    console.error('Full Error Object:', error);
    console.error('===================================================\n');
    return {
      success: false,
      message: error.message || 'Gửi OTP thất bại'
    };
  }
};

const verifyOTP = async (phoneNumber, code) => {
  try {
    const formattedPhone = formatPhone(phoneNumber);
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: formattedPhone,
        code: code
      });

    return {
      success: true,
      status: verificationCheck.status,
      valid: verificationCheck.valid
    };
  } catch (error) {
    console.error('Twilio Verify OTP Error:', error.message);
    return {
      success: false,
      message: error.message || 'Xác thực OTP thất bại'
    };
  }
};

module.exports = {
  sendOTP,
  verifyOTP
};
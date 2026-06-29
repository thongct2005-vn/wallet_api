const { failure } = require('../utils/response.util');

const ERROR_MAPPINGS = {
    // Auth & User Errors
    'Validation_Error': [400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ'],
    'Password_Confirm_Not_Match': [400, 'VALIDATION_ERROR', 'Mật khẩu xác nhận không khớp'],
    'Password_Policy_Invalid': [400, 'VALIDATION_ERROR', 'Mật khẩu phải có ít nhất 8 ký tự'],
    'User_Conflict': [409, 'CONFLICT', 'Số điện thoại, email hoặc username đã tồn tại'],
    'Email_Phone_Exists': [409, 'CONFLICT', 'Số điện thoại hoặc email đã tồn tại'],
    'Role_Not_Found': [500, 'RBAC_NOT_INITIALIZED', 'Role USER chưa được khởi tạo'],
    'Invalid_Credentials': [401, 'INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không chính xác'],
    'Account_Locked': [403, 'ACCOUNT_LOCKED', 'Tài khoản đang bị khóa tạm thời'],
    'Account_Locked_Now': [403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần'],
    'Account_Inactive': [403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa hoặc chưa kích hoạt'],
    'Invalid_Refresh_Token': [401, 'REFRESH_TOKEN_INVALID', 'Refresh token không hợp lệ'],
    'Refresh_Token_Expired': [401, 'REFRESH_TOKEN_INVALID', 'Refresh token đã hết hạn'],
    'Refresh_Token_Reused': [401, 'REFRESH_TOKEN_REUSED', 'Phát hiện refresh token đã được sử dụng lại'],
    'Password_Reset_Token_Invalid': [400, 'PASSWORD_RESET_TOKEN_INVALID', 'Reset token không hợp lệ hoặc đã hết hạn'],
    'Current_Password_Invalid': [400, 'CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại không chính xác'],
    'Password_Must_Be_Different': [400, 'PASSWORD_MUST_BE_DIFFERENT', 'Mật khẩu mới phải khác mật khẩu hiện tại'],
    'User_Not_Found': [404, 'NOT_FOUND', 'Không tìm thấy người dùng'],
    'OTP_Not_Found': [400, 'OTP_NOT_FOUND', 'Không tìm thấy yêu cầu OTP'],
    'OTP_Expired': [400, 'OTP_EXPIRED', 'OTP đã hết hạn'],
    'OTP_Invalid': [400, 'OTP_INVALID', 'Mã OTP không chính xác'],
    'OTP_Max_Attempts': [400, 'OTP_MAX_ATTEMPTS', 'Bạn đã nhập sai OTP quá nhiều lần'],
    'OTP_Already_Verified': [400, 'OTP_ALREADY_VERIFIED', 'OTP đã được xác minh'],
    'Phone_Verify_Required': [403, 'PHONE_VERIFY_REQUIRED', 'Yêu cầu xác minh số điện thoại'],
    'Face_Auth_Failed': [401, 'FACE_AUTH_FAILED', 'Xác thực khuôn mặt không thành công'],

    // Transaction & Security Errors
    'Wallet_Locked_PIN': [403, 'WALLET_LOCKED', 'Tài khoản tạm khóa trong 30 phút do nhập sai mã PIN quá 3 lần.'],
    'Wallet_Not_Found': [404, 'WALLET_NOT_FOUND', 'Không tìm thấy ví của bạn hoặc bạn chưa thiết lập mã PIN'],
    'Sender_Wallet_Not_Found': [404, 'WALLET_NOT_FOUND', 'Không tìm thấy ví của bạn hoặc bạn chưa thiết lập mã PIN'],
    'Receiver_Wallet_Not_Found': [404, 'RECEIVER_NOT_FOUND', 'Không tìm thấy ví người nhận (Sai SĐT/Email)'],
    'PIN_Required': [400, 'PIN_REQUIRED', 'Vui lòng cung cấp mã PIN'],
    'Face_Verification_Required': [403, 'FACE_REQUIRED', 'Yêu cầu hình ảnh quét khuôn mặt cho giao dịch từ 50 triệu trở lên'],
    'No_KYC_Record_Found': [403, 'KYC_REQUIRED', 'Không tìm thấy dữ liệu khuôn mặt KYC để đối chiếu. Vui lòng hoàn tất KYC.'],
    'Face_Verification_Failed': [403, 'FACE_FAILED', 'Xác thực khuôn mặt không trùng khớp với dữ liệu eKYC.'],
    'Bank_Insufficient_Balance': [400, 'BANK_INSUFFICIENT', 'Ngân hàng từ chối: Số dư thẻ/tài khoản không đủ.'],
    'Bank_Maintenance': [503, 'BANK_MAINTENANCE', 'Ngân hàng từ chối: Hệ thống đang bảo trì.'],
    'Insufficient_Balance': [400, 'INSUFFICIENT_BALANCE', 'Số dư trong ví không đủ để thực hiện giao dịch này.'],
    'Self_Transfer_Not_Allowed': [400, 'SELF_TRANSFER', 'Không thể tự chuyển tiền cho chính mình'],
    'Receiver_Not_KYC': [403, 'RECEIVER_NOT_KYC', 'Người nhận chưa xác thực danh tính (KYC). Giao dịch bị từ chối!'],
    'Invalid_Amount': [400, 'INVALID_AMOUNT', 'Số tiền không hợp lệ'],
    'Daily_Limit_Exceeded': [400, 'DAILY_LIMIT_EXCEEDED', 'Giao dịch vượt quá hạn mức nạp tiền trong ngày.'],
    
    // Auth Interceptor/Config
    'Auth_Config_Missing': [500, 'SERVER_ERROR', 'Lỗi cấu hình server bảo mật']
};

function errorHandler(err, req, res, next) {
    console.error(`[ERROR] ${req.method} ${req.url} -`, err.message);

    // Dynamic error handling like Wrong_PIN_2
    if (err.message && err.message.startsWith('Wrong_PIN_')) {
        const attemptsLeft = err.message.split('_')[2];
        return failure(req, res, 400, 'WRONG_PIN', `Mã PIN không chính xác, bạn còn ${attemptsLeft} lần thử.`);
    }

    const mappedError = ERROR_MAPPINGS[err.message];
    if (mappedError) {
        const [status, code, message] = mappedError;
        return failure(req, res, status, code, message);
    }

    // Default error
    return failure(req, res, 500, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống không xác định. Vui lòng thử lại sau.', err.message);
}

module.exports = errorHandler;

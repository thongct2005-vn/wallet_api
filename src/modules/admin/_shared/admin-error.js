const { error } = require('./admin-response');

function handleAdminError(res, err, logPrefix) {
    const mapping = {
        Validation_Error: [400, 'VALIDATION_ERROR', 'Thieu thong tin bat buoc'],
        Invalid_Id: [400, 'VALIDATION_ERROR', 'ID khong hop le'],
        Invalid_User_Id: [400, 'VALIDATION_ERROR', 'User ID khong hop le'],
        Invalid_Wallet_Id: [400, 'VALIDATION_ERROR', 'Wallet ID khong hop le'],
        Password_Policy_Invalid: [400, 'VALIDATION_ERROR', 'Mat khau phai co toi thieu 8 ky tu'],
        Password_Confirm_Not_Match: [400, 'VALIDATION_ERROR', 'Mat khau xac nhan khong khop'],
        Invalid_Date_Filter: [400, 'VALIDATION_ERROR', 'Bo loc thoi gian khong hop le'],
        Invalid_User_Type: [400, 'VALIDATION_ERROR', 'Loai user khong hop le'],
        Invalid_User_Status: [400, 'VALIDATION_ERROR', 'Trang thai user khong hop le'],
        User_Conflict: [409, 'CONFLICT', 'Username, email hoac so dien thoai da ton tai'],
        Role_Not_Found: [400, 'VALIDATION_ERROR', 'Role khong ton tai hoac khong hoat dong'],
        User_Not_Found: [404, 'USER_NOT_FOUND', 'Khong tim thay user'],
        Wallet_Not_Found: [404, 'WALLET_NOT_FOUND', 'Khong tim thay vi'],
        Transaction_Not_Found: [404, 'TRANSACTION_NOT_FOUND', 'Khong tim thay giao dich'],
        Topup_Not_Found: [404, 'TOPUP_NOT_FOUND', 'Khong tim thay giao dich nap tien'],
        Transfer_Not_Found: [404, 'TRANSFER_NOT_FOUND', 'Khong tim thay giao dich chuyen khoan'],
        Wallet_Closed: [409, 'WALLET_CLOSED', 'Vi da dong vinh vien'],
        Wallet_Already_Locked: [409, 'WALLET_ALREADY_LOCKED', 'Vi da bi khoa'],
        Wallet_Not_Locked: [409, 'WALLET_NOT_LOCKED', 'Vi khong o trang thai khoa'],
        Invalid_Merchant_Id: [400, 'VALIDATION_ERROR', 'Merchant ID khong hop le'],
        Invalid_Key_Id: [400, 'VALIDATION_ERROR', 'API Key ID khong hop le'],
        Merchant_Not_Found: [404, 'MERCHANT_NOT_FOUND', 'Khong tim thay merchant'],
        Merchant_Not_Active: [403, 'FORBIDDEN', 'Merchant chua duoc kich hoat hoac dang bi khoa'],
        Merchant_Already_Active: [409, 'CONFLICT', 'Merchant hien da o trang thai ACTIVE'],
        Merchant_Already_Rejected: [409, 'CONFLICT', 'Merchant hien da o trang thai REJECTED'],
        Merchant_Already_Suspended: [409, 'CONFLICT', 'Merchant hien da o trang thai SUSPENDED'],
        Api_Key_Not_Found: [404, 'NOT_FOUND', 'Khong tim thay API key'],
        Api_Key_Already_Revoked: [409, 'CONFLICT', 'API key da bi thu hoi'],
        Admin_Write_Forbidden: [403, 'FORBIDDEN', 'Tai khoan admin hien tai khong co quyen ghi'],
        Super_Admin_Required: [403, 'FORBIDDEN', 'Chi Super Admin duoc thuc hien thao tac nay'],
        Cannot_Lock_Self: [400, 'VALIDATION_ERROR', 'Khong the khoa chinh tai khoan dang dang nhap'],
        Cannot_Change_Own_Role: [400, 'VALIDATION_ERROR', 'Khong the tu thay doi role cua chinh minh'],
        Reason_Required: [400, 'VALIDATION_ERROR', 'Bat buoc nhap ly do thao tac'],
        No_Update_Field: [400, 'VALIDATION_ERROR', 'Khong co truong cap nhat hop le']
    };

    if (mapping[err.message]) {
        const [status, code, message] = mapping[err.message];
        return error(res, status, code, message);
    }

    console.error(logPrefix, err);
    return error(res, 500, 'INTERNAL_SERVER_ERROR', 'Loi he thong: ' + err.message);
}

module.exports = { handleAdminError };

/**
 * Cấu hình Multer tập trung cho toàn bộ hệ thống.
 * - Chỉ cho phép upload ảnh (JPEG, PNG, WebP)
 * - Giới hạn kích thước file tối đa 5MB
 * - Lưu file vào thư mục uploads/ với tên unique
 */
const multer = require('multer');
const path = require('path');

// Danh sách MIME type được phép upload
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Kích thước file tối đa (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Bộ lọc file: Chặn tất cả file không phải ảnh (chống upload mã độc .exe, .sh, .php, ...)
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Upload_Invalid_File_Type'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

module.exports = upload;

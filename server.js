require('dotenv').config();

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const express = require('express');
const morgan = require('morgan');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const swaggerSpec = require('./src/config/swagger');
const masterRouter = require('./src/routes');
const apiLogger = require('./src/middlewares/logger.middleware');
const errorHandler = require('./src/middlewares/error.middleware');
const { initSocket } = require('./src/utils/socket');
const connectMongoDB = require('./src/config/mongodb');

// Import Cron Jobs & Consumers
require('./src/cron/token_cleanup.cron');
require('./src/cron/loyaltySyncRetry.cron');
require('./src/modules/webhook/webhook.consumer');

const app = express();
const server = http.createServer(app);

// ==========================================
// 1. KHỞI TẠO HỆ THỐNG CƠ BẢN
// ==========================================
connectMongoDB();
initSocket(server);
app.set('trust proxy', 1); // Cần thiết cho Rate Limit khi deploy

// ==========================================
// 2. BẢO MẬT & PHÂN TÍCH BODY (Đặt lên cửa khẩu)
// ==========================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://admin.yourdomain.com',
        'https://merchant.yourdomain.com',
        'https://nonoily-overinfluential-deegan.ngrok-free.dev'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'Idempotency-Key']
}));
app.use(express.json());

// ==========================================
// 3. TÀI LIỆU API VÀ STATIC FILES
// ==========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 4. LOGGING & RATE LIMIT (Chỉ áp dụng cho API thật)
// ==========================================
app.use(morgan('dev')); // Log ra màn hình Console
app.use(apiLogger);     // Log vào MongoDB

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10000, // Tối đa 10000 requests mỗi 15 phút cho 1 IP (QUẢN LÝ ADMIN)
    message: { error: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(limiter);

// ==========================================
// 5. ĐIỀU HƯỚNG ROUTES CHÍNH
// ==========================================
app.use('/api/v1', masterRouter);

// ==========================================
// 6. XỬ LÝ NGOẠI LỆ (404 & Error Handler)
// ==========================================
app.use((req, res, next) => {
    res.status(404).json({ success: false, error_code: 'NOT_FOUND', message: 'API route not found' });
});

app.use(errorHandler); // Bắt các lỗi văng ra từ hệ thống

// ==========================================
// 7. KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server Node.js đang chạy tại cổng ${PORT}`);
});
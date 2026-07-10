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
require('./src/cron/profit.cron');
require('./src/modules/webhook/webhook.consumer');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
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
        'http://localhost:5174',
        'https://admin.yourdomain.com',
        'https://merchant.yourdomain.com',
        'https://nonoily-overinfluential-deegan.ngrok-free.dev'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'Idempotency-Key']
}));
app.use(express.json({ limit: '100kb' })); // [SECURITY FIX] Giới hạn body size chống Memory DoS

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
    limit: 500, // [SECURITY FIX] Giảm từ 10000 xuống 500 requests mỗi 15 phút cho 1 IP
    message: { error: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(limiter);

// ==========================================
// 5. ĐIỀU HƯỚNG ROUTES CHÍNH & PROXY
// ==========================================
const axios = require('axios');

const proxyToPort4000 = async (req, res, prefix) => {
    try {
        const url = `http://127.0.0.1:4000${prefix}${req.url}`;
        const headers = { ...req.headers };
        delete headers.host;
        
        const response = await axios({
            method: req.method,
            url: url,
            data: req.body,
            headers: headers
        });
        res.status(response.status).send(response.data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).send(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

app.use('/api/v1/wallets', (req, res) => proxyToPort4000(req, res, '/api/v1/wallets'));
app.use('/api/v1/orders', (req, res) => proxyToPort4000(req, res, '/api/v1/orders'));

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
server.listen(PORT, () => {
    console.log(`🚀 Server Node.js đang chạy tại cổng ${PORT}`);
});
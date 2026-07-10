/**
 * Admin Logs Repository
 * * Đã implement:
 * - listAuditLogs()
 * - findAuditLogById()
 * - listSystemLogs()
 * - getPaymentTrace()
 * - getApiLogs() (Dành cho tab giao diện)
 */
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const logsRepository = {
    // ==========================================
    // 1. AUDIT LOGS (Log nghiệp vụ)
    // ==========================================
    listAuditLogs: async ({ page = 1, limit = 20, actor_type, action, q }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = {};
        
        // Lọc theo Actor (USER, ADMIN, SYSTEM...) hoặc Action
        if (actor_type) query.actor_type = actor_type;
        if (action) query.action = action;
        
        // Tìm kiếm linh hoạt
        if (q) {
            query.$or = [
                { trace_id: { $regex: q, $options: 'i' } },
                { entity_id: { $regex: q, $options: 'i' } },
                { action: { $regex: q, $options: 'i' } },
                { actor_type: { $regex: q, $options: 'i' } },
                { actor_id: { $regex: q, $options: 'i' } },
                { entity_type: { $regex: q, $options: 'i' } }
            ];
        }
        
        const items = await db.collection('audit_logs')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('audit_logs').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    },

    findAuditLogById: async (id) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');
        
        if (!ObjectId.isValid(id)) throw new Error('Định dạng ID MongoDB không hợp lệ');
        
        return await db.collection('audit_logs').findOne({ _id: new ObjectId(id) });
    },

    // ==========================================
    // 2. SYSTEM LOGS (Log hệ thống & Lỗi kỹ thuật)
    // ==========================================
    listSystemLogs: async ({ page = 1, limit = 20, level, module, q }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = {};
        
        if (level) query.level = level; // INFO, WARN, ERROR, CRITICAL
        if (module) query.module = module;
        
        if (q) {
            query.$or = [
                { message: { $regex: q, $options: 'i' } },
                { trace_id: { $regex: q, $options: 'i' } },
                { event: { $regex: q, $options: 'i' } },
                { service_name: { $regex: q, $options: 'i' } }
            ];
        }
        
        const items = await db.collection('system_logs')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('system_logs').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    },

    // Alias giữ lại hàm cũ để không làm sập Frontend (LogManage.tsx)
    getSystemLogs: async (params) => {
        return logsRepository.listSystemLogs(params);
    },

    // ==========================================
    // 3. PAYMENT TRACES (Truy vết dòng tiền)
    // ==========================================
    getPaymentTrace: async ({ page = 1, limit = 20, trace_id, payment_no, q }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = {};
        
        const searchQuery = q || trace_id;
        
        if (searchQuery) {
            query.$or = [
                { trace_id: { $regex: searchQuery, $options: 'i' } },
                { entity_id: { $regex: searchQuery, $options: 'i' } },
                { event: { $regex: searchQuery, $options: 'i' } },
                { module: { $regex: searchQuery, $options: 'i' } }
            ];
        } else if (payment_no) {
            query.entity_id = { $regex: payment_no, $options: 'i' };
        }
        
        const items = await db.collection('trace_events')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('trace_events').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    },

    // Alias giữ lại hàm cũ để không làm sập Frontend
    getPaymentTraces: async (params) => {
        return logsRepository.getPaymentTrace(params);
    },

    // ==========================================
    // 4. API REQUEST LOGS (Dành cho Tab 1 Dashboard)
    // ==========================================
    getApiLogs: async ({ page = 1, limit = 20, q }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = q ? {
            $or: [
                { path: { $regex: q, $options: 'i' } },
                { method: { $regex: q, $options: 'i' } },
                { ip_address: { $regex: q, $options: 'i' } }
            ]
        } : {};
        
        const items = await db.collection('api_request_logs')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('api_request_logs').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    },

    // ==========================================
    // 5. WEBHOOK LOGS (Truy vết Webhook)
    // ==========================================
    getWebhookLogs: async ({ page = 1, limit = 20, q }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = {}; // Bỏ service_name vì bảng này chỉ chứa webhook log
        
        if (q) {
            query['metadata.transaction_id'] = { $regex: q, $options: 'i' };
        }
        
        const items = await db.collection('webhook_attempt_logs')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('webhook_attempt_logs').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    }
};

module.exports = logsRepository;
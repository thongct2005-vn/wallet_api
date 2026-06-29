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
        
        // Tìm kiếm linh hoạt theo Trace ID hoặc ID đối tượng
        if (q) {
            query.$or = [
                { trace_id: { $regex: q, $options: 'i' } },
                { entity_id: { $regex: q, $options: 'i' } }
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
                { event: { $regex: q, $options: 'i' } }
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
    getPaymentTrace: async ({ page = 1, limit = 20, trace_id, payment_no }) => {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Chưa kết nối MongoDB');

        const skip = (Math.max(1, page) - 1) * limit;
        const query = {};
        
        if (trace_id) {
            query.trace_id = { $regex: trace_id, $options: 'i' };
        } else if (payment_no) {
            // Fallback: Nếu Admin tìm bằng mã giao dịch, tìm trong entity_id
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
        const query = q ? { path: { $regex: q, $options: 'i' } } : {};
        
        const items = await db.collection('api_request_logs')
            .find(query).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray();
        const total = await db.collection('api_request_logs').countDocuments(query);
        
        return { items, total, page: Number(page), limit: Number(limit) };
    }
};

module.exports = logsRepository;
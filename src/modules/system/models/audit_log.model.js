const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    trace_id: { type: String, default: null }, // ID truy vết request
    actor_type: { type: String, required: true }, // USER / MERCHANT / ADMIN / SYSTEM
    actor_id: { type: String, default: null }, // ID actor
    action: { type: String, required: true }, // Tên hành động
    entity_type: { type: String, default: null }, // Loại đối tượng
    entity_id: { type: String, default: null }, // ID đối tượng
    old_data: { type: mongoose.Schema.Types.Mixed, default: null },
    new_data: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }, // Dữ liệu bổ sung
    reason: { type: String, default: null }, // Lý do
    ip_address: { type: String, default: null }, // IP client
    user_agent: { type: String, default: null }, // User agent
    created_at: { type: Date, default: Date.now }
});

// Indexes for fast querying
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ actor_type: 1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ trace_id: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');

module.exports = AuditLog;

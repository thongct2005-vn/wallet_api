const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    service_name: { type: String, required: true },
    log_level: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now }
});

// Indexes for fast querying
systemLogSchema.index({ created_at: -1 });
systemLogSchema.index({ service_name: 1, created_at: -1 });
systemLogSchema.index({ log_level: 1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema, 'system_logs');

module.exports = SystemLog;

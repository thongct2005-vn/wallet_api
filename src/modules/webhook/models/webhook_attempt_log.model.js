const mongoose = require('mongoose');

const webhookAttemptLogSchema = new mongoose.Schema({
    event_id: { type: String, required: true },
    event_type: { type: String, required: true },
    merchant_id: { type: String, required: true },
    payment_order_id: { type: String, required: true },
    payment_transaction_id: { type: String },
    refund_transaction_id: { type: String },
    callback_url: { type: String, required: true },
    request_headers: { type: mongoose.Schema.Types.Mixed },
    request_body: { type: mongoose.Schema.Types.Mixed },
    response_body: { type: mongoose.Schema.Types.Mixed },
    http_status: { type: Number },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], required: true },
    attempt_no: { type: Number, default: 0 },
    error_message: { type: String },
    duration_ms: { type: Number },
    sent_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
});

webhookAttemptLogSchema.index({ merchant_id: 1, created_at: -1 });
webhookAttemptLogSchema.index({ payment_order_id: 1 });
webhookAttemptLogSchema.index({ payment_transaction_id: 1 });
webhookAttemptLogSchema.index({ status: 1 });

const WebhookAttemptLog = mongoose.model('WebhookAttemptLog', webhookAttemptLogSchema, 'webhook_attempt_logs');

module.exports = WebhookAttemptLog;

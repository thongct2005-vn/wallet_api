const mongoose = require('mongoose');
const { v7: uuidv7 } = require('uuid');

const loyaltySyncLogSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv7 },
    payment_transaction_id: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' },
    retry_count: { type: Number, default: 0 },
    earned_points: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

loyaltySyncLogSchema.pre('save', function() {
    this.updated_at = Date.now();
});

loyaltySyncLogSchema.pre('findOneAndUpdate', function() {
    this.set({ updated_at: Date.now() });
});

loyaltySyncLogSchema.index({ status: 1, retry_count: 1 });
loyaltySyncLogSchema.index({ payment_transaction_id: 1 });

const LoyaltySyncLog = mongoose.model('LoyaltySyncLog', loyaltySyncLogSchema, 'loyalty_sync_logs');

module.exports = LoyaltySyncLog;

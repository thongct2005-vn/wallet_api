const mongoose = require('mongoose');

const traceEventSchema = new mongoose.Schema({
    trace_id: { type: String, required: true }, // Ledger Tx ID or Transaction ID
    entity_id: { type: String, required: true }, // Mã giao dịch (payment_no, ref)
    event_type: { type: String, required: true }, // PAYMENT, DEPOSIT, WITHDRAW, TRANSFER
    status: { type: String, required: true, default: 'SUCCESS' },
    amount: { type: String, default: '0' },
    actor: { type: String, default: null }, // ID của user thực hiện (nếu có)
    event: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now }
});

// Indexes for fast querying
traceEventSchema.index({ created_at: -1 });
traceEventSchema.index({ trace_id: 1 });
traceEventSchema.index({ entity_id: 1 });

const TraceEvent = mongoose.model('TraceEvent', traceEventSchema, 'trace_events');

module.exports = TraceEvent;

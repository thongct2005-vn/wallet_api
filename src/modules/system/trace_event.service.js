const TraceEvent = require('./models/trace_event.model');

const traceEventService = {
    /**
     * Ghi log sự kiện thanh toán/giao dịch vào collection trace_events
     * @param {Object} params - Tham số ghi log
     * @param {string} params.trace_id - ID vết (thường là transaction_id, ledger_tx_id)
     * @param {string} params.entity_id - Mã giao dịch (payment_no, ref)
     * @param {string} params.event_type - Loại sự kiện (PAYMENT, DEPOSIT, WITHDRAW, TRANSFER)
     * @param {string} params.status - Trạng thái (SUCCESS, FAILED)
     * @param {string|number|BigInt} params.amount - Số tiền
     * @param {string} params.actor - ID user thực hiện
     * @param {string} params.event - Ghi chú / Sự kiện
     * @param {Object} params.metadata - Dữ liệu mở rộng
     */
    logEvent: async ({ trace_id, entity_id, event_type, status = 'SUCCESS', amount = '0', actor = null, event = '', metadata = {} }) => {
        try {
            await TraceEvent.create({
                trace_id: String(trace_id),
                entity_id: String(entity_id),
                event_type: String(event_type),
                status: String(status),
                amount: String(amount),
                actor: actor ? String(actor) : null,
                event: String(event),
                metadata
            });
        } catch (error) {
            console.error('[TraceEventLog Error]', error);
        }
    }
};

module.exports = traceEventService;

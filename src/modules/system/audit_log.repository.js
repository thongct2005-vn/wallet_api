const mongoose = require('mongoose');
const { v7: uuidv7 } = require('uuid');

function collection() {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return null;
    return mongoose.connection.db.collection('audit_logs');
}

const auditLogRepository = {
    create: async ({
        traceId,
        actorType = 'SYSTEM',
        actorId,
        action,
        entityType,
        entityId,
        oldData,
        newData,
        metadata,
        reason,
        ipAddress,
        userAgent
    }) => {
        const auditCollection = collection();
        if (!auditCollection) return null;
        try {
            return await auditCollection.insertOne({
                trace_id: traceId || `trace-${uuidv7()}`,
                actor_type: actorType,
                actor_id: actorId ? String(actorId) : null,
                action,
                entity_type: entityType || null,
                entity_id: entityId ? String(entityId) : null,
                old_data: oldData || null,
                new_data: newData || null,
                metadata: metadata || null,
                reason: reason || null,
                ip_address: ipAddress || null,
                user_agent: userAgent || null,
                created_at: new Date()
            });
        } catch (error) {
            console.error('[AUDIT_LOG_ERROR]', error.message);
            return null;
        }
    },

    writeAuditLog: (actorId, action, entityType, entityId, oldData, newData, ipAddress) =>
        auditLogRepository.create({
            actorType: actorId ? 'USER' : 'SYSTEM',
            actorId,
            action,
            entityType,
            entityId,
            oldData,
            newData,
            ipAddress
        }),

    listByEntity: async ({ entityType, entityId, action, from, to, page = 1, pageSize = 20 }) => {
        const auditCollection = collection();
        if (!auditCollection) throw new Error('Mongo_Log_Unavailable');
        const safePage = Math.max(Number(page) || 1, 1);
        const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
        const filter = { entity_type: entityType, entity_id: String(entityId) };
        if (action) filter.action = action;
        if (from || to) {
            filter.created_at = {};
            if (from) filter.created_at.$gte = new Date(from);
            if (to) filter.created_at.$lte = new Date(to);
        }
        const [items, total] = await Promise.all([
            auditCollection.find(filter)
                .sort({ created_at: -1, _id: -1 })
                .skip((safePage - 1) * safePageSize)
                .limit(safePageSize)
                .toArray(),
            auditCollection.countDocuments(filter)
        ]);
        return {
            items,
            pagination: { page: safePage, page_size: safePageSize, total }
        };
    }
};

module.exports = auditLogRepository;

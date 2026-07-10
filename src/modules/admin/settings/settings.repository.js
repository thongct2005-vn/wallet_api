/**
 * Admin Settings Repository
 */
const pool = require('../../../config/db');

const settingsRepository = {
    listSettings: async () => {
        const result = await pool.query(`
            SELECT id, setting_key, setting_group, setting_value, value_type, description, is_sensitive, created_at, updated_at
            FROM app_settings
            ORDER BY setting_group ASC, setting_key ASC
        `);
        return result.rows;
    },

    findByKey: async (key) => {
        const result = await pool.query(`
            SELECT id, setting_key, setting_group, setting_value, value_type, description, is_sensitive
            FROM app_settings
            WHERE setting_key = $1
        `, [key]);
        return result.rows[0];
    },

    updateSetting: async (key, value) => {
        const result = await pool.query(`
            UPDATE app_settings
            SET setting_value = $1::jsonb, updated_at = NOW()
            WHERE setting_key = $2
            RETURNING id, setting_key, setting_group, setting_value, value_type, description, updated_at
        `, [JSON.stringify(value), key]);
        return result.rows[0];
    }
};

module.exports = settingsRepository;

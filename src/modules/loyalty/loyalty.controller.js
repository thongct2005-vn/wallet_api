const loyaltyService = require('./loyalty.service');
const pool = require('../../config/db');
const transactionRepository = require('../transaction/transaction.repository');

const loyaltyController = {
    getSummary: async (req, res) => {
        try {
            const userId = req.user.userId;
            const wallet = await transactionRepository.getWalletByUserId(userId);
            if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
            
            const summary = await loyaltyService.getSummary(wallet.id);
            res.json({ success: true, data: summary });
        } catch (error) {
            console.error('[LoyaltySummary] Error:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    getHistory: async (req, res) => {
        try {
            const userId = req.user.userId;
            const tab = req.query.tab || 'EARNED';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const wallet = await transactionRepository.getWalletByUserId(userId);
            if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

            const history = await loyaltyService.getHistory(wallet.id, tab, page, limit);
            res.json({ success: true, data: history });
        } catch (error) {
            console.error('[LoyaltyHistory] Error:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    getCheckinStatus: async (req, res) => {
        try {
            const userId = req.user.userId;
            const status = await loyaltyService.getCheckinStatus(userId);
            res.json({ success: true, data: status });
        } catch (error) {
            console.error('[LoyaltyCheckinStatus] Error:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    checkin: async (req, res) => {
        try {
            const userId = req.user.userId;
            const wallet = await transactionRepository.getWalletByUserId(userId);
            if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

            const result = await loyaltyService.checkin(userId, wallet.id);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[LoyaltyCheckin] Error:', error);
            res.status(400).json({ success: false, message: error.message || 'Lỗi server' });
        }
    }
};

module.exports = loyaltyController;

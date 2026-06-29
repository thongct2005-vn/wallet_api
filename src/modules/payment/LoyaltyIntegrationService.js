const axios = require('axios');
const { v7: uuidv7 } = require('uuid');
const pool = require('../../config/db');
const notificationRepository = require('../notification/notification.repository');
const admin = require('../../config/firebase');
const LoyaltySyncLog = require('./models/loyalty_sync_log.model');

// Mock URL for Loyalty API, fallback to a mock domain if not set
const LOYALTY_API_URL = process.env.LOYALTY_API_URL || 'https://mock-loyalty-api.com/api/points/sync';

const LoyaltyIntegrationService = {
    /**
     * Đồng bộ điểm Loyalty sau khi thanh toán thành công
     * Chạy ngầm (Background Job)
     */
    syncPointsAfterPayment: async (userId, paymentTransactionId, amount) => {
        // Khởi tạo log PENDING trong MongoDB
        const logId = uuidv7();
        try {
            await LoyaltySyncLog.create({
                _id: logId,
                payment_transaction_id: paymentTransactionId,
                amount: amount,
                status: 'PENDING'
            });
        } catch (error) {
            console.error('[LOYALTY_SYNC] Error inserting initial log:', error.message);
            return; // Lỗi DB khi ghi log thì dừng lại
        }

        await LoyaltyIntegrationService.executeLoyaltyApiCall(userId, paymentTransactionId, amount, logId);
    },

    /**
     * Gửi request lên Loyalty API và cập nhật trạng thái
     */
    executeLoyaltyApiCall: async (userId, paymentTransactionId, amount, logId, isRetry = false) => {
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            const walletRes = await client.query('SELECT w.id, wb.loyalty_points FROM wallets w JOIN wallet_balances wb ON w.id = wb.wallet_id WHERE w.user_id = $1 FOR UPDATE', [userId]);
            if (walletRes.rows.length === 0) {
                throw new Error('Wallet not found');
            }
            const walletId = walletRes.rows[0].id;
            const pointsStr = walletRes.rows[0].loyalty_points || 0;
            const pointsBefore = BigInt(Math.floor(Number(pointsStr)));

            // Tỷ lệ 100 VND = 1 Xu
            let earnedPoints = Math.floor(amount / 100); 

            if (earnedPoints > 0) {
                // Cộng Xu
                await client.query('UPDATE wallet_balances SET loyalty_points = loyalty_points + $1 WHERE wallet_id = $2', [earnedPoints, walletId]);
                const pointsAfter = pointsBefore + BigInt(earnedPoints);

                const transactionRepo = require('../transaction/transaction.repository');
                const loyaltyRepository = require('../loyalty/loyalty.repository');
                
                // Ghi nhận Sổ cái (Ledger) với currency = 'POINT'
                const ledgerTxId = await transactionRepo.createLedgerTransaction(
                    client, 
                    'LOYALTY_EARN', 
                    paymentTransactionId, 
                    'PAYMENT_ORDER', 
                    'Tích Xu từ giao dịch thanh toán', 
                    earnedPoints,
                    'POINT'
                );

                await transactionRepo.createLedgerEntry(
                    client,
                    ledgerTxId,
                    walletId,
                    'CREDIT',
                    earnedPoints,
                    pointsBefore,
                    pointsAfter
                );

                // Add to batches
                await loyaltyRepository.createBatch(client, walletId, earnedPoints, ledgerTxId, 6);
            }

            await client.query('COMMIT');

            // Thành công -> Cập nhật log
            await LoyaltySyncLog.updateOne(
                { _id: logId },
                { $set: { status: 'SUCCESS', earned_points: earnedPoints } }
            );

            // Bắn Push Notification
            await LoyaltyIntegrationService.sendPointsNotification(userId, earnedPoints, paymentTransactionId);

        } catch (error) {
            if (client) await client.query('ROLLBACK');
            console.error('[LOYALTY_SYNC] Error syncing points:', error.message);
            
            // Cập nhật trạng thái FAILED
            await LoyaltySyncLog.updateOne(
                { _id: logId },
                { 
                    $set: { status: 'FAILED' },
                    $inc: { retry_count: isRetry ? 1 : 0 }
                }
            );
        } finally {
            if (client) client.release();
        }
    },

    /**
     * Bắn push notification khi được cộng điểm
     */
    sendPointsNotification: async (userId, earnedPoints, paymentTransactionId) => {
        if (earnedPoints <= 0) return;

        const title = 'Tích Xu thành công!';
        const body = `Bạn đã được cộng ${earnedPoints} Xu từ giao dịch vừa rồi!`;

        try {
            // 1. Lưu thông báo vào bảng notifications
            await notificationRepository.createNotification(
                userId,
                title,
                body,
                'LOYALTY_POINTS',
                paymentTransactionId
            );

            // 2. Lấy danh sách thiết bị
            const activeTokens = await notificationRepository.getActiveTokensByUserId(userId);
            if (!activeTokens || activeTokens.length === 0) {
                return;
            }

            // 3. Gửi FCM
            const fcmPayload = {
                tokens: activeTokens,
                data: {
                    title: title,
                    body: body,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    type: 'LOYALTY_POINTS',
                    earned_points: String(earnedPoints),
                    timestamp: String(Date.now()),
                },
                android: {
                    priority: 'high',
                },
                apns: {
                    headers: {
                        'apns-priority': '10',
                    },
                    payload: {
                        aps: {
                            contentAvailable: true,
                            sound: 'default'
                        }
                    }
                }
            };

            await admin.messaging().sendEachForMulticast(fcmPayload);
        } catch (error) {
            console.error('[LOYALTY_SYNC] Push notification error:', error.message);
        }
    },

    /**
     * Cronjob: Gọi lại các log FAILED
     */
    retryFailedSyncs: async () => {
        let client;
        try {
            // Lấy các log FAILED và thử lại < 3 lần từ MongoDB
            const failedLogs = await LoyaltySyncLog.find({
                status: 'FAILED',
                retry_count: { $lt: 3 }
            }).limit(50);

            if (failedLogs.length > 0) {
                console.log(`[LOYALTY_SYNC_CRON] Found ${failedLogs.length} failed logs. Retrying...`);
            }

            if (failedLogs.length > 0) {
                client = await pool.connect();
            }

            for (const log of failedLogs) {
                // Lấy userId từ bảng payment_transactions dựa trên payment_transaction_id
                const txRes = await client.query(`
                    SELECT wallet_id FROM payment_transactions WHERE id = $1
                `, [log.payment_transaction_id]);

                if (txRes.rows.length === 0) continue;
                
                const walletId = txRes.rows[0].wallet_id;
                // Lấy userId từ wallet
                const walletRes = await client.query(`SELECT user_id FROM wallets WHERE id = $1`, [walletId]);
                if (walletRes.rows.length === 0) continue;
                
                const userId = walletRes.rows[0].user_id;

                // Gọi lại tích điểm
                await LoyaltyIntegrationService.executeLoyaltyApiCall(
                    userId, 
                    log.payment_transaction_id, 
                    log.amount, 
                    log._id, 
                    true // isRetry
                );
            }
        } catch (error) {
            console.error('[LOYALTY_SYNC_CRON] Error:', error.message);
        } finally {
            if (client) client.release();
        }
    },

    /**
     * ===== NEW: Redeem loyalty points for a scratch card =====
     */
    redeemPoints: async (userId, provider, faceValue) => {
        let client;
        try {
            const requiredPoints = Math.floor(faceValue * 0.95);
            if (requiredPoints <= 0) throw new Error('Invalid face value');

            client = await pool.connect();
            await client.query('BEGIN');

            // Lock wallet balance row
            const walletRes = await client.query('SELECT w.id, wb.loyalty_points FROM wallets w JOIN wallet_balances wb ON w.id = wb.wallet_id WHERE w.user_id = $1 FOR UPDATE', [userId]);
            if (walletRes.rows.length === 0) {
                throw new Error('Wallet_Not_Found');
            }
            
            const walletId = walletRes.rows[0].id;
            const pointsStr = walletRes.rows[0].loyalty_points || 0;
            const currentPoints = BigInt(Math.floor(Number(pointsStr)));
            const deductPoints = BigInt(requiredPoints);

            if (currentPoints < deductPoints) {
                throw new Error('Insufficient_Points');
            }

            const loyaltyRepository = require('../loyalty/loyalty.repository');

            // Spend points from batches (FIFO)
            await loyaltyRepository.spendPoints(client, walletId, requiredPoints);

            // Deduct Points
            await client.query('UPDATE wallet_balances SET loyalty_points = loyalty_points - $1 WHERE wallet_id = $2', [requiredPoints, walletId]);
            const pointsAfter = currentPoints - deductPoints;

            // Generate Mock Scratch Card
            const cardCode = Math.floor(10000000000000 + Math.random() * 90000000000000).toString(); // 14 digits
            const serial = Math.floor(10000000000 + Math.random() * 90000000000).toString(); // 11 digits

            const metadata = {
                provider,
                faceValue,
                card_code: cardCode,
                serial,
                type: 'SCRATCH_CARD'
            };

            const transactionRepo = require('../transaction/transaction.repository');
            
            // Create Ledger Transaction
            const ledgerTxId = await transactionRepo.createLedgerTransaction(
                client, 
                'LOYALTY_REDEEM', 
                null, // no payment_transaction reference needed for redeem
                'REDEEM_ORDER', 
                `Đổi thẻ cào ${provider} ${faceValue}đ`, 
                requiredPoints,
                'POINT',
                JSON.stringify(metadata)
            );

            // Double Entry for Redeem (User loses points, System gains points)
            await transactionRepo.createLedgerEntry(
                client,
                ledgerTxId,
                walletId,
                'DEBIT',
                requiredPoints,
                currentPoints,
                pointsAfter
            );

            await client.query('COMMIT');

            // Send Push Notification
            const title = 'Đổi thẻ cào thành công!';
            const body = `Bạn đã đổi thành công thẻ ${provider} ${faceValue}đ. Nhấn để xem mã thẻ.`;
            
            try {
                await notificationRepository.createNotification(
                    userId,
                    title,
                    body,
                    'LOYALTY_REDEEM',
                    ledgerTxId
                );

                const activeTokens = await notificationRepository.getActiveTokensByUserId(userId);
                if (activeTokens && activeTokens.length > 0) {
                    const fcmPayload = {
                        tokens: activeTokens,
                        data: {
                            title: title,
                            body: body,
                            click_action: 'FLUTTER_NOTIFICATION_CLICK',
                            type: 'LOYALTY_REDEEM',
                            ledger_tx_id: String(ledgerTxId),
                            timestamp: String(Date.now()),
                        },
                        android: { priority: 'high' }
                    };
                    await admin.messaging().sendEachForMulticast(fcmPayload);
                }
            } catch (notifyErr) {
                console.error('[LOYALTY_REDEEM] Notification error:', notifyErr.message);
            }

            return {
                transaction_id: ledgerTxId,
                provider,
                faceValue,
                cardCode,
                serial,
                deducted_points: requiredPoints,
                balance_points: pointsAfter.toString()
            };

        } catch (error) {
            if (client) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
    }
};

module.exports = LoyaltyIntegrationService;

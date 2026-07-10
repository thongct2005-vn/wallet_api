const crypto = require('crypto');
const pool = require('../../config/db');
const paymentRepo = require('./payment.repository');
const txRepo = require('../transaction/transaction.repository');
const traceEventService = require('../system/trace_event.service');
// [SECURITY FIX] Import hàm xác thực bảo mật giao dịch (PIN + FaceID)
const { verifyTransactionSecurity } = require('../../utils/security.util');
const kycService = require('../kyc/kyc.service');
const { broadcastToAdminDashboard } = require('../../utils/socket');

const paymentService = {
    createDynamicQR: async (merchantId, amount, callbackUrl, description, merchantOrderId = null) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const orderCode = `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
            const expiredAt = new Date(Date.now() + 15 * 60 * 1000);


            const orderId = await paymentRepo.createOrder(
                client, merchantId, orderCode, amount, callbackUrl, description, expiredAt, merchantOrderId
            );


            const qrToken = crypto.randomBytes(32).toString('hex');



            const qrContent = `mio://pay?token=${qrToken}&amount=${amount}&description=${encodeURIComponent(description || '')}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=L&data=${encodeURIComponent(qrContent)}`;

            // Lưu thông tin mã QR
            await paymentRepo.createQrCode(client, orderId, qrContent, qrToken, expiredAt);

            await client.query('COMMIT');

            return {
                // Định dạng chuẩn PayOS để dễ tích hợp
                orderCode: orderCode,
                amount: Number(amount),
                description: description || null,
                currency: 'VND',
                paymentLinkId: qrToken,
                status: 'PENDING',
                checkoutUrl: qrImageUrl,
                qrCode: qrContent,
                expiredAt: expiredAt,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    processQrPayment: async (userId, qrToken, pin, faceImagePath) => {
        // Xác thực PIN/FaceID TRƯỚC khi bắt đầu giao dịch (giống transfer/deposit)
        const walletForPin = await txRepo.getWalletForPinCheck(userId);
        if (!walletForPin) throw new Error('Wallet_Not_Found');

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const order = await paymentRepo.lockAndGetOrder(client, qrToken);

            if (!order) throw new Error('Order_Not_Found');
            if (order.status === 'CANCELED') throw new Error('Order_Canceled');
            if (order.status === 'EXPIRED') throw new Error('QR_Expired');
            if (new Date() > new Date(order.expired_at)) throw new Error('QR_Expired');
            if (order.status !== 'PENDING') throw new Error('Order_Already_Processed');

            // [SECURITY FIX] Xác thực bảo mật theo mức tiền (PIN < 30M, FaceID >= 30M)
            await verifyTransactionSecurity(order.amount, pin, faceImagePath, walletForPin, userId, txRepo, kycService);

            const wallet = await txRepo.getWalletByUserId(userId);
            if (!wallet) throw new Error('Wallet_Not_Found');

            // [SECURITY FIX] Kiểm tra hạn mức thanh toán trong ngày (50 triệu VND)
            const dailyTotal = await txRepo.getDailyTotal(wallet.id, 'PAYMENT');
            if (dailyTotal + BigInt(order.amount) > 50000000n) {
                throw new Error('Daily_Limit_Exceeded');
            }

            const balanceBefore = await txRepo.lockAndGetBalance(client, wallet.id);
            if (balanceBefore < order.amount) throw new Error('Insufficient_Balance');

            const balanceAfter = await txRepo.subtractBalance(client, wallet.id, order.amount);

            await paymentRepo.updateOrderStatus(client, order.order_id, 'PAID');
            await paymentRepo.updateQrCodeStatus(client, qrToken, 'USED');


            const { v7: uuidv7 } = require('uuid');
            const paymentTxId = uuidv7();

            const ledgerTxId = await txRepo.createLedgerTransaction(
                client, 'PAYMENT', paymentTxId, 'PAYMENT', 'Thanh toán đơn hàng QR', order.amount
            );



            await txRepo.createLedgerEntry(
                client, ledgerTxId, wallet.id, 'DEBIT', order.amount, balanceBefore, balanceAfter
            );


            await paymentRepo.createPaymentTransaction(
                client, order.order_id, userId, wallet.id, order.amount, paymentTxId
            );

            let updatedMerchantBalance = null;
            // [NEW] CREDIT TIỀN CHO MERCHANT VÀ THU PHÍ MDR
            if (order.merchant_id) {
                // TÍNH PHÍ MDR TỪ CẤU HÌNH
                let feeAmount = 0n;
                const orderAmountBig = BigInt(order.amount);
                let netAmount = orderAmountBig;
                const feeConfig = await paymentRepo.getFeeConfig('MERCHANT_MDR');

                if (feeConfig && feeConfig.fee_type === 'PERCENTAGE') {
                    const mdrRateFloat = parseFloat(feeConfig.fee_value);
                    feeAmount = BigInt(Math.round(Number(orderAmountBig) * mdrRateFloat));
                    netAmount = orderAmountBig - feeAmount;
                }

                // Cập nhật số dư vào merchant_balances (Thay vì wallet_balances cá nhân)
                const mBalanceBefore = await txRepo.lockAndGetMerchantBalance(client, order.merchant_id);
                const mBalanceAfter = await txRepo.addMerchantBalance(client, order.merchant_id, netAmount);
                updatedMerchantBalance = mBalanceAfter.toString();

                await txRepo.createLedgerEntry(
                    client, ledgerTxId, order.merchant_id, 'CREDIT', netAmount, mBalanceBefore, mBalanceAfter, 'MERCHANT'
                );

                // GHI NHẬN DOANH THU PHÍ HỆ THỐNG
                if (feeAmount > 0n) {
                    await txRepo.createSystemLedgerEntry(
                        client, ledgerTxId, 'SYS_FEE_MDR', 'CREDIT', feeAmount
                    );

                    // GHI LOG VÀO MONGODB
                    const SystemLog = require('../system/models/system_log.model');
                    SystemLog.create({
                        service_name: 'PaymentService',
                        log_level: 'INFO',
                        message: 'Thu phí MDR từ merchant',
                        action: 'COLLECT_MDR_FEE',
                        entity_type: 'PAYMENT_TRANSACTION',
                        entity_id: paymentTxId,
                        status: 'SUCCESS',
                        metadata: {
                            merchant_id: order.merchant_id,
                            order_id: order.order_id,
                            total_amount: order.amount.toString(),
                            fee_amount: feeAmount.toString(),
                            net_amount: netAmount.toString()
                        },
                        ip_address: 'system',
                        user_agent: 'payment.service'
                    }).catch(err => console.error('[MongoLog Error]', err));
                }
            }

            // [NEW] Insert Webhook Log into DB within the SAME ACID transaction
            let webhookLogId = null;
            let webhookPayload = null;
            const userRepo = require('../user/user.repository');
            const webhookService = require('../webhook/webhook.service');

            if (order.merchant_id) {
                let finalCallbackUrl = order.callback_url;
                if (!finalCallbackUrl) {
                    const merchantConfig = await webhookService.getMerchantSecret(order.merchant_id);
                    if (merchantConfig && merchantConfig.callback_url) {
                        finalCallbackUrl = merchantConfig.callback_url;
                    }
                }

                if (finalCallbackUrl) {
                    const userProfile = await userRepo.getUserProfile(userId);
                    webhookPayload = {
                        // Dữ liệu chuẩn (ưu tiên mã của Merchant truyền vào)
                        order_id: order.merchant_order_id || order.order_code,
                        merchant_order_id: order.merchant_order_id || null,
                        orderCode: order.order_code,
                        status: 'PAID',
                        amount: order.amount ? order.amount.toString() : '0',
                        wallet_transaction_id: paymentTxId.toString(),
                        phone_number: userProfile ? userProfile.phone : '',
                        callback_url: finalCallbackUrl
                    };

                    // Idempotency key using payment transaction ID to prevent duplicate logs
                    const idempotencyKey = `wh_${paymentTxId}`;

                    webhookLogId = await webhookService.createLog(
                        client,
                        order.merchant_id,
                        paymentTxId,
                        idempotencyKey,
                        webhookPayload
                    );
                }
            }

            await client.query('COMMIT');

            // [NEW] Emit realtime balance to merchant owner
            if (updatedMerchantBalance && order.merchant_id) {
                const merchantRepo = require('../merchant/merchant.repository');
                const ownerId = await merchantRepo.getMerchantUserId(order.merchant_id);
                if (ownerId) {
                    const { emitToUser } = require('../../utils/socket');
                    emitToUser(ownerId, 'merchant_balance_update', { newBalance: updatedMerchantBalance });
                }
            }

            // [NEW] Ghi log Payment Flow vào MongoDB
            traceEventService.logEvent({
                trace_id: ledgerTxId,
                entity_id: order.order_id,
                event_type: 'PAYMENT',
                status: 'SUCCESS',
                amount: order.amount.toString(),
                actor: userId,
                event: 'Thanh toán đơn hàng QR'
            });

            const resTxNo = await client.query('SELECT transaction_no FROM ledger_transactions WHERE id = $1', [ledgerTxId]);
            const transaction_no = resTxNo.rows[0].transaction_no;

            broadcastToAdminDashboard('DASHBOARD_UPDATE', {
                transaction_no,
                amount: parseInt(order.amount.toString(), 10),
                type: 'PAYMENT',
                status: 'SUCCESS',
                timestamp: new Date().toISOString()
            });

            // ==========================================
            // 🚀 BẮT ĐẦU BACKGROUND JOBS SAU KHI ĐÃ COMMIT
            // ==========================================

            // 1. Tích điểm Loyalty ngầm (Không await)
            const LoyaltyIntegrationService = require('./LoyaltyIntegrationService');
            LoyaltyIntegrationService.syncPointsAfterPayment(userId, paymentTxId, order.amount)
                .catch(err => console.error('[LOYALTY_BACKGROUND_JOB_ERROR]', err.message));

            // 2. Đẩy Job Gửi Webhook vào Message Queue (BullMQ / Redis) với cơ chế Retry
            if (webhookLogId) {
                const webhookPublisher = require('../webhook/webhook.publisher');
                webhookPublisher.publish({
                    logId: webhookLogId,
                    merchantId: order.merchant_id,
                    payload: webhookPayload,
                    callbackUrl: webhookPayload.callback_url
                }).catch(err => console.error('[WEBHOOK_PUBLISH_ERROR]', err));
            }

            return {
                order_id: order.merchant_order_id || order.order_code,
                merchant_order_id: order.merchant_order_id || null,
                order_code: order.order_code,
                amount_paid: order.amount ? order.amount.toString() : '0',
                balance_remaining: balanceAfter ? balanceAfter.toString() : '0'
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // Tạo mã QR "nhận tiền" cho người dùng thường (không cần merchant key)
    createUserQR: async (amount, description, userPhone, userName) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const orderCode = 'REQ' + Date.now() + Math.floor(Math.random() * 1000);
            const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

            const orderId = await paymentRepo.createUserOrder(
                client, orderCode, amount, description, expiredAt
            );

            const qrToken = crypto.randomBytes(32).toString('hex');
            const qrContent = `mio://pay?token=${qrToken}&amount=${amount}&description=${encodeURIComponent(description || '')}&phone=${encodeURIComponent(userPhone || '')}&name=${encodeURIComponent(userName || '')}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=L&data=${encodeURIComponent(qrContent)}`;

            await paymentRepo.createQrCode(client, orderId, qrContent, qrToken, expiredAt);

            await client.query('COMMIT');

            return {
                order_code: orderCode,
                amount: amount,
                description: description || null,
                qr_content: qrContent,
                qr_token: qrToken,
                qr_image_url: qrImageUrl,
                expired_at: expiredAt
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ===== NEW: Xử lý Auto-Debit (Thanh toán tự động qua Ví Liên kết) =====
    processAutoDebit: async (merchantUserId, merchantId, userPhone, amount, merchantOrderId, walletToken) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Tìm User theo số điện thoại
            const merchantRepo = require('../merchant/merchant.repository');
            const userId = await merchantRepo.findUserByPhone(userPhone);
            if (!userId) throw new Error('Wallet_Not_Found');

            // Kiểm tra user đã ủy quyền auto-debit cho merchant này chưa
            const linkCheck = await client.query(`
                SELECT id, status, limit_per_transaction, limit_per_day
                FROM user_linked_services
                WHERE user_id = $1 AND wallet_token = $2 AND status = 'ACTIVE'
                LIMIT 1
            `, [userId, walletToken]);
            if (linkCheck.rows.length === 0) {
                throw new Error('Auto_Debit_Not_Authorized');
            }
            const linkedService = linkCheck.rows[0];
            // Kiểm tra hạn mức mỗi giao dịch
            const txLimitStr = linkedService.limit_per_transaction || 5000000;
            const txLimit = BigInt(Math.floor(Number(txLimitStr)));
            if (amount > txLimit) {
                throw new Error('Auto_Debit_Transaction_Limit_Exceeded');
            }

            // 2. Lấy thông tin Ví của User
            const userWallet = await txRepo.getWalletByUserId(userId);
            if (!userWallet) throw new Error('Wallet_Not_Found');

            // 3. Kiểm tra số dư User
            const balanceBefore = await txRepo.lockAndGetBalance(client, userWallet.id);
            if (balanceBefore < amount) throw new Error('Insufficient_Balance');

            // 4. Trừ tiền User
            const balanceAfter = await txRepo.subtractBalance(client, userWallet.id, amount);

            // 5. Tạo Order tự động (Thành công luôn)
            const orderCode = `AD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

            const expiredAt = new Date(Date.now() + 15 * 60 * 1000);
            const orderId = await paymentRepo.createOrder(
                client, merchantId, orderCode, amount, null, 'Auto-Debit Thanh toán', expiredAt, merchantOrderId
            );
            await paymentRepo.updateOrderStatus(client, orderId, 'PAID');

            // 6. Ghi chép Ledger cho User (DEBIT)
            const { v7: uuidv7 } = require('uuid');
            const paymentTxId = uuidv7();
            const ledgerTxId = await txRepo.createLedgerTransaction(
                client, 'PAYMENT', paymentTxId, 'PAYMENT', 'Thanh toán tự động ' + merchantOrderId, amount
            );
            await txRepo.createLedgerEntry(client, ledgerTxId, userWallet.id, 'DEBIT', amount, balanceBefore, balanceAfter);

            // 7. Cộng tiền cho Merchant và thu phí MDR
            let feeAmount = 0n;
            const orderAmountBig = BigInt(amount);
            let netAmount = orderAmountBig;
            const feeConfig = await paymentRepo.getFeeConfig('MERCHANT_MDR');

            if (feeConfig && feeConfig.fee_type === 'PERCENTAGE') {
                const mdrRateFloat = parseFloat(feeConfig.fee_value);
                feeAmount = BigInt(Math.round(Number(orderAmountBig) * mdrRateFloat));
                netAmount = orderAmountBig - feeAmount;
            }

            const mBalanceBefore = await txRepo.lockAndGetMerchantBalance(client, merchantId);
            const mBalanceAfter = await txRepo.addMerchantBalance(client, merchantId, netAmount);
            const updatedMerchantBalance = mBalanceAfter.toString();

            await txRepo.createLedgerEntry(
                client, ledgerTxId, merchantId, 'CREDIT', netAmount, mBalanceBefore, mBalanceAfter, 'MERCHANT'
            );

            // Thu phí MDR
            if (feeAmount > 0n) {
                await txRepo.createSystemLedgerEntry(
                    client, ledgerTxId, 'SYS_FEE_MDR', 'CREDIT', feeAmount
                );
            }

            // 8. Lưu Transaction
            await paymentRepo.createPaymentTransaction(client, orderId, userId, userWallet.id, amount, paymentTxId);

            await client.query('COMMIT');

            // [NEW] Emit realtime balance to merchant owner
            if (updatedMerchantBalance && merchantId) {
                const ownerId = await merchantRepo.getMerchantUserId(merchantId);
                if (ownerId) {
                    const { emitToUser } = require('../../utils/socket');
                    emitToUser(ownerId, 'merchant_balance_update', { newBalance: updatedMerchantBalance });
                }
            }

            const resTxNo = await client.query('SELECT transaction_no FROM ledger_transactions WHERE id = $1', [ledgerTxId]);
            const transaction_no = resTxNo.rows[0].transaction_no;

            broadcastToAdminDashboard('DASHBOARD_UPDATE', {
                transaction_no,
                amount: parseInt(amount.toString(), 10),
                type: 'PAYMENT',
                status: 'SUCCESS',
                timestamp: new Date().toISOString()
            });

            return {
                order_id: merchantOrderId,
                amount_paid: amount,
                status: 'PAID'
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = paymentService;
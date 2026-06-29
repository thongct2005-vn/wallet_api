const crypto = require('crypto');
const pool = require('../../config/db');
const paymentRepo = require('./payment.repository');
const txRepo = require('../transaction/transaction.repository');
const traceEventService = require('../system/trace_event.service');

const paymentService = {
    createDynamicQR: async (merchantId, amount, callbackUrl, description, merchantOrderId = null) => {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            
            const orderCode = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
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

    processQrPayment: async (userId, qrToken) => {
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); 

            
            const order = await paymentRepo.lockAndGetOrder(client, qrToken);
            
            if (!order) throw new Error('Order_Not_Found');
            if (new Date() > new Date(order.expired_at)) throw new Error('QR_Expired');
            if (order.status !== 'PENDING') throw new Error('Order_Already_Processed');

            
            const wallet = await txRepo.getWalletByUserId(userId);
            if (!wallet) throw new Error('Wallet_Not_Found');

            
            const balanceBefore = await txRepo.lockAndGetBalance(client, wallet.id);
            if (balanceBefore < order.amount) throw new Error('Insufficient_Balance');

            
            const balanceAfter = await txRepo.subtractBalance(client, wallet.id, order.amount);

            
            await paymentRepo.updateOrderStatus(client, order.order_id, 'SUCCESS');

            
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

            // [NEW] CREDIT TIỀN CHO MERCHANT VÀ THU PHÍ MDR
            if (order.merchant_id) {
                const merchantRepo = require('../merchant/merchant.repository');
                const merchantUserId = await merchantRepo.getMerchantUserId(order.merchant_id);
                
                if (merchantUserId) {
                    const merchantWallet = await txRepo.getWalletByUserId(merchantUserId);
                    if (merchantWallet) {
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

                        const mBalanceBefore = await txRepo.lockAndGetBalance(client, merchantWallet.id);
                        const mBalanceAfter = await txRepo.addBalance(client, merchantWallet.id, netAmount);
                        
                        await txRepo.createLedgerEntry(
                            client, ledgerTxId, merchantWallet.id, 'CREDIT', netAmount, mBalanceBefore, mBalanceAfter, 'MERCHANT'
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
                }
            }

            // [NEW] Insert Webhook Log into DB within the SAME ACID transaction
            let webhookLogId = null;
            let webhookPayload = null;
            const userRepo = require('../user/user.repository');
            const webhookService = require('../webhook/webhook.service');
            
            if (order.merchant_id) {
                const userProfile = await userRepo.getUserProfile(userId);
                webhookPayload = {
                    // Dữ liệu chuẩn (ưu tiên mã của Merchant truyền vào)
                    order_id: order.merchant_order_id || order.order_code,
                    merchant_order_id: order.merchant_order_id || null,
                    orderCode: order.order_code,
                    status: 'success',
                    amount: order.amount ? order.amount.toString() : '0',
                    wallet_transaction_id: paymentTxId.toString(),
                    phone_number: userProfile ? userProfile.phone : ''
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

            await client.query('COMMIT'); 

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
                    callbackUrl: order.callback_url
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
    }
};

module.exports = paymentService;
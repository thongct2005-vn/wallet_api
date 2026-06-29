const admin = require('../../config/firebase');
const notificationRepository = require('./notification.repository');

const notificationService = {
    /**
     * Send balance change notification to a user's registered devices
     * @param {string} userId - User UUID
     * @param {number|string} amount - Balance change amount
     * @param {string} transactionType - DEPOSIT, WITHDRAWAL, TRANSFER_SEND, TRANSFER_RECEIVE
     * @param {string} [referenceId=null] - Optional reference UUID of transaction
     */
    sendBalanceChangeNotification: async (userId, amount, transactionType, referenceId = null, extraInfo = null) => {
        // 1. Prepare notification text
        const amountFormatted = Number(amount).toLocaleString('vi-VN') + ' VND';
        let title = 'Biến động số dư';
        let body = '';

        switch (transactionType) {
            case 'DEPOSIT':
                title = 'Tài khoản Đã Được Nạp Tiền';
                body = `+${amountFormatted} vào tài khoản của bạn.`;
                break;
            case 'WITHDRAWAL':
                title = 'Giao dịch Rút Tiền Thành Công';
                body = `-${amountFormatted} từ tài khoản của bạn.`;
                break;
            case 'TRANSFER_SEND':
                title = 'Giao dịch Chuyển Tiền';
                body = `-${amountFormatted} đến ${extraInfo || 'người nhận'}.`;
                break;
            case 'TRANSFER_RECEIVE':
                title = 'Tài khoản Nhận Tiền';
                body = `+${amountFormatted} từ ${extraInfo || 'người gửi'}.`;
                break;
            case 'SPLIT_BILL_REMIND':
                title = 'Nhắc nhở thanh toán tiền chia';
                body = `Bạn có một khoản tiền ${amountFormatted} cần thanh toán cho ${extraInfo || 'người tạo'}.`;
                break;
            default:
                body = `Số dư tài khoản thay đổi ${amountFormatted}.`;
        }

        // 2. Query active FCM tokens for this user
        const activeTokens = await notificationRepository.getActiveTokensByUserId(userId);
        console.log(`Found ${activeTokens.length} active token(s) for user: ${userId}`);

        // 3. Insert notification into history (Always log in-app notification)
        const notificationRecord = await notificationRepository.createNotification(
            userId,
            title,
            body,
            'TRANSACTION',
            referenceId
        );

        if (!activeTokens || activeTokens.length === 0) {
            return { success: true, sentDevices: 0, notification: notificationRecord };
        }

        // 4. Construct FCM message payload optimized for killed/background states
        // We use a "data-only" payload combined with high priority headers to force-wake the app.
        // For iOS, contentAvailable: true and apns-priority: 10 are used.
        // For Android, priority: 'high' is used.
        const fcmPayload = {
            tokens: activeTokens,
            notification: {
                title: title,
                body: body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                type: 'BALANCE_CHANGE',
                amount: String(amount),
                transactionType: transactionType,
                referenceId: referenceId ? String(referenceId) : '',
                timestamp: String(Date.now()),
            },
            android: {
                priority: 'high',
                ttl: 24 * 60 * 60 * 1000, // 24 hours time-to-live
                notification: {
                    channelId: 'wallet_balance_channel_id',
                    sound: 'default'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        try {
            // 5. Send multicast message
            const response = await admin.messaging().sendEachForMulticast(fcmPayload);
            console.log(`FCM Multicast sent: ${response.successCount} success, ${response.failureCount} failed.`);

            const tokensToDelete = [];

            // 6. Inspect errors to delete stale/invalid tokens
            response.responses.forEach((res, index) => {
                if (!res.success) {
                    const token = activeTokens[index];
                    const error = res.error;
                    console.warn(`FCM delivery failed for token ${token.substring(0, 10)}...: ${error.code} - ${error.message}`);
                    
                    // Firebase FCM invalid token error codes
                    const invalidTokenErrors = [
                        'messaging/invalid-argument',
                        'messaging/invalid-registration-token',
                        'messaging/registration-token-not-registered',
                    ];

                    if (invalidTokenErrors.includes(error.code) || 
                        error.message.includes('registration-token-not-registered') ||
                        error.message.includes('invalid-registration-token')) {
                        tokensToDelete.push(token);
                    }
                }
            });

            // 7. Perform batch cleanup of invalid tokens
            if (tokensToDelete.length > 0) {
                console.log(`Cleaning up ${tokensToDelete.length} invalid token(s)...`);
                await Promise.all(tokensToDelete.map(token => 
                    notificationRepository.deleteDeviceToken(token)
                ));
            }

            return {
                success: true,
                sentDevices: response.successCount,
                failedDevices: response.failureCount,
                notification: notificationRecord
            };
        } catch (error) {
            console.error('Error sending multicast message via FCM:', error);
            // Even if FCM fails, we already successfully saved the notification to history.
            return {
                success: false,
                error: error.message,
                notification: notificationRecord
            };
        }
    },

    /**
     * Send chat message notification
     */
    sendChatMessageNotification: async (receiverUserId, senderName, messageContent, referenceId = null) => {
        const title = senderName ? `Tin nhắn mới từ ${senderName}` : 'Tin nhắn mới';
        const body = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent;

        const activeTokens = await notificationRepository.getActiveTokensByUserId(receiverUserId);

        const notificationRecord = await notificationRepository.createNotification(
            receiverUserId,
            title,
            body,
            'CHAT',
            referenceId
        );

        if (!activeTokens || activeTokens.length === 0) {
            return { success: true, sentDevices: 0, notification: notificationRecord };
        }

        const fcmPayload = {
            tokens: activeTokens,
            notification: {
                title: title,
                body: body,
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                type: 'CHAT_MESSAGE',
                referenceId: referenceId ? String(referenceId) : '',
                timestamp: String(Date.now()),
            },
            android: {
                priority: 'high',
                ttl: 24 * 60 * 60 * 1000,
                notification: {
                    channelId: 'wallet_balance_channel_id',
                    sound: 'default'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(fcmPayload);
            const tokensToDelete = [];

            response.responses.forEach((res, index) => {
                if (!res.success) {
                    const token = activeTokens[index];
                    const error = res.error;
                    const invalidTokenErrors = [
                        'messaging/invalid-argument',
                        'messaging/invalid-registration-token',
                        'messaging/registration-token-not-registered',
                    ];
                    if (invalidTokenErrors.includes(error.code) || 
                        error.message.includes('registration-token-not-registered') ||
                        error.message.includes('invalid-registration-token')) {
                        tokensToDelete.push(token);
                    }
                }
            });

            if (tokensToDelete.length > 0) {
                await Promise.all(tokensToDelete.map(token => 
                    notificationRepository.deleteDeviceToken(token)
                ));
            }

            return {
                success: true,
                sentDevices: response.successCount,
                failedDevices: response.failureCount,
                notification: notificationRecord
            };
        } catch (error) {
            console.error('Error sending chat push notification:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = notificationService;

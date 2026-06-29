const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Middleware xác thực socket bằng JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.userId || socket.user.id;
        console.log(`User connected: ${userId} (Socket ID: ${socket.id})`);

        // Mỗi user tham gia vào một room riêng dựa trên userId
        socket.join(`user_${userId}`);

        socket.on('send_message', async (data) => {
            console.log('--- Socket send_message received ---', data);
            try {
                const transactionRepository = require('../modules/transaction/transaction.repository');
                const senderWallet = await transactionRepository.getWalletByUserId(userId);
                const receiverWallet = await transactionRepository.getWalletByIdentifier(data.receiverPhone);

                if (!senderWallet || !receiverWallet) {
                    return socket.emit('error', { message: 'Không tìm thấy người dùng hợp lệ' });
                }

                const messageType = data.messageType || 'TEXT';
                const msg = await transactionRepository.saveChatMessage(senderWallet.id, receiverWallet.id, data.content, messageType);
                
                // Format msg để đồng nhất với API
                const formattedMsg = {
                    id: msg.id,
                    amount: "0",
                    note: msg.content,
                    created_at: msg.created_at.toISOString(),
                    message_type: messageType
                };

                // Gửi cho người nhận qua socket (Realtime)
                io.to(`user_${receiverWallet.user_id}`).emit('receive_message', {
                    ...formattedMsg,
                    direction: 'RECEIVE',
                    counterparty_name: senderWallet.full_name || 'Người lạ',
                    counterparty_phone: senderWallet.phone || ''
                });

                // Chuẩn bị nội dung cho push notification
                let notificationContent = data.content;
                if (messageType === 'RED_PACKET') {
                    notificationContent = 'Đã gửi một bao lì xì 🧧';
                }

                // Gửi Push Notification (FCM) cho người nhận
                const notificationService = require('../modules/notification/notification.service');
                notificationService.sendChatMessageNotification(
                    receiverWallet.user_id,
                    senderWallet.full_name,
                    notificationContent,
                    msg.id
                ).catch(err => console.error("Lỗi gửi push notification chat:", err));

                // Gửi lại cho người gửi (để xác nhận đã lưu thành công)
                socket.emit('receive_message', {
                    ...formattedMsg,
                    direction: 'SEND',
                    counterparty_name: receiverWallet.full_name,
                    counterparty_phone: data.receiverPhone
                });

            } catch (error) {
                console.error("Socket send_message error:", error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

module.exports = { initSocket, getIo, emitToUser };

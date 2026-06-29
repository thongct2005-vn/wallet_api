const pool = require('../../config/db');
const walletRepository = require('../wallet/wallet.repository');
const transactionRepo = require('../transaction/transaction.repository');

const TopupService = {
    processTopup: async (userId, data) => {
        const { type, provider, phone, amount, dataPackageId } = data;

        // Mock checking wallet balance
        const wallet = await walletRepository.findByUserId(userId);
        if (!wallet) throw new Error('Wallet_Not_Found');

        const topupAmount = BigInt(amount);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const currentBalance = await transactionRepo.lockAndGetBalance(client, wallet.id);
            if (currentBalance < topupAmount) {
                throw new Error('Insufficient_Balance');
            }

            // 1. Cập nhật số dư Ví
            const balanceAfter = await transactionRepo.subtractBalance(client, wallet.id, topupAmount);
            const newBalance = balanceAfter.toString();

            // 2. Tạo giao dịch sổ cái (Ledger)
            let description = '';
            if (type === 'CARD') {
                description = `Mua mã thẻ ${provider} ${amount}đ`;
            } else if (type === 'DATA') {
                description = `Nạp gói data ${provider} cho ${phone}`;
            } else {
                description = `Nạp tiền điện thoại ${phone} - ${amount}đ`;
            }

            // 2. Record history cho AI
            const { v7: uuidv7 } = require('uuid');
            const orderId = uuidv7();
            const transactionId = uuidv7();

            const createOrderQuery = `
                INSERT INTO payment_orders (id, payment_no, amount, description, status, expired_at, idempotency_key)
                VALUES ($1, $2, $3, $4, 'COMPLETED', CURRENT_TIMESTAMP + interval '15 minutes', $5)
            `;
            await client.query(createOrderQuery, [orderId, 'TOPUP_' + Date.now(), amount, description, orderId]);

            const createPaymentTx = `
                INSERT INTO payment_transactions 
                (id, payment_order_id, payer_user_id, payer_wallet_id, amount, status, paid_at, idempotency_key)
                VALUES ($1, $2, $3, $4, $5, 'SUCCESS', CURRENT_TIMESTAMP, $6)
            `;
            await client.query(createPaymentTx, [transactionId, orderId, userId, wallet.id, amount, transactionId]);

            // Generate mock card code if type is CARD
            let cardCode = null;
            let serial = null;
            let metadata = null;
            if (type === 'CARD') {
                cardCode = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
                serial = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
                metadata = JSON.stringify({
                    card_code: cardCode,
                    serial: serial,
                    provider: provider,
                    face_value: amount
                });
            }

            // 3. Tạo giao dịch sổ cái (Ledger)
            const ledgerId = await transactionRepo.createLedgerTransaction(
                client,
                'PAYMENT',
                transactionId,
                'PAYMENT',
                description,
                topupAmount,
                'VND',
                metadata
            );

            // 4. Tạo bút toán (Ledger entries)
            await transactionRepo.createLedgerEntry(
                client,
                ledgerId,
                wallet.id,
                'DEBIT',
                topupAmount,
                currentBalance,
                balanceAfter
            );

            await client.query('COMMIT');

            // Mock card code was generated before the transaction

            return {
                transaction_id: transactionId,
                new_balance: newBalance,
                cardCode,
                serial,
                type,
                provider,
                amount,
                phone
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = TopupService;

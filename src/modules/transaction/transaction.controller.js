const { success } = require('../../utils/response.util');
const txService = require('./transaction.service');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const transactionController = {
    deposit: async (req, res, next) => {
        const userId = req.user.userId;
        const { amount, pin, external_reference } = req.body;
        const faceImagePath = req.file ? req.file.path : null;

        let bigAmount;
        try {
            bigAmount = BigInt(amount);
            if (bigAmount <= 0n) throw new Error();
        } catch (e) {
            return next(new Error('Invalid_Amount'));
        }

        try {
            const result = await txService.deposit(userId, bigAmount, pin, faceImagePath, external_reference);
            return success(req, res, 200, 'Nạp tiền thành công', result );
        } catch (error) { next(error); }
    },

    withdraw: async (req, res, next) => {
        const userId = req.user.userId;
        const { amount, pin, linked_bank_id, external_reference } = req.body;
        const faceImagePath = req.file ? req.file.path : null;

        if (!linked_bank_id) {
            return res.status(400).json({ error: 'Vui lòng chọn ngân hàng rút tiền' });
        }

        let bigAmount;
        try {
            bigAmount = BigInt(amount);
            if (bigAmount <= 0n) throw new Error();
        } catch (e) {
            return next(new Error('Invalid_Amount'));
        }

        try {
            const result = await txService.withdraw(userId, bigAmount, pin, faceImagePath, linked_bank_id, external_reference);
            return success(req, res, 200, 'Rút tiền thành công', result );
        } catch (error) { next(error); }
    },

    bankTransfer: async (req, res, next) => {
        const userId = req.user.userId;
        const { amount, pin, bank_code, bank_name, account_number, external_reference } = req.body;
        const faceImagePath = req.file ? req.file.path : null;

        if (!bank_code || !account_number) {
            return res.status(400).json({ error: 'Vui lòng cung cấp ngân hàng và số tài khoản nhận' });
        }

        let bigAmount;
        try {
            bigAmount = BigInt(amount);
            if (bigAmount <= 0n) throw new Error();
        } catch (e) {
            return next(new Error('Invalid_Amount'));
        }

        try {
            const result = await txService.bankTransfer(
                userId, 
                bigAmount, 
                pin, 
                faceImagePath, 
                bank_code, 
                bank_name || bank_code, 
                account_number, 
                external_reference
            );
            return success(req, res, 200, 'Chuyển tiền ngân hàng thành công', result );
        } catch (error) { next(error); }
    },

    transfer: async (req, res, next) => {
        const senderId = req.user.userId;
        
        const { receiver_identifier, amount, note, reference_code, pin } = req.body;
        const faceImagePath = req.file ? req.file.path : null;

        if (!receiver_identifier || !amount || !pin) {
            return res.status(400).json({ error: 'Vui lòng nhập người nhận, số tiền và mã PIN' });
        }

        let bigAmount;
        try {
            bigAmount = BigInt(amount);
            if (bigAmount <= 0n) throw new Error();
        } catch (e) {
            return next(new Error('Invalid_Amount'));
        }

        try {
            const result = await txService.transfer(senderId, receiver_identifier, bigAmount, note, reference_code, pin, faceImagePath);
            return success(req, res, 200, 'Chuyển tiền thành công', result );
        } catch (error) { next(error); }
    },

    getHistory: async (req, res, next) => {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Lấy filter params
        const filters = {};
        if (req.query.type) filters.type = req.query.type;
        if (req.query.startDate) filters.startDate = req.query.startDate;
        if (req.query.endDate) filters.endDate = req.query.endDate;

        try {
            const history = await txService.getTransactionHistory(userId, page, limit, filters);
            res.status(200).json({
                success: true,
                page,
                limit,
                filters: Object.keys(filters).length > 0 ? filters : undefined,
                data: history
            });
        } catch (error) { next(error); }
    },

    updateCategory: async (req, res, next) => {
        const transactionId = req.params.id;
        const { category_name, is_expense_counted } = req.body;
        const userId = req.user.userId;

        try {
            const result = await txService.updateTransactionCategory(
                userId,
                transactionId, 
                category_name, 
                is_expense_counted !== undefined ? is_expense_counted : true
            );
            res.status(200).json({
                success: true,
                message: 'Cập nhật danh mục thành công',
                data: result
            });
        } catch (error) { next(error); }
    },

    getStats: async (req, res, next) => {
        const userId = req.user.userId;
        try {
            const stats = await txService.getMonthlyStats(userId);
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) { next(error); }
    },

    getByMonth: async (req, res, next) => {
        const userId = req.user.userId;
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (!month || !year) {
            return res.status(400).json({ error: 'Vui lòng cung cấp month và year' });
        }

        try {
            const transactions = await txService.getTransactionsByMonth(userId, month, year);
            res.status(200).json({
                success: true,
                data: transactions
            });
        } catch (error) { next(error); }
    },

    getChatList: async (req, res, next) => {
        const userId = req.user.userId;
        try {
            const chats = await txService.getChatList(userId);
            res.status(200).json({
                success: true,
                data: chats
            });
        } catch (error) { next(error); }
    },

    getChatHistory: async (req, res, next) => {
        const userId = req.user.userId;
        const phone = req.params.phone;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        try {
            const history = await txService.getChatHistory(userId, phone, page, limit);
            res.status(200).json({
                success: true,
                page,
                limit,
                data: history
            });
        } catch (error) { next(error); }
    },

    exportData: async (req, res, next) => {
        const { email, duration, startDate: reqStartDate, endDate: reqEndDate } = req.body;
        const userId = req.user.userId;

        if (!email) {
            return res.status(400).json({ error: 'Vui lòng cung cấp email' });
        }

        // Trả về ngay lập tức để không làm block UI
        res.status(200).json({ success: true, message: 'Yêu cầu xuất dữ liệu đã được gửi. Bạn sẽ nhận được email trong ít phút.' });

        // Chạy tiến trình tạo và gửi email ngầm
        (async () => {
            try {
                const pool = require('../../config/db');
                const userQuery = await pool.query(`
                    SELECT u.phone, k.dob 
                    FROM users u 
                    LEFT JOIN user_kyc k ON u.id = k.user_id 
                    WHERE u.id = $1
                `, [userId]);
                const userData = userQuery.rows[0];
                const phone = userData?.phone || 'Người dùng Ví Mio';
                
                let dobPassword = '12345678';
                if (userData?.dob) {
                    const dobStr = String(userData.dob).trim();
                    const match = dobStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
                    if (match) {
                        const dd = match[1];
                        const mm = match[2];
                        const yyyy = match[3];
                        dobPassword = `${dd}${mm}${yyyy}`;
                    } else {
                        const d = new Date(dobStr);
                        if (!isNaN(d.getTime())) {
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = String(d.getFullYear());
                            dobPassword = `${dd}${mm}${yyyy}`;
                        }
                    }
                }
                
                let endDate = new Date();
                let startDate = new Date();
                if (reqStartDate && reqEndDate) {
                    startDate = new Date(reqStartDate);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(reqEndDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    let days = parseInt(duration);
                    if (isNaN(days)) days = 7;
                    startDate.setDate(endDate.getDate() - days);
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);
                }

                const formatDate = (d) => {
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}/${month}/${year}`;
                };

                // Lấy dữ liệu giao dịch
                const history = await txService.getTransactionHistory(userId, 1, 1000); // Lấy tối đa 1000 giao dịch gần nhất
                const filteredHistory = history.filter(tx => {
                    if (!tx.created_at) return false;
                    const txDate = new Date(tx.created_at);
                    return txDate >= startDate && txDate <= endDate;
                });

                // Tạo file excel
                const ExcelJS = require('exceljs');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Sao ke giao dich');

                worksheet.columns = [
                    { header: 'Mã GD', key: 'ref', width: 20 },
                    { header: 'Thời gian', key: 'time', width: 25 },
                    { header: 'Loại GD', key: 'type', width: 15 },
                    { header: 'Nội dung', key: 'note', width: 40 },
                    { header: 'Số tiền (VND)', key: 'amount', width: 20 },
                    { header: 'Số dư (VND)', key: 'balance', width: 20 }
                ];

                // Header styling
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

                filteredHistory.forEach(tx => {
                    const isCredit = tx.entry_type === 'CREDIT';
                    const sign = isCredit ? '+' : '-';
                    let typeLabel = 'Giao dịch';
                    if (tx.transaction_type === 'DEPOSIT') typeLabel = 'Nạp tiền';
                    else if (tx.transaction_type === 'WITHDRAW') typeLabel = 'Rút tiền';
                    else if (tx.transaction_type === 'TRANSFER') typeLabel = 'Chuyển tiền';

                    const row = worksheet.addRow({
                        ref: tx.external_reference || '',
                        time: new Date(tx.created_at).toLocaleString('vi-VN'),
                        type: typeLabel,
                        note: tx.description || tx.transfer_note || 'Giao dịch',
                        amount: `${sign}${tx.amount}`,
                        balance: tx.balance_after || ''
                    });

                    // Tô đỏ nếu là tiền chuyển đi
                    if (!isCredit) {
                        row.getCell('amount').font = { color: { argb: 'FFFF0000' } };
                    }
                });
                
                // Protect sheet bằng mật khẩu (6 số ngày tháng năm sinh)
                await worksheet.protect(dobPassword, {
                    selectLockedCells: true,
                    selectUnlockedCells: true,
                });

                const buffer = await workbook.xlsx.writeBuffer();

                // Mã hóa toàn bộ workbook bằng mật khẩu mở file sử dụng xlsx-populate
                const XlsxPopulate = require('xlsx-populate');
                const encryptedWorkbook = await XlsxPopulate.fromDataAsync(buffer);
                const encryptedBuffer = await encryptedWorkbook.outputAsync({ password: dobPassword });

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER || 'test@gmail.com',
                        pass: process.env.EMAIL_PASS || 'password',
                    },
                });

                const mailOptions = {
                    from: '"Ví Mio" <no-reply@mio.vn>',
                    to: email,
                    subject: 'Sao kê lịch sử giao dịch',
                    text: `Chào Quý khách,\n\nVí Mio xin gửi tới Quý khách Chi tiết giao dịch cho tài khoản ${phone} từ ngày ${formatDate(startDate)} đến ngày ${formatDate(endDate)}.\n\nNội dung chi tiết các giao dịch tại file đính kèm trong thư này.\n\nMật khẩu bảo vệ file là ngày sinh theo định dạng DDMMYYYY:\n- DD: Ngày sinh\n- MM: Tháng sinh\n- YYYY: Năm sinh đầy đủ\nVí dụ: Sinh nhật của Quý khách là ngày 05 tháng 07 năm 2005, mật khẩu sẽ là: 05072005\n\nQuý khách vui lòng kiểm tra lại.\n\nTrân trọng,\nĐội phát triển ứng dụng Ví Mio.`,
                    attachments: [
                        {
                            filename: `${phone}_${formatDate(startDate).replace(/\//g, '')}_${formatDate(endDate).replace(/\//g, '')}.xlsx`,
                            content: encryptedBuffer
                        }
                    ]
                };

                // Nếu không có thông tin email thật, log ra console
                if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'test@gmail.com') {
                    console.log('--- MOCK EMAIL GỬI ĐI ---');
                    console.log('To:', mailOptions.to);
                    console.log('Subject:', mailOptions.subject);
                    console.log('Attachment:', mailOptions.attachments[0].filename, 'Size:', buffer.length);
                    console.log('-------------------------');
                    return;
                }

                await transporter.sendMail(mailOptions);
                console.log(`Gửi email sao kê thành công tới ${email}`);

        } catch (error) { next(error); }
        })();
    }
};

module.exports = transactionController;
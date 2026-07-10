/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Các API thực hiện giao dịch nạp, rút, chuyển tiền và xem lịch sử
 */

/**
 * @swagger
 * /api/v1/transaction/deposit:
 *   post:
 *     summary: Nạp tiền từ ngân hàng liên kết vào ví
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã duy nhất để chống trùng lặp giao dịch (VD UUID). Gửi lại cùng một mã trong thời gian ngắn sẽ không thực hiện lại giao dịch.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - pin
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Số tiền nạp
 *                 example: "100000"
 *               pin:
 *                 type: string
 *                 description: Mã PIN ví gồm 6 chữ số
 *                 example: "123456"
 *               external_reference:
 *                 type: string
 *                 description: Mã tham chiếu giao dịch ngoài
 *                 example: "DEP_12345"
 *               face_image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh quét khuôn mặt (bắt buộc nếu nạp từ 50,000,000 VND trở lên)
 *     responses:
 *       200:
 *         description: Nạp tiền thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Nạp tiền thành công"
 *                 data:
 *                   type: object
 *       400:
 *         description: Sai mã PIN, thiếu ảnh xác thực khuôn mặt khi giao dịch lớn, hoặc số tiền không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Lỗi hệ thống
 */

/**
 * @swagger
 * /api/v1/transaction/withdraw:
 *   post:
 *     summary: Rút tiền từ ví về ngân hàng liên kết
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã duy nhất để chống trùng lặp giao dịch (VD UUID). Gửi lại cùng một mã trong thời gian ngắn sẽ không thực hiện lại giao dịch.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - pin
 *               - linked_bank_id
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Số tiền rút
 *                 example: "50000"
 *               pin:
 *                 type: string
 *                 description: Mã PIN ví
 *                 example: "123456"
 *               linked_bank_id:
 *                 type: string
 *                 description: ID của ngân hàng liên kết đã lưu trong hệ thống
 *                 example: "019eb57f-b093-706f-9903-6eaab62eb279"
 *               external_reference:
 *                 type: string
 *                 example: "WIT_12345"
 *               face_image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh quét khuôn mặt (bắt buộc nếu rút từ 50,000,000 VND trở lên)
 *     responses:
 *       200:
 *         description: Rút tiền thành công
 *       400:
 *         description: Số dư không đủ, sai PIN hoặc thiếu xác thực khuôn mặt
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/v1/transaction/bank-transfer:
 *   post:
 *     summary: Chuyển tiền tới tài khoản ngân hàng bất kỳ (Ngoài hệ thống)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã duy nhất để chống trùng lặp giao dịch (VD UUID). Gửi lại cùng một mã trong thời gian ngắn sẽ không thực hiện lại giao dịch.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - pin
 *               - bank_code
 *               - account_number
 *             properties:
 *               amount:
 *                 type: string
 *                 example: "200000"
 *               pin:
 *                 type: string
 *                 example: "123456"
 *               bank_code:
 *                 type: string
 *                 description: Mã ngân hàng (ví dụ VCB, TCB, MB)
 *                 example: "VCB"
 *               bank_name:
 *                 type: string
 *                 description: Tên ngân hàng (tùy chọn)
 *                 example: "Vietcombank"
 *               account_number:
 *                 type: string
 *                 description: Số tài khoản nhận tiền
 *                 example: "1029384756"
 *               external_reference:
 *                 type: string
 *                 example: "FT_12345"
 *               face_image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh quét khuôn mặt (bắt buộc nếu chuyển từ 50,000,000 VND trở lên)
 *     responses:
 *       200:
 *         description: Chuyển tiền ngân hàng thành công
 *       400:
 *         description: Thiếu thông tin hoặc lỗi giao dịch
 */

/**
 * @swagger
 * /api/v1/transaction/transfer:
 *   post:
 *     summary: Chuyển tiền nội bộ (Tới số điện thoại/Email người dùng khác trong hệ thống)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: Mã duy nhất để chống trùng lặp giao dịch (VD UUID). Gửi lại cùng một mã trong thời gian ngắn sẽ không thực hiện lại giao dịch.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_identifier
 *               - amount
 *               - pin
 *             properties:
 *               receiver_identifier:
 *                 type: string
 *                 description: Số điện thoại hoặc Email của người nhận
 *                 example: "0912345678"
 *               amount:
 *                 type: string
 *                 example: "50000"
 *               note:
 *                 type: string
 *                 description: Lời nhắn chuyển khoản
 *                 example: "Tra tien cafe"
 *               reference_code:
 *                 type: string
 *                 description: Mã tham chiếu tùy chọn
 *               pin:
 *                 type: string
 *                 description: Mã PIN ví
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Chuyển tiền thành công
 *       400:
 *         description: Số dư không đủ, ví người nhận không tồn tại, người nhận chưa KYC hoặc sai PIN
 */

/**
 * @swagger
 * /api/v1/transaction/history:
 *   get:
 *     summary: Lấy lịch sử giao dịch của người dùng (hỗ trợ filter)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng giao dịch trên mỗi trang
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, TRANSFER, WITHDRAW, PAYMENT]
 *         description: Lọc theo loại giao dịch
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *         example: "2026-06-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *         example: "2026-06-30"
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/v1/transaction/stats:
 *   get:
 *     summary: Lấy thống kê giao dịch theo tháng
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê chi tiêu
 */

/**
 * @swagger
 * /api/v1/transaction/month:
 *   get:
 *     summary: Lấy tất cả giao dịch trong một tháng cụ thể
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 */

/**
 * @swagger
 * /api/v1/transaction/chat-list:
 *   get:
 *     summary: Lấy danh sách các cuộc trò chuyện (Lịch sử giao dịch nhóm theo người)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách chat
 */

/**
 * @swagger
 * /api/v1/transaction/chat/{phone}:
 *   get:
 *     summary: Lấy chi tiết lịch sử giao dịch giữa 2 người (Dạng Chat)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lịch sử giao dịch
 */

/**
 * @swagger
 * /api/v1/transaction/{id}/category:
 *   put:
 *     summary: Cập nhật danh mục chi tiêu/thu nhập cho một giao dịch cụ thể
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của giao dịch
 *         example: "019eb57f-b093-706f-9903-6eaab62eb279"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_name
 *             properties:
 *               category_name:
 *                 type: string
 *                 description: Tên danh mục phân loại chi tiêu
 *                 example: "Ăn uống"
 *               is_expense_counted:
 *                 type: boolean
 *                 description: Có tính vào thống kê chi tiêu không
 *                 default: true
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công
 *       403:
 *         description: Không có quyền chỉnh sửa giao dịch này
 *       404:
 *         description: Không tìm thấy giao dịch
 */

/**
 * @swagger
 * /api/v1/transaction/export:
 *   post:
 *     summary: Gửi file dữ liệu giao dịch qua email
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               duration:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gửi thành công
 */
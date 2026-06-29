/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Các API quản lý ví, liên kết ngân hàng và thiết lập PIN/mã ví
 */

/**
 * @swagger
 * /api/v1/wallet/balance:
 *   get:
 *     summary: Lấy thông tin số dư ví điện tử hiện tại
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin số dư thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lấy thông tin số dư thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: string
 *                       example: "5000000"
 *                     wallet_code:
 *                       type: string
 *                       example: "123456"
 *                     is_pin_set:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Không tìm thấy ví
 */

/**
 * @swagger
 * /api/v1/wallet/limits:
 *   get:
 *     summary: Lấy thông tin hạn mức ví và số tiền đã sử dụng trong ngày/tháng
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin hạn mức thành công
 */

/**
 * @swagger
 * /api/v1/wallet/set-code:
 *   post:
 *     summary: Thiết lập mã ví gồm 6 chữ số
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wallet_code
 *             properties:
 *               wallet_code:
 *                 type: string
 *                 description: Mã ví gồm đúng 6 chữ số
 *                 example: "999999"
 *     responses:
 *       200:
 *         description: Thiết lập mã ví thành công
 *       400:
 *         description: Định dạng mã ví sai hoặc mã ví đã có người dùng
 *       404:
 *         description: Không tìm thấy ví
 */

/**
 * @swagger
 * /api/v1/wallet/qr:
 *   get:
 *     summary: Tạo mã QR tĩnh/động để nhận tiền từ người khác
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         schema:
 *           type: string
 *         description: Số tiền muốn nhận (nếu có)
 *         example: "100000"
 *       - in: query
 *         name: note
 *         schema:
 *           type: string
 *         description: Lời nhắn đính kèm QR
 *         example: "Tra tien com"
 *     responses:
 *       200:
 *         description: Sinh QR Code thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */

/**
 * @swagger
 * /api/v1/wallet/linked-banks:
 *   get:
 *     summary: Lấy danh sách các tài khoản ngân hàng đã liên kết với ví
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách ngân hàng liên kết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/v1/wallet/link-bank:
 *   post:
 *     summary: Liên kết tài khoản ngân hàng mới
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bank_name
 *               - card_number
 *               - card_holder_name
 *               - pin
 *             properties:
 *               bank_name:
 *                 type: string
 *                 example: "Vietcombank"
 *               bank_code:
 *                 type: string
 *                 example: "VCB"
 *               card_number:
 *                 type: string
 *                 example: "9704366812345678"
 *               card_holder_name:
 *                 type: string
 *                 example: "NGUYEN VAN A"
 *               pin:
 *                 type: string
 *                 description: Mã PIN ví xác nhận liên kết
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Liên kết thành công
 *       400:
 *         description: Sai PIN hoặc tài khoản bị khóa tạm thời
 */

/**
 * @swagger
 * /api/v1/wallet/verify-pin:
 *   post:
 *     summary: Xác thực mã PIN của ví
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Mã PIN chính xác
 *       400:
 *         description: Sai PIN, PIN chưa được cài đặt hoặc ví bị khóa tạm thời
 */
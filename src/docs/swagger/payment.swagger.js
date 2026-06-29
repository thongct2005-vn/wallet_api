/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Các API liên quan đến thanh toán hóa đơn và cổng thanh toán (Merchant / User QR)
 */

/**
 * @swagger
 * /api/v1/payment/create:
 *   post:
 *     summary: Tạo hóa đơn thanh toán động (Dành cho Merchant/Đối tác)
 *     tags: [Payment]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền cần thanh toán
 *                 example: 50000
 *               callback_url:
 *                 type: string
 *                 description: URL để nhận webhook thông báo kết quả thanh toán
 *                 example: "https://yourdomain.com/webhook"
 *               description:
 *                 type: string
 *                 description: Mô tả đơn hàng
 *                 example: "Thanh toán đơn hàng ORD123"
 *               merchant_order_id:
 *                 type: string
 *                 description: Mã đơn hàng riêng của Merchant (tùy chọn, để đối soát)
 *                 example: "MY_SHOP_ORDER_001"
 *     responses:
 *       201:
 *         description: Tạo hóa đơn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo đơn hàng thanh toán thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_code:
 *                       type: string
 *                     qr_token:
 *                       type: string
 *                     merchant_order_id:
 *                       type: string
 *       400:
 *         description: Số tiền không hợp lệ
 *       401:
 *         description: API Key không hợp lệ hoặc thiếu
 *       500:
 *         description: Lỗi hệ thống
 */

/**
 * @swagger
 * /api/v1/payment/status:
 *   get:
 *     summary: Merchant tra cứu trạng thái đơn hàng thanh toán
 *     tags: [Payment]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: order_code
 *         schema:
 *           type: string
 *         description: Mã đơn hàng hệ thống (ORDxxx)
 *         example: "ORD1718096505123"
 *       - in: query
 *         name: merchant_order_id
 *         schema:
 *           type: string
 *         description: Mã đơn hàng riêng của Merchant
 *         example: "MY_SHOP_ORDER_001"
 *     responses:
 *       200:
 *         description: Tra cứu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_code:
 *                       type: string
 *                     order_status:
 *                       type: string
 *                       enum: [PENDING, SUCCESS, EXPIRED, CANCELLED]
 *                     payment:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: Thiếu order_code hoặc merchant_order_id
 *       401:
 *         description: API Key không hợp lệ
 *       404:
 *         description: Không tìm thấy đơn hàng
 */

/**
 * @swagger
 * /api/v1/payment/transaction/{id}:
 *   get:
 *     summary: Merchant tra cứu chi tiết một giao dịch thanh toán
 *     tags: [Payment]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID giao dịch thanh toán (payment_transaction_id)
 *     responses:
 *       200:
 *         description: Lấy thông tin giao dịch thành công
 *       401:
 *         description: API Key không hợp lệ
 *       404:
 *         description: Không tìm thấy giao dịch
 */

/**
 * @swagger
 * /api/v1/payment/preview:
 *   get:
 *     summary: Xem trước thông tin đơn hàng từ QR Token (Mobile app gọi trước khi xác nhận)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: qr_token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token QR lấy từ mã QR đã quét
 *         example: "f5e9464b9c384f124a8ca17da3a9f4f26bb3e5e554291ab13decdd55e9af0998"
 *     responses:
 *       200:
 *         description: Lấy thông tin đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_code:
 *                       type: string
 *                     amount:
 *                       type: string
 *                     description:
 *                       type: string
 *                     merchant_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     is_expired:
 *                       type: boolean
 *                     can_pay:
 *                       type: boolean
 *       400:
 *         description: Thiếu QR Token
 *       404:
 *         description: Không tìm thấy đơn hàng
 */

/**
 * @swagger
 * /api/v1/payment/request:
 *   post:
 *     summary: Tạo QR nhận tiền cá nhân kèm số tiền tùy chỉnh
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền muốn nhận
 *                 example: 100000
 *               description:
 *                 type: string
 *                 description: Nội dung nhắn gửi khi nhận tiền
 *                 example: "Chuyen tien an trua"
 *     responses:
 *       201:
 *         description: Tạo QR nhận tiền thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo QR nhận tiền thành công"
 *                 data:
 *                   type: object
 *       400:
 *         description: Số tiền không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Lỗi hệ thống
 */

/**
 * @swagger
 * /api/v1/payment/process:
 *   post:
 *     summary: Thực hiện thanh toán hóa đơn từ QR Code của đối tác
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qr_token
 *             properties:
 *               qr_token:
 *                 type: string
 *                 description: Token QR lấy từ đơn hàng của Merchant
 *                 example: "f5e9464b9c384f124a8ca17da3a9f4f26bb3e5e554291ab13decdd55e9af0998"
 *     responses:
 *       200:
 *         description: Thanh toán thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Thanh toán thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order_id:
 *                       type: string
 *                     amount_paid:
 *                       type: string
 *                     balance_remaining:
 *                       type: string
 *       400:
 *         description: Số tiền không đủ, QR hết hạn hoặc đơn hàng đã xử lý
 *       401:
 *         description: Chưa xác thực
 *       500:
 *         description: Lỗi hệ thống
 */
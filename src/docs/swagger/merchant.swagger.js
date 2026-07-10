/**
 * @swagger
 * tags:
 *   name: Merchant Portal
 *   description: APIs dành riêng cho Merchant quản lý thông tin và giao dịch
 */

/**
 * @swagger
 * /api/v1/merchant/profile:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Lấy thông tin profile của Merchant hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin merchant
 */

/**
 * @swagger
 * /api/v1/merchant/profile/callback:
 *   patch:
 *     tags: [Merchant Portal]
 *     summary: Cập nhật cấu hình callback URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               default_callback_url:
 *                 type: string
 *               default_redirect_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */

/**
 * @swagger
 * /api/v1/merchant/api-keys:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Danh sách API Keys của Merchant
 *     description: Không trả về api_secret
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách API Keys public
 */

/**
 * @swagger
 * /api/v1/merchant/api-keys:
 *   post:
 *     tags: [Merchant Portal]
 *     summary: Tạo API Key (SANDBOX)
 *     description: Tự động sinh API Key môi trường SANDBOX. `api_secret` chỉ trả về duy nhất 1 lần trong response.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

/**
 * @swagger
 * /api/v1/merchant/api-keys/{id}/actions/rotate-secret:
 *   post:
 *     tags: [Merchant Portal]
 *     summary: Đổi Secret của API Key
 *     description: Giữ nguyên public `api_key`, chỉ sinh lại `api_secret` mới. Trả về 1 lần duy nhất.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đổi Secret thành công
 */

/**
 * @swagger
 * /api/v1/merchant/api-keys/{id}/actions/revoke:
 *   post:
 *     tags: [Merchant Portal]
 *     summary: Thu hồi API Key
 *     description: Hủy bỏ API Key, sau đó Key này không thể gọi Payment Gateway nữa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thu hồi thành công
 */

/**
 * @swagger
 * /api/v1/merchant/payment-orders:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Danh sách payment orders của Merchant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 */

/**
 * @swagger
 * /api/v1/merchant/payment-orders/{id}:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Lấy chi tiết một payment order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 */

/**
 * @swagger
 * /api/v1/merchant/transactions:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Danh sách các giao dịch thanh toán của Merchant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách giao dịch
 */

/**
 * @swagger
 * /api/v1/merchant/transactions/{id}:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Lấy chi tiết một giao dịch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết giao dịch
 */

/**
 * @swagger
 * /api/v1/merchant/webhooks:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Lịch sử gọi callback/webhook của Merchant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách webhook
 */

/**
 * @swagger
 * /api/v1/merchant/webhooks/{id}:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Chi tiết một log webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết webhook
 */

/**
 * @swagger
 * /api/v1/merchant/webhooks/{id}/retry:
 *   post:
 *     tags: [Merchant Portal]
 *     summary: Yêu cầu retry gọi lại webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đã đưa vào hàng đợi
 */

/**
 * @swagger
 * /api/v1/merchant/balance:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Xem số dư Merchant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin số dư
 */

/**
 * @swagger
 * /api/v1/merchant/balance/statement:
 *   get:
 *     tags: [Merchant Portal]
 *     summary: Xem lịch sử biến động số dư (Sao kê)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Sao kê số dư
 */
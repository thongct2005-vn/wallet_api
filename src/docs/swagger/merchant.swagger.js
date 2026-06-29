/**
 * @swagger
 * tags:
 *   name: Merchant
 *   description: API dành cho quản lý và đăng ký Merchant (Cổng thanh toán)
 */

/**
 * @swagger
 * /api/v1/merchant/me:
 *   get:
 *     summary: Lấy thông tin Merchant của User hiện tại
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin Merchant
 *       404:
 *         description: User chưa đăng ký Merchant
 */

/**
 * @swagger
 * /api/v1/merchant/register:
 *   post:
 *     summary: Tự động đăng ký Merchant
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchant_name
 *               - contact_phone
 *             properties:
 *               merchant_name:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               callback_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */

/**
 * @swagger
 * /api/v1/merchant/webhook:
 *   put:
 *     summary: Cập nhật Webhook URL
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - callback_url
 *             properties:
 *               callback_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
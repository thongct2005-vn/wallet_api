/**
 * @swagger
 * /api/v1/ai/scan-receipt:
 *   post:
 *     summary: Quét hóa đơn (AI Receipt Scanner)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Hình ảnh hóa đơn cần quét
 *     responses:
 *       200:
 *         description: Quét hóa đơn thành công
 */

/**
 * @swagger
 * /api/v1/ai/extract-intent:
 *   post:
 *     summary: Trích xuất ý định chuyển tiền từ văn bản (Voice/Text)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Chuyển 50k cho mẹ tiền đi chợ"
 *     responses:
 *       200:
 *         description: Trích xuất thành công
 */

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Chat với AI Trợ thủ
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trả lời thành công
 */
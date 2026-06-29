/**
 * @swagger
 * tags:
 *   name: RedPacket
 *   description: API Lì Xì
 */

/**
 * @swagger
 * /api/v1/red-packet/create:
 *   post:
 *     summary: Tạo gói lì xì mới
 *     tags: [RedPacket]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/v1/red-packet/{id}/claim:
 *   post:
 *     summary: Mở gói lì xì
 *     tags: [RedPacket]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/v1/red-packet/{id}:
 *   get:
 *     summary: Lấy thông tin gói lì xì
 *     tags: [RedPacket]
 *     security:
 *       - bearerAuth: []
 */
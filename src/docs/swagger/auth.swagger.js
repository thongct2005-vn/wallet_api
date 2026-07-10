/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Dang ky, dang nhap, token, OTP Mobile va bao mat tai khoan
 * components:
 *   schemas:
 *     AuthError:
 *       type: object
 *       required: [success, message, error_code, trace_id]
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Du lieu khong hop le
 *         error_code:
 *           type: string
 *           example: VALIDATION_ERROR
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 *         trace_id:
 *           type: string
 *           example: trace-auth-error-001
 *     AuthUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         username:
 *           type: string
 *           nullable: true
 *         full_name:
 *           type: string
 *         phone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [ACTIVE, PENDING_VERIFY, LOCKED, BLOCKED, INACTIVE]
 *         is_kyc_verified:
 *           type: boolean
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           example: [USER]
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - wallet.wallets.read
 *             - wallet.transfers.create
 *     AuthTokenPair:
 *       type: object
 *       properties:
 *         access_token:
 *           type: string
 *           description: JWT access token
 *         refresh_token:
 *           type: string
 *           description: Opaque refresh token, chi hien thi cho client
 *         expires_in:
 *           type: integer
 *           example: 3600
 *     RegisterRequest:
 *       type: object
 *       required: [full_name, phone, password, confirm_password]
 *       properties:
 *         full_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           example: Nguyen Van An
 *         username:
 *           type: string
 *           maxLength: 100
 *           example: user_an
 *         phone:
 *           type: string
 *           maxLength: 20
 *           example: "0900000001"
 *         email:
 *           type: string
 *           format: email
 *           example: an@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: Password@123
 *         confirm_password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: Password@123
 *     LoginRequest:
 *       type: object
 *       required: [username, password]
 *       properties:
 *         username:
 *           type: string
 *           description: Tên đăng nhập, email hoặc số điện thoại
 *           example: "0900000001"
 *         password:
 *           type: string
 *           format: password
 *           example: Password@123
 *         remember_me:
 *           type: boolean
 *           default: false
 *     MobileLoginRequest:
 *       type: object
 *       required: [identifier, password]
 *       properties:
 *         identifier:
 *           type: string
 *           description: So dien thoai hoac email cua tai khoan Mobile
 *           example: "0900000001"
 *         password:
 *           type: string
 *           format: password
 *           example: "123456"
 *     RefreshTokenRequest:
 *       type: object
 *       required: [refresh_token]
 *       properties:
 *         refresh_token:
 *           type: string
 *     PasswordChangeRequest:
 *       type: object
 *       required: [current_password, new_password, confirm_new_password]
 *       properties:
 *         current_password:
 *           type: string
 *           format: password
 *         new_password:
 *           type: string
 *           format: password
 *           minLength: 8
 *         confirm_new_password:
 *           type: string
 *           format: password
 *           minLength: 8
 *     PasswordResetRequest:
 *       type: object
 *       required: [reset_token, new_password, confirm_new_password]
 *       properties:
 *         reset_token:
 *           type: string
 *         new_password:
 *           type: string
 *           format: password
 *           minLength: 8
 *         confirm_new_password:
 *           type: string
 *           format: password
 *           minLength: 8
 */

/**
 * @swagger
 * /api/v1/auth/check-phone:
 *   post:
 *     summary: Kiểm tra xem số điện thoại đã được đăng ký chưa
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Số điện thoại cần kiểm tra
 *                 example: "0987654321"
 *     responses:
 *       200:
 *         description: Thành công, trả về trạng thái tồn tại của số điện thoại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Lỗi thiếu tham số truyền vào
 *       500:
 *         description: Lỗi hệ thống nội bộ
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Dang ky tai khoan vi
 *     description: Tao user, gan role USER, tao wallet va wallet balance trong cung transaction.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Dang ky thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/AuthUser'
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         wallet_no:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: ACTIVE
 *                         currency:
 *                           type: string
 *                           example: VND
 *                         available_balance:
 *                           type: integer
 *                           format: int64
 *                           example: 0
 *                         locked_balance:
 *                           type: integer
 *                           format: int64
 *                           example: 0
 *                 trace_id:
 *                   type: string
 *       400:
 *         description: Du lieu hoac password khong hop le
 *       409:
 *         description: Phone, email hoac username da ton tai
 *       429:
 *         description: Vuot rate limit
 *       500:
 *         description: Loi he thong hoac RBAC chua duoc seed
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Dang nhap tai khoan
 *     description: Web/Admin/Merchant Portal dung login_id. Mobile dung identifier de giu luong dang nhap cua ung dung vi.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/LoginRequest'
 *               - $ref: '#/components/schemas/MobileLoginRequest'
 *     responses:
 *       200:
 *         description: Dang nhap thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login success
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/AuthTokenPair'
 *                     - type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/AuthUser'
 *                         user_info:
 *                           $ref: '#/components/schemas/AuthUser'
 *                 trace_id:
 *                   type: string
 *       400:
 *         description: Thieu thong tin dang nhap
 *       401:
 *         description: Sai thong tin dang nhap
 *       403:
 *         description: Tai khoan bi khoa hoac chua kich hoat
 *       429:
 *         description: Vuot rate limit
 */

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Rotation refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Cap token pair moi va revoke refresh token cu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Token refreshed
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokenPair'
 *                 trace_id:
 *                   type: string
 *       401:
 *         description: Refresh token khong hop le, het han hoac bi reuse
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password-otp:
 *   post:
 *     summary: Yêu cầu gửi OTP để khôi phục mật khẩu
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Số điện thoại hoặc Email đã đăng ký
 *                 example: "0987654321"
 *     responses:
 *       200:
 *         description: Đã gửi mã OTP thành công
 *       404:
 *         description: Không tìm thấy tài khoản
 *       500:
 *         description: Lỗi server nội bộ
 */

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới bằng mã OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - otp
 *               - new_password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Số điện thoại hoặc Email
 *                 example: "0987654321"
 *               otp:
 *                 type: string
 *                 description: Mã OTP đã nhận được
 *                 example: "123456"
 *               new_password:
 *                 type: string
 *                 description: Mật khẩu mới
 *                 example: "NewPass123!"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Mã OTP không chính xác hoặc thiếu tham số
 *       404:
 *         description: Không tìm thấy tài khoản
 *       500:
 *         description: Lỗi server nội bộ
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Tao yeu cau quen mat khau
 *     description: Luon tra ket qua chung de khong lam lo tai khoan co ton tai hay khong.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username, email hoac phone
 *                 example: "0900000001"
 *     responses:
 *       200:
 *         description: Yeu cau duoc tiep nhan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accepted:
 *                       type: boolean
 *                     reset_token:
 *                       type: string
 *                       description: Chi tra trong moi truong khong phai production de test
 *                 trace_id:
 *                   type: string
 *       429:
 *         description: Vuot rate limit
 */

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Dat lai mat khau bang reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Dat lai mat khau thanh cong va revoke session cu
 *       400:
 *         description: Reset token hoac password khong hop le
 *       429:
 *         description: Vuot rate limit
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Dang xuat va revoke refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Dang xuat thanh cong
 *       401:
 *         description: Access token hoac refresh token khong hop le
 */

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Doi mat khau cua tai khoan hien tai
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordChangeRequest'
 *     responses:
 *       200:
 *         description: Doi mat khau thanh cong va revoke refresh token cu
 *       400:
 *         description: Mat khau hien tai sai hoac mat khau moi khong hop le
 *       401:
 *         description: Access token khong hop le
 */

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Lay thong tin tai khoan hien tai
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thong tin user, roles va permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Current user
 *                 data:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 trace_id:
 *                   type: string
 *       401:
 *         description: Access token khong hop le hoac het han
 *       404:
 *         description: User khong ton tai
 */

/**
 * @swagger
 * /api/v1/auth/check-phone:
 *   post:
 *     summary: Mobile kiem tra so dien thoai da dang ky
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0900000001"
 *     responses:
 *       200:
 *         description: Ket qua kiem tra
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isExist:
 *                   type: boolean
 *                   description: true neu so dien thoai da ton tai
 */

/**
 * @swagger
 * /api/v1/auth/send-otp:
 *   post:
 *     summary: Mobile gui OTP dang ky qua Twilio Verify
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP da duoc gui
 *       409:
 *         description: Phone hoac email da ton tai
 *       429:
 *         description: Vuot rate limit
 *       502:
 *         description: Twilio khong gui duoc OTP
 */

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Mobile xac minh OTP va cap registration token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP hop le
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 register_token:
 *                   type: string
 *       400:
 *         description: OTP sai, het han hoac khong ton tai
 *       403:
 *         description: OTP bi khoa tam thoi
 */

/**
 * @swagger
 * /api/v1/auth/set-password:
 *   post:
 *     summary: Mobile hoan tat dang ky tu registration token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [register_token, password]
 *             properties:
 *               register_token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mat khau/PIN do ung dung Mobile gui len trong buoc hoan tat dang ky
 *               full_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tao user, role, wallet va balance thanh cong
 *       400:
 *         description: Password khong hop le
 *       401:
 *         description: Registration token khong hop le
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password-otp:
 *   post:
 *     summary: Mobile gui OTP quen mat khau
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yeu cau reset duoc tiep nhan
 *
 * /api/v1/auth/verify-phone:
 *   post:
 *     summary: Xac thuc OTP Twilio Verify
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+84862087409"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Xac thuc thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verify_token:
 *                   type: string
 *
 * /api/v1/auth/set-password-after-verify:
 *   post:
 *     summary: Thiet lap mat khau sau khi verify OTP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_password:
 *                 type: string
 *                 example: "123456"
 *               confirm_password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Thiet lap mat khau thanh cong
 */
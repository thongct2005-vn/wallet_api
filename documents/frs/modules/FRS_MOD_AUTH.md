# FRS Chi tiết — MOD-AUTH: Xác thực & Phân quyền

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Auth quản lý xác thực, phiên đăng nhập, phân quyền và bảo mật tài khoản cho toàn hệ thống ví điện tử và cổng thanh toán.

Module này phục vụ 3 nhóm người dùng chính:

- User sử dụng ví điện tử trên mobile app
- Merchant sử dụng cổng thanh toán
- Admin quản trị hệ thống

**Phạm vi chính:**

- Đăng ký tài khoản user
- Đăng nhập / đăng xuất
- Refresh token
- Quên mật khẩu / đổi mật khẩu
- Quản lý role và quyền truy cập
- Xác thực JWT cho user/admin
- Xác thực API Key + Signature cho merchant
- Khóa/mở tài khoản
- Ghi audit log các sự kiện bảo mật

---

## 2. Actor & Quyền

| Actor | Quyền trong module |
|---|---|
| Guest | Đăng ký, đăng nhập, quên mật khẩu |
| User | Đăng nhập mobile app, đổi mật khẩu, quản lý phiên đăng nhập cá nhân |
| Merchant | Đăng nhập portal, quản lý API key nếu được cấp quyền |
| Admin | Quản lý user, merchant account, khóa/mở tài khoản |
| System | Tạo token, verify token, revoke session, ghi audit/security log |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-AUTH-01: Đăng ký tài khoản người dùng ví

**Mô tả:**  
Người dùng đăng ký tài khoản để sử dụng ví điện tử. Sau khi đăng ký thành công, hệ thống tự động tạo ví mặc định cho user.

**Actor:** Guest

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Guest mở màn hình đăng ký |
| 2 | Nhập họ tên, số điện thoại, email, mật khẩu |
| 3 | Hệ thống validate dữ liệu |
| 4 | Hệ thống kiểm tra email/số điện thoại đã tồn tại chưa |
| 5 | Tạo user mới ở trạng thái ACTIVE hoặc PENDING_VERIFY |
| 6 | Tạo ví mặc định cho user |
| 7 | Gửi OTP/email xác thực nếu có cấu hình |
| 8 | Ghi audit log |
| 9 | Trả kết quả đăng ký thành công |

**Data fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Validation |
|---|---|---|---|
| full_name | String(255) | Có | 2-255 ký tự |
| phone | String(20) | Có | Unique, format số điện thoại |
| email | String(255) | Không | Unique nếu có, đúng email format |
| password | String | Có | Tối thiểu 8 ký tự |
| confirm_password | String | Có | Khớp password |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Số điện thoại phải unique toàn hệ thống |
| BR-02 | Email nếu nhập phải unique toàn hệ thống |
| BR-03 | Password phải được hash, không lưu plain text |
| BR-04 | Sau khi tạo user thành công phải tạo ví mặc định |
| BR-05 | Nếu tạo ví lỗi thì rollback tạo user |
| BR-06 | User mới không có quyền admin/merchant |
| BR-07 | Ghi audit log sự kiện đăng ký |

---

### FN-AUTH-02: Đăng nhập

**Mô tả:**  
Người dùng đăng nhập bằng số điện thoại/email và mật khẩu để nhận access token và refresh token.

**Actor:** Guest, User, Admin, Merchant User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User nhập identifier và password |
| 2 | Hệ thống tìm tài khoản theo phone/email/username |
| 3 | Kiểm tra trạng thái tài khoản |
| 4 | Verify mật khẩu |
| 5 | Kiểm tra account lockout |
| 6 | Tạo access token và refresh token |
| 7 | Reset số lần đăng nhập sai |
| 8 | Ghi audit log login success |
| 9 | Trả token và thông tin user |

**Input fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| identifier | String | Có | Phone / Email / Username |
| password | String | Có | Mật khẩu |
| remember_me | Boolean | Không | Kéo dài refresh token |

**Output fields:**

| Trường | Mô tả |
|---|---|
| access_token | JWT access token |
| refresh_token | Refresh token |
| expires_in | Thời gian hết hạn |
| user | Thông tin user cơ bản |
| roles | Danh sách role |
| permissions | Danh sách quyền |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không thông báo rõ sai tài khoản hay sai mật khẩu |
| BR-02 | Nếu sai mật khẩu thì tăng số lần đăng nhập sai |
| BR-03 | Quá số lần sai cho phép thì khóa tạm tài khoản |
| BR-04 | Tài khoản LOCKED/BLOCKED không được đăng nhập |
| BR-05 | Token chứa user_id, role, permissions |
| BR-06 | Refresh token phải lưu hash hoặc token identifier trong DB |
| BR-07 | Ghi audit log cho login success và failed login |

---

### FN-AUTH-03: Đăng xuất

**Mô tả:**  
User đăng xuất khỏi hệ thống, refresh token bị thu hồi.

**Actor:** User, Admin, Merchant User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User click đăng xuất |
| 2 | Client gửi refresh token/session id |
| 3 | Hệ thống revoke refresh token |
| 4 | Client xóa token local |
| 5 | Ghi audit log |
| 6 | Redirect về màn hình đăng nhập |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Refresh token sau logout không được dùng lại |
| BR-02 | Access token có thể hết hạn tự nhiên hoặc bị blacklist nếu có cơ chế blacklist |
| BR-03 | Đăng xuất không ảnh hưởng đến ví/số dư |
| BR-04 | Ghi audit log logout |

---

### FN-AUTH-04: Refresh token

**Mô tả:**  
Client dùng refresh token để xin access token mới khi access token hết hạn.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Client gọi API refresh token |
| 2 | Hệ thống verify refresh token |
| 3 | Kiểm tra token chưa hết hạn, chưa bị revoke |
| 4 | Sinh access token mới |
| 5 | Thực hiện refresh token rotation |
| 6 | Revoke refresh token cũ |
| 7 | Trả token pair mới |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi lần refresh phải cấp refresh token mới |
| BR-02 | Refresh token cũ bị vô hiệu sau khi dùng |
| BR-03 | Nếu phát hiện reuse token cũ, revoke toàn bộ token family |
| BR-04 | User bị khóa thì refresh token không còn hiệu lực |
| BR-05 | Ghi security log nếu phát hiện reuse token |

---

### FN-AUTH-05: Quên mật khẩu

**Mô tả:**  
User yêu cầu đặt lại mật khẩu khi quên mật khẩu.

**Actor:** Guest

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User chọn “Quên mật khẩu” |
| 2 | Nhập email hoặc số điện thoại |
| 3 | Hệ thống tạo reset token/OTP |
| 4 | Gửi OTP/link reset |
| 5 | User nhập OTP hoặc mở link |
| 6 | User nhập mật khẩu mới |
| 7 | Hệ thống cập nhật mật khẩu |
| 8 | Revoke toàn bộ refresh token cũ |
| 9 | Ghi audit log |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không tiết lộ tài khoản có tồn tại hay không |
| BR-02 | Reset token/OTP có thời hạn, ví dụ 15 phút |
| BR-03 | Mỗi lần yêu cầu mới làm token cũ hết hiệu lực |
| BR-04 | Sau khi reset mật khẩu thành công phải revoke session cũ |
| BR-05 | Rate limit yêu cầu reset password |

---

### FN-AUTH-06: Đổi mật khẩu

**Mô tả:**  
User đang đăng nhập đổi mật khẩu của chính mình.

**Actor:** User, Admin, Merchant User

**Input fields:**

| Trường | Bắt buộc | Validation |
|---|---|---|
| current_password | Có | Phải đúng mật khẩu hiện tại |
| new_password | Có | Đạt chính sách mật khẩu |
| confirm_new_password | Có | Khớp mật khẩu mới |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mật khẩu mới không được trùng mật khẩu hiện tại |
| BR-02 | Sau đổi mật khẩu, revoke các session khác |
| BR-03 | Ghi audit log password change |
| BR-04 | Không log mật khẩu trong system log |

---

### FN-AUTH-07: Quản lý tài khoản user

**Mô tả:**  
Admin quản lý danh sách tài khoản user trong hệ thống.

**Actor:** Admin

**Chức năng:**

- Xem danh sách user
- Xem chi tiết user
- Khóa/mở tài khoản
- Reset mật khẩu
- Xem ví liên kết
- Xem lịch sử giao dịch
- Xem audit log liên quan user

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| User ID | ID tài khoản |
| Họ tên | full_name |
| SĐT | phone |
| Email | email |
| Trạng thái | ACTIVE / LOCKED / BLOCKED |
| Ví | wallet_no |
| Ngày tạo | created_at |
| Đăng nhập cuối | last_login_at |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin không được sửa trực tiếp số dư ví |
| BR-02 | Khóa user có thể kéo theo khóa ví nếu cấu hình |
| BR-03 | Mở user không tự động mở ví nếu ví bị khóa bởi fraud/risk |
| BR-04 | Reset mật khẩu phải revoke token cũ |
| BR-05 | Mọi thao tác quản trị user phải ghi audit log |

---

### FN-AUTH-08: Phân quyền hệ thống

**Mô tả:**  
Hệ thống hỗ trợ role-based access control cho Admin, User và Merchant.

**Role mặc định:**

| Role | Mô tả |
|---|---|
| USER | Người dùng ví điện tử |
| MERCHANT_OWNER | Chủ merchant |
| MERCHANT_STAFF | Nhân sự merchant |
| ADMIN | Quản trị hệ thống |
| SUPER_ADMIN | Toàn quyền hệ thống |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User thường không được truy cập API admin |
| BR-02 | Merchant chỉ truy cập dữ liệu merchant của mình |
| BR-03 | Admin có quyền xem toàn hệ thống nhưng không được sửa số dư thủ công |
| BR-04 | SUPER_ADMIN quản lý cấu hình hệ thống |
| BR-05 | Quyền API cần kiểm tra ở middleware |

---

## 4. Validation Rules

| Trường | Rule |
|---|---|
| phone | Required, unique, format số điện thoại |
| email | Optional, unique nếu có, valid email |
| password | Required, min 8 |
| full_name | Required, 2-255 ký tự |
| status | ACTIVE / PENDING_VERIFY / LOCKED / BLOCKED |
| role | USER / MERCHANT_OWNER / MERCHANT_STAFF / ADMIN / SUPER_ADMIN |

---

## 5. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Đăng ký user ví | Guest |
| POST | `/api/v1/auth/login` | Đăng nhập | Guest |
| POST | `/api/v1/auth/logout` | Đăng xuất | User |
| POST | `/api/v1/auth/refresh` | Refresh token | User |
| POST | `/api/v1/auth/forgot-password` | Quên mật khẩu | Guest |
| POST | `/api/v1/auth/reset-password` | Đặt lại mật khẩu | Guest |
| POST | `/api/v1/auth/change-password` | Đổi mật khẩu | User |
| GET | `/api/v1/auth/me` | Xem profile hiện tại | User |
| GET | `/api/v1/admin/users` | Admin xem danh sách user | Admin |
| GET | `/api/v1/admin/users/{id}` | Admin xem chi tiết user | Admin |
| POST | `/api/v1/admin/users/{id}/actions/lock` | Khóa user | Admin |
| POST | `/api/v1/admin/users/{id}/actions/unlock` | Mở khóa user | Admin |
| POST | `/api/v1/admin/users/{id}/actions/reset-password` | Reset password user | Admin |

---

## 6. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `users` | Tài khoản user/admin/merchant staff |
| `roles` | Vai trò hệ thống |
| `permissions` | Quyền chi tiết |
| `user_roles` | Mapping user-role |
| `role_permissions` | Mapping role-permission |
| `refresh_tokens` | Quản lý session/token |
| MongoDB `security_logs` | Theo dõi đăng nhập sai, khóa tài khoản và sự kiện bảo mật |
| `password_resets` | Reset password token/OTP |
| `otp_tracking` | OTP đã hash và thời hạn sử dụng |
| `wallets` | Ví tạo sau khi user đăng ký |
| MongoDB `audit_logs` | Ghi log nghiệp vụ xác thực |
| MongoDB `system_logs` | Ghi lỗi kỹ thuật/security |

---

## 7. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-WALLET | User đăng ký thành công thì tạo ví |
| MOD-MERCHANT | Merchant user đăng nhập portal |
| MOD-PAYMENT-GATEWAY | Merchant API dùng API Key/Signature riêng |
| MOD-ADMIN | Admin quản lý user/merchant |
| MOD-AUDIT | Ghi audit log login, logout, password, lock |

---

## 8. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | User đăng ký thành công và được tạo ví mặc định |
| AC-02 | Không cho đăng ký trùng số điện thoại |
| AC-03 | Đăng nhập đúng trả access token và refresh token |
| AC-04 | Đăng nhập sai không tiết lộ sai email hay mật khẩu |
| AC-05 | Quá số lần sai tài khoản bị khóa tạm |
| AC-06 | Refresh token rotation hoạt động đúng |
| AC-07 | Logout làm refresh token không dùng lại được |
| AC-08 | Reset password revoke session cũ |
| AC-09 | User không truy cập được API admin |
| AC-10 | Merchant chỉ truy cập được dữ liệu merchant của mình |
| AC-11 | Admin khóa user thành công và ghi audit log |
| AC-12 | Không log password/token/secret ở dạng plain text |

---

## 9. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Có bắt buộc xác thực OTP khi đăng ký không? | Mở | MVP có thể giả lập |
| O-02 | Có hỗ trợ đăng nhập bằng Google/Zalo không? | Phase sau | Không bắt buộc đồ án |
| O-03 | Khóa user có tự khóa ví không? | Mở | Cần rule rõ |
| O-04 | Có dynamic RBAC không? | Đề xuất: Có mức đơn giản | Role/permission seed sẵn |
| O-05 | Có blacklist access token không? | Mở | MVP có thể chỉ revoke refresh token |

---

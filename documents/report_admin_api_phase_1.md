# Báo Cáo Tiến Độ Phát Triển Admin Web API - Giai Đoạn 1

## 1. Tổng Quan Kiến Trúc & Quy Chuẩn (Core Architecture & Standards)
Trong ngày làm việc hôm nay, chúng ta đã tái cấu trúc và xây dựng nền tảng vững chắc cho phân hệ Admin Web API theo những quy chuẩn kỹ thuật cực kỳ nghiêm ngặt:

* **Kiến trúc 6-Layer:** Mỗi module đều tuân thủ chặt chẽ ranh giới 6 file: `routes` ➔ `validator` ➔ `controller` ➔ `service` ➔ `repository` ➔ `mapper`. Điều này giúp cô lập logic, dễ bảo trì và mở rộng.
* **Bảo mật cơ sở dữ liệu:** 100% Repository sử dụng Parameterized Query để triệt tiêu hoàn toàn rủi ro SQL Injection. Các API thao tác trên nhiều bảng (như tạo Merchant kèm Callback, hoặc Rotate API Key) đều được bọc trong vòng đời ACID Transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).
* **Hệ thống phân quyền hạt mịn (Granular Permissions):** Gỡ bỏ các quyền chung chung (như `admin.users.manage`) và chia nhỏ thành các quyền cực mịn: `admin.users.read`, `admin.users.create`, `admin.merchants.manage`...

## 2. Các Phân Hệ Chức Năng Đã Hoàn Thiện (32 Endpoints)

### 2.1. Phân hệ Admin Users & Wallets
* **Admin Users (11 APIs):** Xử lý vòng đời người dùng. Đã tích hợp các API như List, Create (Wallet User/Staff), Detail, Update, Reset Password, và đặc biệt bổ sung luồng **Twilio Verify OTP** qua 2 API mới: `verify-phone` và `set-password-after-verify`. Nếu hệ thống bật `SMS_PROVIDER=TWILIO_VERIFY`, luồng tạo User sẽ gửi mã OTP thật thay vì mật khẩu tạm. Tích hợp luồng **Bắt buộc đổi mật khẩu (Force Change Password)**: hệ thống sẽ chặn mọi endpoint khác cho đến khi user xác thực và thiết lập mật khẩu thành công.
* **Wallets (6 APIs):** Module tra cứu ví nội bộ. Cho phép tra cứu danh sách, chi tiết ví, xem Summary (tổng quan số dư), xuất sổ cái Ledger và thao tác Lock/Unlock ví.

### 2.2. Phân hệ Roles & Permissions
* **Roles (4 APIs) & Permissions (1 API):** Cung cấp giải pháp để tạo Role mới, gán Permission linh hoạt vào từng Role và tra cứu danh sách toàn bộ các mã quyền trong hệ thống.

### 2.3. Phân hệ Merchants & API Keys (12 APIs cốt lõi)
Hệ thống lõi quản lý đối tác (Merchant) và các khóa truy cập (API Keys) đã được làm đúng theo FRS:
* **Vòng đời Merchant:** Đăng ký Merchant mới kèm theo Webhook/Callback config, duyệt, từ chối, tạm ngưng và kích hoạt lại.
* **Quản lý API Keys bảo mật:**
  * **Cấp phát (Create):** Tự động sinh `pk_live_...` và `sk_live_...`. Mã bí mật (`raw_secret`) chỉ được trả về **đúng 1 lần duy nhất** trong response.
  * **Xoay vòng (Rotate) & Thu hồi (Revoke):** Thực hiện thu hồi khóa cũ lập tức và sinh khóa mới (nếu rotate), lưu vết cẩn thận quá trình chuyển giao.
  * **Che giấu dữ liệu (Masking):** Tại các API List/Detail, `api_key` luôn bị làm mờ (chỉ hiện 8 ký tự đầu) và `api_secret_hash` hoàn toàn không được trả về.

## 3. Các Chốt Chặn Bảo Mật Nâng Cao (Security Implementations)
Đội ngũ đã thiết kế các phương thức chống rò rỉ dữ liệu (Data Leakage Prevention) trực tiếp vào tầng dịch vụ:

1. **Thuật toán băm HMAC-SHA256 & Pepper:** 
   * Raw Secret không bao giờ được lưu vào cơ sở dữ liệu. Nó được băm bằng thuật toán HMAC-SHA256 kết hợp với "Pepper" biến môi trường (`API_SECRET_PEPPER`).
   * **Fail-fast:** Cấu hình hệ thống tự động dội lỗi 500 (Exception) nếu thiếu biến môi trường, tuyệt đối không dùng Pepper mặc định để tránh thảm họa bảo mật ở môi trường Production.
2. **Auto-Sanitize Audit Logs (Khử trùng Nhật ký Hệ thống):**
   * Hệ thống ghi log mọi thao tác (`writeAuditLog`) đã được trang bị một hàm đệ quy thông minh: `maskSensitiveFields`.
   * Hàm này sẽ tự động phân tích toàn bộ JSON Payload và chuỗi văn bản (`reason`), tìm kiếm và biến đổi bất kỳ key/value nào chứa từ khóa nhạy cảm (như `password`, `token`, `secret`, `webhook_secret_hash`, `api_key`...) thành chuỗi `***MASKED***`.
   * Sử dụng danh sách Whitelist ID hợp lệ (`merchant_id`, `key_name`...) để tránh che mờ sai mục tiêu.

## 4. Định Hướng Kế Tiếp
Nhờ việc giữ lại các Stub endpoints (`501 Not Implemented`) cho các module chưa phát triển, kiến trúc Routing hiện tại không hề bị gãy.
Mục tiêu tiếp theo có thể hướng tới:
* **Payment Orders / QR Payments:** Triển khai nghiệp vụ tạo/duyệt đơn thanh toán.
* **Transactions & Ledger:** Viết logic lõi tạo Transaction đôi (Double-entry Ledger) cho kế toán.
* **Webhooks:** Hệ thống gửi Retry Webhook bất đồng bộ cho Merchants.

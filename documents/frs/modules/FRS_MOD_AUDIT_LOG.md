# FRS Chi tiết — MOD-AUDIT-LOG: Audit Log & System Log

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Audit Log & System Log ghi nhận và truy vết toàn bộ hoạt động quan trọng trong hệ thống ví điện tử và cổng thanh toán. Vì hệ thống liên quan đến tiền, audit log là yêu cầu bắt buộc để phục vụ kiểm tra, đối soát, xử lý khiếu nại và bảo mật.

Audit log ghi nghiệp vụ người dùng/hệ thống đã làm gì. System log ghi lỗi kỹ thuật, lỗi tích hợp, lỗi webhook, lỗi security và lỗi đối soát.

**Phạm vi chính:**

- Ghi audit log cho thao tác nghiệp vụ
- Ghi security log cho sự kiện bảo mật
- Ghi system log cho lỗi kỹ thuật
- Truy vấn audit/system log
- Lọc log theo actor, action, entity, trace_id
- Mask dữ liệu nhạy cảm
- Không cho sửa/xóa log
- Cấu hình retention log

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| System | Tự động ghi log |
| Admin | Xem audit log và system log |
| Super Admin | Xem toàn bộ log, cấu hình retention |
| Support Staff | Xem log read-only theo quyền |
| Merchant Owner | Xem webhook log/payment log của merchant mình |
| User | Không truy cập audit log hệ thống |

---

## 3. Phân loại log

### 3.1. Audit Log

Ghi nhận hoạt động nghiệp vụ hoặc thao tác quản trị.

Ví dụ:

- User đăng nhập
- User tạo topup
- User chuyển tiền
- User thanh toán QR
- Merchant tạo payment
- Admin khóa ví
- Admin duyệt merchant
- Admin retry webhook
- Super Admin thay đổi setting

### 3.2. Security Log

Ghi nhận sự kiện bảo mật.

Ví dụ:

- Đăng nhập sai nhiều lần
- Sai signature merchant API
- Refresh token reuse
- API key bị revoke
- Request nghi ngờ replay attack

### 3.3. System Log

Ghi lỗi kỹ thuật hoặc vận hành.

Ví dụ:

- Webhook timeout
- Ledger mất cân bằng
- Background job lỗi
- Database transaction rollback
- Payment callback fail
- QR expire job lỗi

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-AUDIT-01: Ghi audit log nghiệp vụ

**Mô tả:**  
Hệ thống tự động ghi audit log cho các sự kiện nghiệp vụ quan trọng.

**Actor:** System

**Các event cần ghi:**

| Module | Event |
|---|---|
| Auth | auth.login_success, auth.login_failed, auth.logout, auth.password_change |
| Wallet | wallet.created, wallet.locked, wallet.unlocked |
| Topup | topup.created, topup.success, topup.failed |
| Transfer | transfer.created, transfer.success, transfer.failed |
| Payment | payment.created, payment.success, payment.failed, payment.expired |
| QR | qr.created, qr.used, qr.expired |
| Refund | refund.created, refund.success, refund.failed |
| Merchant | merchant.created, merchant.approved, merchant.suspended |
| API Key | api_key.created, api_key.rotated, api_key.revoked |
| Webhook | webhook.created, webhook.sent, webhook.retry, webhook.failed |
| Setting | setting.updated |
| Admin | admin.user_locked, admin.wallet_locked |

**Data fields — MongoDB collection `audit_logs`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| _id | ObjectId | Có | Khóa chính MongoDB |
| trace_id | String(100) | Không | ID truy vết request |
| actor_type | String | Có | USER / MERCHANT / ADMIN / SYSTEM |
| actor_id | UUID | Không | ID actor |
| action | String(100) | Có | Tên hành động |
| entity_type | String(100) | Có | Loại đối tượng |
| entity_id | UUID/String | Không | ID đối tượng |
| old_values | JSONB | Không | Giá trị cũ |
| new_values | JSONB | Không | Giá trị mới |
| metadata | JSONB | Không | Dữ liệu bổ sung |
| ip_address | String(45) | Không | IP client |
| user_agent | String(500) | Không | User agent |
| created_at | Timestamp | Có | Thời gian ghi log |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Audit log chỉ được insert, không update/delete |
| BR-02 | Không ghi password, token, API secret plain text |
| BR-03 | Dữ liệu nhạy cảm phải mask trước khi lưu |
| BR-04 | Mỗi request quan trọng nên có trace_id |
| BR-05 | Lỗi ghi audit log không nên làm payment rollback, trừ event bắt buộc theo thiết kế |
| BR-06 | Audit log phải có actor_type và action rõ ràng |

---

### FN-AUDIT-02: Ghi security log

**Mô tả:**  
Hệ thống ghi log cho các sự kiện bảo mật bất thường.

**Actor:** System

**Events security:**

| Event | Khi nào ghi |
|---|---|
| auth.failed_login | Đăng nhập thất bại |
| auth.account_locked | Tài khoản bị khóa do sai nhiều lần |
| token.reuse_detected | Refresh token reuse |
| merchant.signature_invalid | Merchant API sai signature |
| merchant.timestamp_invalid | Request timestamp lệch quá giới hạn |
| api_key.revoked_used | API key đã revoke vẫn được dùng |
| webhook.signature_failed | Merchant báo signature không hợp lệ nếu có phản hồi |
| permission.denied | Actor truy cập API không có quyền |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Security log cần ghi IP, user_agent, request_path |
| BR-02 | Không log raw token/secret |
| BR-03 | Sai signature nhiều lần có thể trigger cảnh báo dashboard |
| BR-04 | Security log severity tối thiểu WARN |
| BR-05 | Security log phải tìm kiếm được theo actor/IP |

---

### FN-AUDIT-03: Ghi system log

**Mô tả:**  
Hệ thống ghi lỗi kỹ thuật và lỗi vận hành.

**Actor:** System

**Log levels:**

| Level | Ý nghĩa |
|---|---|
| INFO | Thông tin vận hành |
| WARN | Cảnh báo cần theo dõi |
| ERROR | Lỗi cần xử lý |
| CRITICAL | Lỗi nghiêm trọng ảnh hưởng tiền/dữ liệu |

**Data fields — MongoDB collection `system_logs`:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| _id | ObjectId | Có | Khóa chính MongoDB |
| trace_id | String(100) | Không | ID truy vết |
| level | String | Có | INFO / WARN / ERROR / CRITICAL |
| module | String(100) | Có | Module phát sinh |
| event | String(100) | Có | Tên sự kiện/lỗi |
| message | Text | Có | Mô tả |
| context | JSONB | Không | Context kỹ thuật đã mask |
| entity_type | String(100) | Không | Đối tượng liên quan |
| entity_id | UUID/String | Không | ID đối tượng |
| created_at | Timestamp | Có | Thời gian ghi |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Lỗi ledger mất cân bằng phải ghi CRITICAL |
| BR-02 | Webhook timeout ghi WARN hoặc ERROR tùy retry |
| BR-03 | Không log secret/token/password |
| BR-04 | System log có thể cleanup theo retention |
| BR-05 | Log phải có module để lọc |

---

### FN-AUDIT-04: Tra cứu audit log

**Mô tả:**  
Admin xem danh sách audit log và lọc theo nhiều điều kiện.

**Actor:** Admin, Super Admin, Support Staff

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Thời gian | created_at |
| Actor | actor_type + actor display |
| Action | action |
| Entity | entity_type/entity_id |
| IP | ip_address |
| Trace ID | trace_id |
| Mô tả | metadata summary |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Từ — đến |
| Actor type | USER / MERCHANT / ADMIN / SYSTEM |
| Actor | Search |
| Action | Select/search |
| Entity type | wallet/payment/merchant/user |
| Entity ID | Search |
| Trace ID | Search |
| IP | Search |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin xem toàn hệ thống |
| BR-02 | Support Staff có thể bị hạn chế action nhạy cảm |
| BR-03 | Không cho sửa/xóa audit log |
| BR-04 | Dữ liệu nhạy cảm phải mask khi hiển thị |
| BR-05 | Danh sách mặc định mới nhất trước |

---

### FN-AUDIT-05: Tra cứu system log

**Mô tả:**  
Admin kỹ thuật tra cứu lỗi hệ thống.

**Actor:** Admin, Super Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Thời gian | created_at |
| Level | INFO / WARN / ERROR / CRITICAL |
| Module | module |
| Event | event |
| Message | message |
| Entity | entity_type/entity_id |
| Trace ID | trace_id |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Level | INFO / WARN / ERROR / CRITICAL |
| Module | Auth / Wallet / Payment / Webhook / Ledger |
| Thời gian | Từ — đến |
| Trace ID | Search |
| Entity | Search |
| Event | Search |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | CRITICAL log phải hiển thị nổi bật |
| BR-02 | System log không cho sửa |
| BR-03 | Có thể cleanup theo retention |
| BR-04 | Log có thể export cho điều tra |
| BR-05 | Không export dữ liệu nhạy cảm không cần thiết |

---

### FN-AUDIT-06: Trace payment flow

**Mô tả:**  
Admin có thể truy vết toàn bộ flow của một payment bằng trace_id, payment_no hoặc merchant_order_id.

**Actor:** Admin

**Thông tin trace hiển thị:**

| Step | Dữ liệu |
|---|---|
| Merchant create payment | Request/auth/signature |
| Payment order | payment status |
| QR generated | qr status |
| User scan QR | scan/resolve event nếu có |
| Payment confirm | success/failed |
| Ledger | transaction + entries |
| Wallet balance | balance before/after |
| Callback | delivery status |
| Audit/System log | events/errors |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Trace phải gom được log theo trace_id hoặc entity_id |
| BR-02 | Không hiển thị secret/token |
| BR-03 | Trace dùng cho admin/support xử lý lỗi |
| BR-04 | Payment flow phải thấy rõ bước nào fail |
| BR-05 | Nếu thiếu trace_id, fallback theo payment_order_id |

---

### FN-AUDIT-07: Export log

**Mô tả:**  
Admin có thể xuất audit/system log theo bộ lọc phục vụ kiểm tra hoặc báo cáo.

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Export theo bộ lọc hiện tại |
| BR-02 | Export phải ghi audit log |
| BR-03 | Không export password/token/API secret |
| BR-04 | File lớn có thể xử lý async |
| BR-05 | Support Staff export có thể bị mask thêm |

---

### FN-AUDIT-08: Retention và cleanup log

**Mô tả:**  
Hệ thống tự động cleanup log cũ theo cấu hình retention.

**Actor:** System, Super Admin

**Retention đề xuất:**

| Log | Default retention |
|---|---|
| Audit log | 365 ngày |
| System log | 90 ngày |
| Webhook log | 180 ngày |
| Security log | 365 ngày |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Audit log quan trọng có thể giữ lâu hơn system log |
| BR-02 | Không cleanup log đang được đánh dấu hold/investigation |
| BR-03 | Cleanup job phải ghi system log |
| BR-04 | Cleanup không được xóa transaction/ledger |
| BR-05 | Retention cấu hình trong MOD-SETTING |

---

## 5. API đề xuất

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/audit-logs` | Danh sách audit log |
| GET | `/api/v1/admin/audit-logs/{id}` | Chi tiết audit log |
| GET | `/api/v1/admin/system-logs` | Danh sách system log |
| GET | `/api/v1/admin/system-logs/{id}` | Chi tiết system log |
| GET | `/api/v1/admin/security-logs` | Danh sách security log |
| GET | `/api/v1/admin/traces/payment/{payment_no}` | Trace payment flow |
| GET | `/api/v1/admin/traces/{trace_id}` | Trace theo trace_id |
| POST | `/api/v1/admin/logs/export` | Export log |
| POST | `/api/v1/admin/logs/cleanup` | Chạy cleanup thủ công nếu cần |

---

## 6. Mapping storage

| Storage | Vai trò |
|---|---|
| MongoDB `audit_logs` | Ghi log nghiệp vụ |
| MongoDB `system_logs` | Ghi log kỹ thuật |
| MongoDB `security_logs` | Login attempt và sự kiện bảo mật |
| MongoDB `webhook_attempt_logs` | Trace request/response callback |
| PostgreSQL `payment_orders` | Nguồn tham chiếu payment |
| PostgreSQL `ledger_transactions`, `ledger_entries` | Nguồn tham chiếu giao dịch tiền |
| PostgreSQL `users`, `merchants` | Actor liên quan |
| PostgreSQL `app_settings` | Retention/mask config |

---

## 7. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-AUTH | Login/security events |
| MOD-WALLET | Tạo/khóa/mở ví |
| MOD-TOPUP | Topup events |
| MOD-TRANSFER | Transfer events |
| MOD-PAYMENT-GATEWAY | Payment flow |
| MOD-QR-PAYMENT | QR events |
| MOD-WEBHOOK | Callback logs |
| MOD-SETTING | Retention/masking |
| MOD-ADMIN | Tra cứu log |

---

## 8. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Hệ thống ghi audit log khi user login/logout |
| AC-02 | Hệ thống ghi audit log khi topup/transfer/payment/refund |
| AC-03 | Admin xem được audit log theo bộ lọc |
| AC-04 | Audit log không cho sửa/xóa |
| AC-05 | Không lưu password/token/API secret plain text |
| AC-06 | Sai signature merchant ghi security log |
| AC-07 | Webhook lỗi ghi system log |
| AC-08 | Ledger mất cân bằng ghi CRITICAL |
| AC-09 | Admin trace được payment flow |
| AC-10 | Export log theo bộ lọc |
| AC-11 | Cleanup log không xóa ledger/transaction |
| AC-12 | Dữ liệu nhạy cảm được mask khi hiển thị |

---

## 9. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Collection security log | Đã chốt | Dùng MongoDB `security_logs` |
| O-02 | Audit log lưu bao lâu? | Đề xuất: 365 ngày | Có thể cấu hình |
| O-03 | Có cần append-only bằng DB trigger không? | Đề xuất: Có nếu làm kỹ | Chặn update/delete |
| O-04 | Có cần gửi alert khi CRITICAL không? | Phase sau | Dashboard cảnh báo trước |
| O-05 | Có cần trace_id bắt buộc mọi request không? | Đề xuất: Có | Rất hữu ích debug |

---

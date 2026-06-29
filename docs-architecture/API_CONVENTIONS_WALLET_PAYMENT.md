# API Conventions — Wallet Payment Gateway

> Phiên bản: 1.0 | Ngày: 08/06/2026  
> Áp dụng cho: Đề tài **Xây dựng Ví điện tử và Cổng thanh toán**  
> Mục tiêu: Thống nhất quy ước API cho toàn team BE, Mobile, Admin Web và Merchant Demo.

---

## 1. Mục tiêu tài liệu

Tài liệu này chốt các quy ước chung khi thiết kế và triển khai API cho hệ thống ví điện tử và cổng thanh toán.

Schema chuẩn là `ewallet_core_db.sql`. PostgreSQL lưu dữ liệu nghiệp vụ; MongoDB lưu audit/system/security/webhook-attempt logs. Không thiết kế repository dựa trên các bảng không tồn tại trong core như `payment_callbacks`, `audit_logs`, `system_logs`, `auth_login_attempts` hoặc `setting_histories`.

Mapping bảng/cột chuẩn được định nghĩa tại `documents/DATABASE_SCHEMA_ALIGNMENT_CORE.md`.

Các mục tiêu chính:

- Thiết kế API theo **business resource**, không theo nút bấm UI.
- Thống nhất `base_url`, route, HTTP method, request/response, error code.
- Thống nhất cơ chế xác thực cho User/Admin và Merchant.
- Thống nhất cách dùng `Idempotency-Key` để chống double request.
- Thống nhất cách xử lý action nghiệp vụ như khóa ví, hủy payment, retry webhook.
- Đảm bảo API đủ an toàn cho các nghiệp vụ liên quan đến tiền.

---

## 2. Nguyên tắc cốt lõi

| # | Nguyên tắc |
|---|---|
| 1 | API ưu tiên thiết kế theo business resource |
| 2 | Không thiết kế API theo tên button hoặc tên màn hình UI |
| 3 | JSON request/response dùng `snake_case` |
| 4 | Enum dùng business code dạng `UPPERCASE` |
| 5 | Mọi response JSON dùng envelope thống nhất |
| 6 | Mọi response JSON có `trace_id` |
| 7 | Endpoint có side effect nhạy cảm phải dùng `Idempotency-Key` |
| 8 | Giao dịch tiền phải xử lý trong database transaction |
| 9 | Không hard delete dữ liệu giao dịch tiền |
| 10 | Merchant API phải dùng API Key + Signature |
| 11 | Webhook gửi về merchant phải có Signature |
| 12 | Business rule nằm ở service/domain layer, controller chỉ điều phối |

`merchant_api_keys.api_secret_hash` và `merchant_callback_configs.webhook_secret_hash` không phải khóa HMAC có thể sử dụng trực tiếp. Khóa ký thực tế phải được quản lý trong secret manager/KMS; DB chỉ lưu hash/fingerprint.

---

## 3. Base URL

Tất cả API version 1 dùng prefix:

```http
/api/v1
```

Ví dụ:

```http
POST /api/v1/auth/login
GET  /api/v1/wallets/me
POST /api/v1/transfers
POST /api/v1/merchant/payments
```

---

## 4. Nhóm API chính

| Nhóm | Prefix | Mô tả |
|---|---|---|
| Auth | `/auth` | Đăng ký, đăng nhập, token |
| User Wallet | `/wallets`, `/topups`, `/transfers`, `/transactions` | API cho user ví |
| QR Payment | `/qr-payments` | User quét QR và xác nhận thanh toán |
| Merchant Portal/API | `/merchant/...` | Merchant tạo payment, refund, xem webhook |
| Admin | `/admin/...` | Admin quản trị hệ thống |
| Reports | `/reports/...` hoặc `/admin/reports/...` | Báo cáo |
| Audit | `/admin/audit-logs`, `/admin/system-logs` | Log và truy vết |
| Platform | `/health`, `/status` | Health check/status |

---

## 5. Auth & Security Convention

### 5.1. User/Admin API

Các API protected của User/Admin dùng:

```http
Authorization: Bearer <access_token>
```

JWT tối thiểu nên có:

| Claim | Mô tả |
|---|---|
| `sub` | User ID |
| `roles` | Danh sách role |
| `permissions` | Danh sách permission |
| `token_type` | ACCESS |
| `iat` | Issued at |
| `exp` | Expired at |

Ví dụ role:

```text
USER
MERCHANT_OWNER
MERCHANT_STAFF
ADMIN
SUPER_ADMIN
SUPPORT_STAFF
```

### 5.2. Merchant API

Merchant API dùng API Key + Signature.

Required headers:

```http
X-API-Key: <merchant_api_key>
X-Timestamp: <unix_timestamp_or_iso>
X-Signature: <hmac_signature>
Content-Type: application/json
Idempotency-Key: <required-for-create-payment/refund>
```

Signature payload đề xuất:

```text
METHOD + "\n" +
PATH + "\n" +
X-Timestamp + "\n" +
SHA256(raw_body)
```

Sau đó ký bằng HMAC-SHA256 với `api_secret`.

Business rules:

| # | Rule |
|---|---|
| SEC-01 | API key phải ACTIVE |
| SEC-02 | Merchant phải ACTIVE |
| SEC-03 | Timestamp không được lệch quá cấu hình, ví dụ 5 phút |
| SEC-04 | Signature sai trả `SIGNATURE_INVALID` |
| SEC-05 | Không log API secret |
| SEC-06 | API secret chỉ hiển thị một lần khi tạo |

### 5.3. Webhook Signature

Webhook gửi về merchant phải có:

```http
X-Webhook-Id: <event_id>
X-Webhook-Event: <event_type>
X-Timestamp: <timestamp>
X-Signature: <signature>
X-Retry-Count: <retry_count>
```

Payload ký đề xuất:

```text
timestamp + "." + raw_body
```

---

## 6. Required headers

### 6.1. API thông thường

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### 6.2. API có side effect nhạy cảm

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: <unique_key>
```

### 6.3. Merchant API

```http
X-API-Key: <merchant_api_key>
X-Timestamp: <timestamp>
X-Signature: <signature>
Content-Type: application/json
Idempotency-Key: <unique_key>
```

### 6.4. Optional headers

```http
X-Request-Id: <client_request_id>
Accept-Language: vi-VN
```

---

## 7. Route convention

### 7.1. CRUD chuẩn

```http
GET    /resources
POST   /resources
GET    /resources/{id}
PATCH  /resources/{id}
DELETE /resources/{id}
```

`DELETE` chỉ dùng khi thật sự hợp nghĩa business. Với giao dịch tiền, không dùng hard delete.

### 7.2. Business action

Khi thao tác là state transition hoặc action nghiệp vụ:

```http
POST /resources/{id}/actions/{action}
```

Ví dụ:

```http
POST /admin/wallets/{id}/actions/lock
POST /admin/wallets/{id}/actions/unlock
POST /admin/merchants/{id}/actions/suspend
POST /admin/webhooks/{id}/actions/retry
POST /merchant/payments/{id}/actions/cancel
```

### 7.3. Nested route

Dùng khi resource con thuộc rõ resource cha:

```http
GET  /admin/merchants/{id}/api-keys
POST /admin/merchants/{id}/api-keys
GET  /admin/payment-orders/{id}/callbacks
GET  /admin/payment-orders/{id}/ledger
GET  /admin/wallets/{id}/ledger
```

### 7.4. Summary/history/ledger routes

```http
GET /wallets/me/summary
GET /wallets/me/history
GET /wallets/me/ledger
GET /admin/wallets/{id}/summary
GET /admin/wallets/{id}/ledger
GET /admin/payment-orders/{id}/timeline
```

---

## 8. HTTP method convention

| Method | Dùng cho |
|---|---|
| GET | Read-only |
| POST | Create resource, transaction document, business action |
| PATCH | Partial update |
| DELETE | Xóa resource nếu business cho phép |
| PUT | Hạn chế dùng; chỉ dùng khi replace toàn bộ resource |

Không dùng `GET` cho action thay đổi dữ liệu.

Không dùng `DELETE` thay cho:

```text
cancel
lock
deactivate
suspend
refund
reverse
```

---

## 9. JSON naming convention

Request và response dùng `snake_case`.

Đúng:

```json
{
  "merchant_order_id": "ORDER001",
  "callback_url": "https://merchant.example.com/callback",
  "expired_at": "2026-06-08T10:00:00Z"
}
```

Không dùng:

```json
{
  "merchantOrderId": "ORDER001",
  "callbackUrl": "..."
}
```

---

## 10. Enum convention

Enum dùng business code string dạng `UPPERCASE`.

Ví dụ:

```json
{
  "transaction_type": "PAYMENT",
  "entry_type": "DEBIT",
  "status": "SUCCESS"
}
```

Các enum chính:

| Nhóm | Values |
|---|---|
| wallet_status | ACTIVE / LOCKED / CLOSED |
| transaction_status | PENDING / SUCCESS / FAILED / CANCELED |
| payment_order_status | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| qr_status | ACTIVE / USED / EXPIRED / CANCELED |
| webhook_status | PENDING / SUCCESS / RETRYING / FAILED |
| merchant_status | PENDING_REVIEW / ACTIVE / SUSPENDED / REJECTED / CLOSED |

---

## 11. Query convention

Tất cả list API ưu tiên dùng chung convention:

| Query | Mô tả |
|---|---|
| `filters` | Chuỗi điều kiện lọc |
| `sorts` | Chuỗi sắp xếp |
| `page` | Trang hiện tại |
| `page_size` | Số item/trang |
| `include` | Include relation |
| `fields` | Chỉ lấy một số field |
| `include_inactive` | Có lấy dữ liệu inactive/locked không |

Ví dụ:

```http
GET /api/v1/admin/payment-orders?filters=status==PAID;merchant_id==uuid&sorts=-created_at&page=1&page_size=20
GET /api/v1/transactions/me?filters=transaction_type==PAYMENT&sorts=-created_at&page=1&page_size=20
GET /api/v1/admin/wallets/{id}?include=balance,ledger
```

### 11.1. Filter operators đề xuất

| Operator | Ý nghĩa | Ví dụ |
|---|---|---|
| `==` | Bằng | `status==PAID` |
| `!=` | Khác | `status!=FAILED` |
| `>=` | Lớn hơn hoặc bằng | `amount>=100000` |
| `<=` | Nhỏ hơn hoặc bằng | `amount<=500000` |
| `@=*` | Contains | `merchant_name@=*coffee*` |
| `in` | Nằm trong danh sách | `status=in=(PAID,EXPIRED)` |

### 11.2. Sort convention

```http
sorts=-created_at
sorts=amount,-created_at
```

Dấu `-` là descending.

---

## 12. Response envelope

Tất cả JSON API response dùng envelope.

### 12.1. Success detail/create/action

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "trace_id": "trace-001"
}
```

### 12.2. Success list

```json
{
  "success": true,
  "message": "OK",
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "sorts": "-created_at",
    "filters": "status==PAID"
  },
  "trace_id": "trace-001"
}
```

### 12.3. Async/export response

```json
{
  "success": true,
  "message": "Job queued",
  "data": {
    "job_id": "job_export_001",
    "status": "QUEUED"
  },
  "meta": {
    "resource": "reports_export"
  },
  "trace_id": "trace-001"
}
```

### 12.4. Error response

```json
{
  "success": false,
  "message": "Validation error",
  "error_code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "amount",
      "message": "amount must be greater than 0"
    }
  ],
  "trace_id": "trace-001"
}
```

### 12.5. Ngoại lệ response envelope

Các trường hợp có thể không dùng JSON envelope:

| Trường hợp | Ghi chú |
|---|---|
| Download file | Dùng `Content-Disposition` |
| Webhook callback response từ merchant | Merchant có thể trả body riêng |
| Health check rất đơn giản | Có thể trả JSON ngắn gọn |
| `204 No Content` | Chỉ dùng khi thật sự không có body |

---

## 13. Error code convention

### 13.1. Common error

| Code | HTTP | Mô tả |
|---|---:|---|
| VALIDATION_ERROR | 400 | Lỗi validate input |
| UNAUTHORIZED | 401 | Chưa đăng nhập/token sai |
| FORBIDDEN | 403 | Không có quyền |
| NOT_FOUND | 404 | Không tìm thấy resource |
| CONFLICT | 409 | Xung đột dữ liệu |
| INTERNAL_SERVER_ERROR | 500 | Lỗi hệ thống |

### 13.2. Auth error

| Code | HTTP | Mô tả |
|---|---:|---|
| INVALID_CREDENTIALS | 401 | Sai thông tin đăng nhập |
| ACCOUNT_LOCKED | 403 | Tài khoản bị khóa |
| TOKEN_EXPIRED | 401 | Token hết hạn |
| REFRESH_TOKEN_INVALID | 401 | Refresh token không hợp lệ |
| PASSWORD_RESET_TOKEN_INVALID | 400 | Reset token không hợp lệ |

### 13.3. Wallet/Transaction error

| Code | HTTP | Mô tả |
|---|---:|---|
| WALLET_NOT_FOUND | 404 | Không tìm thấy ví |
| WALLET_NOT_ACTIVE | 400 | Ví không hoạt động |
| INSUFFICIENT_BALANCE | 400 | Số dư không đủ |
| LIMIT_EXCEEDED | 400 | Vượt hạn mức |
| LEDGER_UNBALANCED | 500 | Ledger debit/credit không cân bằng |
| TRANSACTION_ALREADY_PROCESSED | 409 | Giao dịch đã xử lý |

### 13.4. Payment/Merchant error

| Code | HTTP | Mô tả |
|---|---:|---|
| MERCHANT_NOT_FOUND | 404 | Không tìm thấy merchant |
| MERCHANT_NOT_ACTIVE | 403 | Merchant không hoạt động |
| API_KEY_INVALID | 401 | API key không hợp lệ |
| SIGNATURE_INVALID | 401 | Signature sai |
| TIMESTAMP_EXPIRED | 401 | Timestamp quá hạn |
| PAYMENT_NOT_FOUND | 404 | Không tìm thấy payment |
| PAYMENT_EXPIRED | 400 | Payment hết hạn |
| PAYMENT_ALREADY_PAID | 409 | Payment đã thanh toán |
| PAYMENT_NOT_PAYABLE | 400 | Payment không thể thanh toán |
| QR_INVALID | 400 | QR không hợp lệ |
| QR_EXPIRED | 400 | QR hết hạn |
| QR_ALREADY_USED | 409 | QR đã dùng |

### 13.5. Idempotency error

| Code | HTTP | Mô tả |
|---|---:|---|
| IDEMPOTENCY_KEY_REQUIRED | 400 | Thiếu Idempotency-Key |
| IDEMPOTENCY_CONFLICT | 409 | Cùng key nhưng payload khác |
| REQUEST_PROCESSING | 409 | Request cùng key đang xử lý |

---

## 14. Idempotency convention

### 14.1. Header

```http
Idempotency-Key: <unique_key>
```

### 14.2. Bắt buộc với endpoint

| Endpoint | Lý do |
|---|---|
| `POST /topups` | Tránh cộng tiền nhiều lần |
| `POST /transfers` | Tránh chuyển tiền nhiều lần |
| `POST /merchant/payments` | Tránh tạo payment trùng |
| `POST /qr-payments/{qr_token}/confirm` | Tránh double payment |
| `POST /merchant/refunds` | Tránh refund nhiều lần |
| `POST /admin/refunds` | Tránh refund nhiều lần |

### 14.3. Rule xử lý

| Trường hợp | Xử lý |
|---|---|
| Key mới | Xử lý request |
| Key cũ + payload giống | Trả lại response cũ |
| Key cũ + payload khác | Trả `IDEMPOTENCY_CONFLICT` |
| Key đang PROCESSING | Trả `REQUEST_PROCESSING` hoặc chờ theo cấu hình |
| Key hết hạn | Có thể xử lý như key mới tùy retention |

---

## 15. Permission convention

Pattern:

```text
<module>.<resource>.<action>
```

Ví dụ:

```text
access-control.users.read
wallet.wallets.read
wallet.wallets.lock
wallet.topups.create
wallet.transfers.create
payment.payment-orders.create
payment.payment-orders.read
payment.qr-payments.confirm
merchant.merchants.read
merchant.api-keys.create
webhook.callbacks.retry
reports.payments.read
operations.settings.update
audit.audit-logs.read
```

Không hard-code permission string rải rác trong code. Nên tập trung permission code ở constants/config.

---

## 16. Không hard delete dữ liệu tiền

Không dùng `DELETE` cho:

```text
wallets
wallet_balances
ledger_transactions
ledger_entries
deposit_transactions
wallet_transfers
payment_orders
payment_transactions
refund_transactions
outbox_events
```

MongoDB `audit_logs`, `system_logs`, `security_logs` và `webhook_attempt_logs` cũng là append-only ở tầng ứng dụng.

Thay vào đó dùng:

```http
POST /admin/wallets/{id}/actions/lock
POST /merchant/payments/{id}/actions/cancel
POST /admin/merchants/{id}/actions/suspend
```

---

## 17. Side effects phải ghi rõ trong API spec

Mỗi API có side effect phải ghi rõ:

| API | Side effects |
|---|---|
| `POST /topups` | Tạo deposit, ledger TOPUP, cộng ví, audit |
| `POST /transfers` | Tạo transfer, ledger TRANSFER, trừ/cộng 2 ví, audit |
| `POST /merchant/payments` | Tạo payment order, QR, idempotency, audit |
| `POST /qr-payments/{qr_token}/confirm` | Tạo payment transaction, ledger PAYMENT, trừ ví user, cộng merchant, QR USED, tạo outbox event |
| `POST /merchant/refunds` | Tạo refund, ledger REFUND, cộng ví user, tạo outbox event refund |
| `POST /admin/webhooks/{id}/actions/retry` | Gửi lại callback, không tạo payment mới |

---

## 18. Pagination lớn

Với danh sách giao dịch lớn có thể hỗ trợ cursor pagination:

```http
GET /api/v1/transactions/me?after=cursor_abc&limit=20
GET /api/v1/admin/audit-logs?after=cursor_xyz&limit=50
```

MVP vẫn có thể dùng `page/page_size`.

---

## 19. Date/time convention

- Tất cả timestamp trả về dùng UTC ISO-8601.
- Field nên dùng hậu tố `_at`.

Ví dụ:

```json
{
  "created_at": "2026-06-08T09:00:00Z",
  "paid_at": "2026-06-08T09:05:00Z",
  "expired_at": "2026-06-08T09:15:00Z"
}
```

---

## 20. Money convention

- Tiền VND lưu dạng số nguyên `BIGINT`.
- Không dùng floating number cho amount.
- API request/response dùng integer.

Ví dụ:

```json
{
  "amount": 100000,
  "currency": "VND"
}
```

---

## 21. File/export convention

Export report dùng async job nếu dữ liệu lớn.

```http
POST /api/v1/admin/reports/payments/export
```

Response:

```json
{
  "success": true,
  "message": "Export queued",
  "data": {
    "job_id": "job_export_payments_001",
    "status": "QUEUED"
  },
  "trace_id": "trace-export-001"
}
```

---

## 22. Checklist khi thêm endpoint mới

1. Xác định đúng module boundary.
2. Xác định resource route, tránh UI route.
3. Xác định CRUD hay action endpoint.
4. Dùng `snake_case`.
5. Enum dùng uppercase string.
6. Có response envelope.
7. Có `trace_id`.
8. Có permission/role.
9. Có idempotency nếu side effect nhạy cảm.
10. Có error code chuẩn.
11. Có side effects và DB tables affected.
12. Có transaction boundary nếu liên quan tiền.
13. Không hard delete giao dịch tiền.
14. Cập nhật Swagger/OpenAPI.

---

## 23. Checklist khi review endpoint

1. Route có resource-first không?
2. Có dùng đúng method không?
3. Response có envelope và trace_id không?
4. Request/response có `snake_case` không?
5. Enum có thống nhất với DB không?
6. Endpoint có side effect đã có `Idempotency-Key` chưa?
7. Business rule có nằm ở service/domain không?
8. Có ghi audit log không?
9. Có transaction boundary không?
10. Có permission guard không?
11. Có lộ secret/token/password không?
12. Có phù hợp FRS và DB schema không?

---

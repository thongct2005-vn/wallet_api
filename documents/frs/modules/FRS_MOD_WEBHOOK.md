# FRS Chi tiết — MOD-WEBHOOK: Callback & Webhook Merchant

> Phiên bản: 1.0 | Ngày: 09/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán  
> Mục tiêu: Chuẩn hóa nghiệp vụ callback/webhook để merchant nhận kết quả payment/refund từ hệ thống ví điện tử.

---

## 1. Tổng quan module

Module Webhook quản lý việc tạo, ký, gửi, retry và tra cứu callback từ hệ thống ví điện tử/cổng thanh toán đến merchant. Webhook giúp merchant nhận kết quả giao dịch một cách tự động sau khi payment hoặc refund được xử lý.

Webhook là thành phần kết nối giữa:

- MOD-PAYMENT-GATEWAY: tạo webhook khi payment thành công/thất bại/hết hạn/hủy.
- MOD-QR-PAYMENT: tạo webhook sau khi user xác nhận thanh toán QR thành công.
- MOD-REFUND: tạo webhook sau khi hoàn tiền thành công/thất bại.
- MOD-MERCHANT: dùng callback config và webhook secret của merchant.
- MOD-AUDIT-LOG: ghi audit log khi retry hoặc thay đổi trạng thái webhook.
- MOD-ADMIN: quản trị callback, xem lỗi và retry thủ công.
- MOD-REPORT/DASHBOARD: thống kê callback success/failed/retrying.

**Phạm vi chính:**

- Tạo webhook event sau payment/refund.
- Build payload callback.
- Ký webhook signature.
- Gửi callback đến merchant.
- Lưu request/response callback.
- Retry webhook tự động khi timeout hoặc non-2xx.
- Retry webhook thủ công bởi Admin/Merchant nếu có quyền.
- Cho Merchant/Admin xem webhook log.
- Không rollback payment/refund khi callback lỗi.

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| System | Tạo webhook event, ký payload, gửi callback, retry tự động, cập nhật trạng thái |
| Merchant Owner | Xem webhook của merchant mình, retry webhook nếu được cấp quyền |
| Merchant Staff | Xem webhook theo quyền được cấp |
| Admin | Xem toàn bộ webhook, retry thủ công, kiểm tra lỗi callback |
| Super Admin | Xem toàn bộ webhook, cấu hình retry/timeout/logging |
| Support Staff | Xem webhook read-only theo quyền |

---

## 3. Khái niệm nghiệp vụ

### 3.1. Webhook Event

Webhook event là bản ghi callback được tạo sau khi một sự kiện quan trọng xảy ra, ví dụ payment thành công hoặc refund thành công. Mỗi event có `event_id` duy nhất để merchant có thể chống xử lý trùng.

### 3.2. Callback URL

Callback URL là endpoint phía merchant dùng để nhận kết quả thanh toán/hoàn tiền. Callback URL có thể lấy từ:

1. `callback_url` merchant truyền khi tạo payment.
2. `default_callback_url` trong cấu hình merchant nếu request không truyền callback riêng.

### 3.3. Webhook Signature

Webhook signature là chữ ký HMAC dùng để merchant xác minh callback thật sự được gửi từ hệ thống ví điện tử. Payload ký đề xuất:

```text
timestamp + "." + raw_body
```

### 3.4. Webhook Lifecycle

```text
PENDING
  ├── SUCCESS
  ├── RETRYING
  └── FAILED
```

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-WEBHOOK-01: Tạo webhook event

**Mô tả:**  
Hệ thống tạo webhook event khi có sự kiện payment/refund cần thông báo cho merchant.

**Actor:** System

**Khi nào tạo webhook:**

| Event type | Khi nào tạo |
|---|---|
| PAYMENT_SUCCESS | Payment được thanh toán thành công |
| PAYMENT_FAILED | Payment thất bại nếu hệ thống cần thông báo merchant |
| PAYMENT_EXPIRED | Payment hết hạn nếu cấu hình có gửi event expired |
| PAYMENT_CANCELED | Payment bị hủy |
| REFUND_SUCCESS | Refund thành công |
| REFUND_FAILED | Refund thất bại cuối cùng |

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Module nghiệp vụ phát sinh event payment/refund |
| 2 | Hệ thống lấy merchant callback config |
| 3 | Xác định callback_url cần gửi |
| 4 | Build payload webhook |
| 5 | Tạo event_id unique |
| 6 | Lấy khóa ký từ secret manager/KMS và ký payload; PostgreSQL chỉ lưu `webhook_secret_hash` |
| 7 | Lưu `outbox_events` trạng thái PENDING trong cùng transaction nghiệp vụ |
| 8 | Worker đọc outbox, ký payload và gửi callback |

**Data fields — outbox_events:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---:|---|
| id | UUID | Có | Khóa chính |
| aggregate_type | String(100) | Có | PAYMENT_ORDER / REFUND_TRANSACTION |
| aggregate_id | UUID | Có | ID nghiệp vụ nguồn |
| event_type | String(100) | Có | PAYMENT_SUCCESS / REFUND_SUCCESS / ... |
| payload | JSONB | Có | Payload sự kiện không chứa secret |
| status | String(20) | Có | PENDING / PROCESSING / SUCCESS / FAILED |
| created_at | Timestamp | Có | Thời gian tạo |

Mỗi lần gửi callback được ghi vào MongoDB collection `webhook_attempt_logs`, gồm `event_id`, `aggregate_id`, `merchant_id`, `callback_url`, chữ ký, request/response, HTTP status, retry count, next retry, sent time và last error.

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi webhook event phải có `event_id` unique |
| BR-02 | Payment/refund success nên tạo webhook nếu merchant bật callback |
| BR-03 | Callback URL phải lấy từ payment request hoặc merchant default config |
| BR-04 | Nếu merchant tắt callback thì không gửi, nhưng có thể ghi log tùy thiết kế |
| BR-05 | Callback lỗi không rollback payment/refund |
| BR-06 | Webhook payload không được chứa API secret, password, token |
| BR-07 | Tạo webhook event phải nằm sau khi nghiệp vụ tiền đã xử lý thành công |

---

### FN-WEBHOOK-02: Gửi callback cho merchant

**Mô tả:**  
Hệ thống gửi HTTP POST đến callback URL của merchant.

**Actor:** System, Merchant

**HTTP method:**

```http
POST <merchant_callback_url>
```

**Headers hệ thống gửi:**

| Header | Mô tả |
|---|---|
| X-Webhook-Id | event_id |
| X-Webhook-Event | event_type |
| X-Timestamp | Thời điểm ký/gửi |
| X-Signature | Chữ ký HMAC |
| X-Retry-Count | Số lần retry hiện tại |
| Content-Type | application/json |

**Payload PAYMENT_SUCCESS đề xuất:**

```json
{
  "event_id": "CBK000001",
  "event_type": "PAYMENT_SUCCESS",
  "payment_order_id": "uuid",
  "payment_no": "PAY000001",
  "merchant_order_id": "ORDER001",
  "amount": 320000,
  "currency": "VND",
  "status": "PAID",
  "transaction_no": "TXN000003",
  "paid_at": "2026-06-08T09:03:00Z",
  "timestamp": "2026-06-08T09:03:05Z",
  "metadata": {}
}
```

**Payload REFUND_SUCCESS đề xuất:**

```json
{
  "event_id": "CBK000002",
  "event_type": "REFUND_SUCCESS",
  "refund_id": "uuid",
  "refund_no": "RFD000001",
  "payment_order_id": "uuid",
  "payment_no": "PAY000001",
  "merchant_order_id": "ORDER001",
  "amount": 100000,
  "currency": "VND",
  "status": "SUCCESS",
  "transaction_no": "TXN000004",
  "refunded_at": "2026-06-08T09:30:00Z",
  "timestamp": "2026-06-08T09:30:05Z"
}
```

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant trả HTTP 2xx thì callback được xem là SUCCESS |
| BR-02 | Merchant trả non-2xx thì callback được xem là lỗi và có thể retry |
| BR-03 | Timeout được xem là lỗi callback |
| BR-04 | Mọi request/response callback phải được lưu để tra cứu |
| BR-05 | Nếu webhook disabled toàn hệ thống thì không gửi callback mới |
| BR-06 | Không gửi lại callback SUCCESS trừ khi có action nghiệp vụ đặc biệt |

---

### FN-WEBHOOK-03: Retry webhook tự động

**Mô tả:**  
Hệ thống tự động gửi lại webhook khi callback bị timeout hoặc merchant trả non-2xx.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Callback gửi thất bại |
| 2 | Hệ thống tăng retry_count trong MongoDB `webhook_attempt_logs` |
| 3 | Nếu retry_count < webhook_max_retry, ghi attempt status = RETRYING |
| 4 | Tính next_retry_at theo webhook_retry_schedule và lưu trong attempt log |
| 5 | Job retry quét callback đến hạn |
| 6 | Gửi lại callback |
| 7 | Nếu thành công, cập nhật outbox/attempt status = SUCCESS |
| 8 | Nếu quá số lần retry, cập nhật outbox/attempt status = FAILED |

**Settings liên quan:**

| Setting | Mô tả |
|---|---|
| webhook_enabled | Bật/tắt gửi webhook |
| webhook_timeout_seconds | Timeout khi gọi merchant |
| webhook_max_retry | Số lần retry tối đa |
| webhook_retry_schedule | Lịch retry, ví dụ 1m,5m,15m,1h,6h |
| webhook_require_signature | Bắt buộc ký callback |
| webhook_log_body_enabled | Có lưu request/response body hay không |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Retry không tạo payment/refund mới |
| BR-02 | Retry chỉ gửi lại callback payload của event đã tạo |
| BR-03 | Quá max retry thì status = FAILED |
| BR-04 | Retry phải cập nhật retry_count và sent_at |
| BR-05 | Retry lỗi nhiều lần cần ghi system log WARN/ERROR |

---

### FN-WEBHOOK-04: Retry webhook thủ công

**Mô tả:**  
Admin hoặc Merchant Owner có thể retry webhook thủ công nếu callback bị lỗi và nguyên nhân đã được xử lý.

**Actor:** Admin, Merchant Owner

**Endpoint liên quan:**

```http
POST /api/v1/admin/webhooks/{id}/actions/retry
POST /api/v1/merchant/webhooks/{id}/actions/retry
```

**Input fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---:|---|
| reason | String(500) | Có với Admin | Lý do retry thủ công |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ retry webhook status FAILED hoặc RETRYING |
| BR-02 | Không retry webhook SUCCESS |
| BR-03 | Merchant chỉ retry webhook của chính merchant mình |
| BR-04 | Admin có thể retry toàn hệ thống |
| BR-05 | Retry thủ công phải ghi audit log |
| BR-06 | Retry không thay đổi trạng thái payment/refund gốc |

---

### FN-WEBHOOK-05: Merchant xem webhook log

**Mô tả:**  
Merchant xem danh sách webhook của merchant mình để kiểm tra callback success/failed/retrying.

**Actor:** Merchant Owner, Merchant Staff

**Endpoint liên quan:**

```http
GET /api/v1/merchant/webhooks
GET /api/v1/merchant/webhooks/{id}
```

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Event ID | event_id |
| Event type | PAYMENT_SUCCESS / REFUND_SUCCESS / ... |
| Payment | payment_no nếu có |
| Refund | refund_no nếu có |
| Callback URL | URL đã gửi |
| Status | PENDING / SUCCESS / RETRYING / FAILED |
| HTTP status | http_status |
| Retry count | retry_count |
| Last error | last_error |
| Sent at | sent_at |
| Created at | created_at |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem webhook của chính mình |
| BR-02 | Không hiển thị webhook secret |
| BR-03 | Request/response body có thể mask dữ liệu nhạy cảm |
| BR-04 | Danh sách mặc định mới nhất trước |

---

### FN-WEBHOOK-06: Admin xem webhook log

**Mô tả:**  
Admin xem toàn bộ webhook/callback trong hệ thống để xử lý lỗi vận hành.

**Actor:** Admin, Support Staff

**Endpoint liên quan:**

```http
GET /api/v1/admin/webhooks
GET /api/v1/admin/webhooks/{id}
```

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Từ ngày — đến ngày |
| Merchant | Search/chọn merchant |
| Event type | PAYMENT_SUCCESS / REFUND_SUCCESS / ... |
| Status | PENDING / SUCCESS / RETRYING / FAILED |
| HTTP status | 2xx / 4xx / 5xx / timeout |
| Retry count | Từ — đến |
| Event ID | Search |
| Payment no | Search |
| Refund no | Search |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin xem toàn bộ webhook |
| BR-02 | Support Staff có thể chỉ xem read-only |
| BR-03 | Callback FAILED phải dễ truy vết sang payment/refund gốc |
| BR-04 | Không hiển thị webhook secret |
| BR-05 | Export webhook log phải mask dữ liệu nhạy cảm nếu cần |

---

### FN-WEBHOOK-07: Xác thực webhook signature phía merchant

**Mô tả:**  
Merchant dùng `X-Signature`, `X-Timestamp` và raw body để xác minh callback.

**Actor:** Merchant

**Quy trình verify đề xuất:**

| Bước | Hành động |
|---|---|
| 1 | Merchant nhận callback |
| 2 | Lấy `X-Timestamp`, `X-Signature` |
| 3 | Kiểm tra timestamp không quá lệch |
| 4 | Build signing payload = timestamp + "." + raw_body |
| 5 | Ký HMAC-SHA256 bằng webhook secret |
| 6 | So sánh chữ ký |
| 7 | Nếu hợp lệ, xử lý event |
| 8 | Nếu trùng event_id đã xử lý, trả 2xx và không xử lý lại |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant nên chống replay attack bằng timestamp |
| BR-02 | Merchant nên lưu event_id đã xử lý để chống trùng callback |
| BR-03 | Hệ thống không gửi webhook secret trong payload |
| BR-04 | Signature sai phía merchant không làm payment/refund rollback |

---

### FN-WEBHOOK-08: Job retry due webhook

**Mô tả:**  
Hệ thống có job quét các callback đến hạn retry.

**Actor:** System, Admin

**Endpoint demo liên quan:**

```http
POST /api/v1/admin/webhooks/jobs/retry-due
```

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Job chạy theo lịch hoặc Admin trigger demo |
| 2 | Tìm outbox PENDING/FAILED và attempt RETRYING đến hạn theo `next_retry_at` trong MongoDB |
| 3 | Gửi lại callback |
| 4 | Cập nhật trạng thái theo kết quả |
| 5 | Ghi system log nếu job lỗi |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Job retry phải có limit batch để tránh spam merchant |
| BR-02 | Job không xử lý callback SUCCESS |
| BR-03 | Job lỗi không ảnh hưởng payment/refund gốc |
| BR-04 | Nếu callback quá max retry thì chuyển FAILED |

---

## 5. Data model liên quan

### 5.1. merchant_callback_configs

| Trường | Mô tả |
|---|---|
| merchant_id | Merchant sở hữu cấu hình |
| default_callback_url | URL callback mặc định |
| default_redirect_url | URL redirect mặc định nếu có |
| webhook_secret_hash | Hash/fingerprint để quản lý rotation; khóa HMAC thực tế nằm trong secret manager/KMS |
| callback_enabled | Bật/tắt callback |
| retry_enabled | Bật/tắt retry |

### 5.2. outbox_events

Bảng PostgreSQL lưu sự kiện cần phát đi. Worker xử lý event theo `status`; chi tiết từng lần gửi và retry được lưu trong MongoDB `webhook_attempt_logs`.

---

## 6. Error codes đề xuất

| Code | HTTP | Mô tả |
|---|---:|---|
| CALLBACK_NOT_FOUND | 404 | Không tìm thấy callback |
| CALLBACK_NOT_RETRYABLE | 400 | Callback không thể retry |
| CALLBACK_RETRY_LIMIT_EXCEEDED | 400 | Callback đã vượt số lần retry |
| CALLBACK_URL_INVALID | 400 | Callback URL không hợp lệ |
| WEBHOOK_DISABLED | 400 | Webhook đang bị tắt |
| WEBHOOK_SIGNATURE_FAILED | 400 | Verify signature thất bại ở phía merchant nếu có phản hồi |
| MERCHANT_NOT_ACTIVE | 403 | Merchant không hoạt động |
| FORBIDDEN | 403 | Không có quyền xem/retry callback |

---

## 7. Business rules tổng hợp

| Mã rule | Nội dung |
|---|---|
| BR-WEBHOOK-01 | Callback lỗi không rollback payment/refund |
| BR-WEBHOOK-02 | Webhook phải có signature |
| BR-WEBHOOK-03 | Webhook payload không chứa secret/token/password |
| BR-WEBHOOK-04 | Merchant chỉ xem webhook của chính mình |
| BR-WEBHOOK-05 | Admin xem toàn bộ webhook |
| BR-WEBHOOK-06 | Retry webhook không tạo giao dịch tiền mới |
| BR-WEBHOOK-07 | Chỉ callback FAILED/RETRYING/PENDING hợp lệ mới retry |
| BR-WEBHOOK-08 | HTTP 2xx là thành công |
| BR-WEBHOOK-09 | Timeout/non-2xx phải lưu response/error |
| BR-WEBHOOK-10 | Mọi retry thủ công phải ghi audit log |
| BR-WEBHOOK-11 | Retry tự động quá max retry thì chuyển FAILED |
| BR-WEBHOOK-12 | Webhook log phải truy vết được bằng event_id, payment_no/refund_no, merchant_id, trace_id |

---

## 8. Liên kết với API Design

| Chức năng | Endpoint |
|---|---|
| Merchant xem webhook | GET `/api/v1/merchant/webhooks` |
| Merchant xem chi tiết webhook | GET `/api/v1/merchant/webhooks/{id}` |
| Merchant retry webhook | POST `/api/v1/merchant/webhooks/{id}/actions/retry` |
| Admin xem webhook | GET `/api/v1/admin/webhooks` |
| Admin xem chi tiết webhook | GET `/api/v1/admin/webhooks/{id}` |
| Admin retry webhook | POST `/api/v1/admin/webhooks/{id}/actions/retry` |
| Admin chạy retry due job demo | POST `/api/v1/admin/webhooks/jobs/retry-due` |

---

## 9. Acceptance Criteria

| # | Tiêu chí nghiệm thu |
|---|---|
| AC-01 | Payment thành công tạo được webhook PAYMENT_SUCCESS |
| AC-02 | Refund thành công tạo được webhook REFUND_SUCCESS |
| AC-03 | Webhook gửi thành công khi merchant trả HTTP 2xx |
| AC-04 | Webhook lỗi timeout/non-2xx chuyển RETRYING hoặc FAILED theo retry_count |
| AC-05 | Retry không làm thay đổi payment/refund gốc |
| AC-06 | Merchant chỉ xem webhook của merchant mình |
| AC-07 | Admin xem được toàn bộ webhook |
| AC-08 | Webhook request có đầy đủ signature headers |
| AC-09 | Không log API secret/webhook secret/password/token |
| AC-10 | Callback FAILED có thể retry thủ công nếu chưa vượt giới hạn |

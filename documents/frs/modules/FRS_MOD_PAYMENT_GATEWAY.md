   # FRS Chi tiết — MOD-PAYMENT-GATEWAY: Cổng thanh toán Merchant

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Cổng thanh toán Merchant cung cấp API để merchant tích hợp thanh toán qua ví điện tử. Merchant có thể tạo yêu cầu thanh toán, nhận payment URL/QR Code, kiểm tra trạng thái thanh toán và nhận callback/webhook khi giao dịch hoàn tất.

Đây là module trung tâm kết nối giữa:

- Merchant system
- Mobile app người dùng
- Ví điện tử
- Ledger transaction
- QR payment
- Webhook/callback

**Phạm vi chính:**

- Quản lý payment order từ merchant
- Tạo payment URL
- Sinh QR Code động cho từng đơn hàng
- Xác thực merchant bằng API Key + Signature
- Xử lý thanh toán từ mobile app
- Chống double payment bằng idempotency key
- Gửi callback/webhook về merchant
- Cho merchant kiểm tra trạng thái payment

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Merchant | Tạo payment, kiểm tra trạng thái payment, nhận callback |
| User | Quét QR, xem thông tin thanh toán, xác nhận thanh toán |
| Admin | Quản lý payment order, tra cứu lỗi, retry callback |
| System | Xử lý payment, ghi ledger, gửi webhook |

---

## 3. Khái niệm nghiệp vụ

### 3.1. Payment Order

Payment order là yêu cầu thanh toán do merchant tạo thông qua API. Mỗi payment order tương ứng với một đơn hàng hoặc một giao dịch cần thu tiền từ user.

### 3.2. Payment Transaction

Payment transaction là giao dịch thanh toán thực tế khi user xác nhận trả tiền bằng ví.

Một payment order có thể có nhiều payment transaction ở trạng thái FAILED, nhưng chỉ được có tối đa một payment transaction SUCCESS.

### 3.3. Dynamic QR

Dynamic QR là mã QR được sinh riêng cho từng payment order, chứa payment token hoặc payment URL. QR có thời hạn sử dụng để tránh thanh toán nhầm hoặc thanh toán lại đơn cũ.

### 3.4. Callback/Webhook

Callback là request hệ thống gửi về merchant để thông báo kết quả thanh toán: success, failed, expired hoặc canceled.

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-PAY-01: Merchant tạo payment order

**Mô tả:**  
Merchant gọi API để tạo một yêu cầu thanh toán. Hệ thống trả về payment URL và QR Code để user thanh toán.

**Actor:** Merchant

**Điều kiện tiên quyết:**

- Merchant đã được đăng ký
- Merchant có API key còn hiệu lực
- Request có signature hợp lệ
- Request có idempotency key

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Merchant gửi request tạo payment |
| 2 | Hệ thống xác thực API Key |
| 3 | Hệ thống kiểm tra signature |
| 4 | Hệ thống kiểm tra idempotency key |
| 5 | Validate amount, order_id, callback_url, description |
| 6 | Tạo payment order ở trạng thái PENDING |
| 7 | Sinh payment token/payment URL |
| 8 | Sinh QR Code động |
| 9 | Trả thông tin payment cho merchant |
| 10 | Ghi audit log |

**Request fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| merchant_order_id | String(100) | Có | Mã đơn hàng phía merchant |
| amount | BIGINT | Có | Số tiền cần thanh toán |
| currency | String(10) | Có | Mặc định VND |
| description | String(255) | Không | Nội dung thanh toán |
| callback_url | String(500) | Có | URL nhận kết quả thanh toán |
| redirect_url | String(500) | Không | URL redirect sau thanh toán |
| expired_at | Timestamp | Không | Thời điểm hết hạn payment |
| metadata | JSON | Không | Dữ liệu bổ sung từ merchant |

**Response fields:**

| Trường | Mô tả |
|---|---|
| payment_order_id | ID payment order |
| payment_no | Mã thanh toán |
| merchant_order_id | Mã đơn hàng merchant |
| amount | Số tiền |
| status | PENDING |
| payment_url | Link thanh toán |
| qr_code_url | Link/image QR Code |
| expired_at | Thời điểm hết hạn |
| created_at | Thời điểm tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | `merchant_order_id` unique theo từng merchant |
| BR-02 | `amount` phải > 0 |
| BR-03 | Payment mới tạo có status = PENDING |
| BR-04 | Payment order phải có thời hạn hết hạn |
| BR-05 | Nếu merchant gửi lại cùng idempotency key và cùng payload, trả lại payment đã tạo |
| BR-06 | Nếu cùng idempotency key nhưng payload khác, trả lỗi IDEMPOTENCY_CONFLICT |
| BR-07 | Không tạo payment nếu API key bị khóa hoặc hết hạn |
| BR-08 | Request merchant bắt buộc phải ký signature |

---

### FN-PAY-02: Xác thực merchant request

**Mô tả:**  
Mọi API từ merchant phải được xác thực bằng API Key và Signature để đảm bảo request không bị giả mạo.

**Actor:** System

**Header đề xuất:**

| Header | Mô tả |
|---|---|
| `X-API-Key` | API key định danh merchant |
| `X-Signature` | Chữ ký request |
| `X-Timestamp` | Thời gian gửi request |
| `X-Idempotency-Key` | Key chống trùng request |

**Signature payload đề xuất:**

```text
METHOD + "\n" +
PATH + "\n" +
TIMESTAMP + "\n" +
BODY_HASH
```

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | API Key phải tồn tại và đang ACTIVE |
| BR-02 | Timestamp không được lệch quá cấu hình cho phép, ví dụ 5 phút |
| BR-03 | Signature phải khớp với secret của merchant |
| BR-04 | Không log plain API secret |
| BR-05 | Nếu signature sai, trả 401/403 và ghi security log |
| BR-06 | API secret chỉ hiển thị một lần khi tạo mới |
| BR-07 | Merchant có thể rotate API key/secret |

---

### FN-PAY-03: Sinh QR Code thanh toán

**Mô tả:**  
Sau khi tạo payment order, hệ thống sinh QR Code động để user quét bằng mobile app.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Payment order được tạo thành công |
| 2 | Hệ thống tạo payment token unique |
| 3 | Hệ thống tạo payment URL chứa token |
| 4 | Hệ thống sinh QR Code từ payment URL |
| 5 | Lưu thông tin QR Code |
| 6 | Trả QR Code cho merchant |

**Data fields — payment_qr_codes:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| payment_order_id | UUID FK | Có | Payment order liên kết |
| qr_token | String(255) | Có | Token QR unique |
| qr_payload | Text | Có | Payload chứa trong QR |
| qr_image_url | Text | Không | URL ảnh QR nếu lưu file |
| expired_at | Timestamp | Có | Thời điểm hết hạn |
| used_at | Timestamp | Không | Thời điểm QR được dùng |
| status | String(50) | Có | ACTIVE / USED / EXPIRED / CANCELED |
| created_at | Timestamp | Có | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi payment order có ít nhất một QR Code |
| BR-02 | QR token phải unique |
| BR-03 | QR hết hạn thì không được thanh toán |
| BR-04 | QR đã USED không được dùng lại |
| BR-05 | QR phải liên kết được với payment order |
| BR-06 | Không đưa dữ liệu nhạy cảm vào QR payload |

---

### FN-PAY-04: User quét QR và xem thông tin thanh toán

**Mô tả:**  
User dùng mobile app quét QR từ merchant, hệ thống hiển thị thông tin payment trước khi user xác nhận.

**Actor:** User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User mở mobile app |
| 2 | User chọn chức năng quét QR |
| 3 | App đọc QR token/payment URL |
| 4 | App gửi token lên backend |
| 5 | Backend kiểm tra QR còn hiệu lực |
| 6 | Backend lấy thông tin payment order |
| 7 | App hiển thị số tiền, merchant, nội dung thanh toán |
| 8 | User có thể xác nhận hoặc hủy |

**Thông tin hiển thị:**

| Trường | Mô tả |
|---|---|
| Merchant name | Tên merchant |
| Amount | Số tiền cần thanh toán |
| Description | Nội dung |
| Merchant order ID | Mã đơn hàng merchant |
| Expired at | Thời điểm hết hạn |
| Payment status | Trạng thái thanh toán |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không hiển thị payment đã PAID cho user thanh toán lại |
| BR-02 | Payment hết hạn thì trả lỗi PAYMENT_EXPIRED |
| BR-03 | Payment canceled thì trả lỗi PAYMENT_CANCELED |
| BR-04 | User phải đăng nhập trước khi xác nhận thanh toán |
| BR-05 | App phải hiển thị rõ số tiền và merchant trước khi user xác nhận |

---

### FN-PAY-05: User xác nhận thanh toán

**Mô tả:**  
User xác nhận thanh toán payment order bằng số dư ví. Hệ thống trừ tiền ví user, ghi ledger, cập nhật payment status và gửi callback cho merchant.

**Actor:** User

**Điều kiện tiên quyết:**

- User đã đăng nhập
- Ví user ACTIVE
- Payment order PENDING
- QR/payment chưa hết hạn
- Số dư ví đủ
- Idempotency key hợp lệ

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User click “Xác nhận thanh toán” |
| 2 | App yêu cầu nhập PIN/OTP nếu cấu hình |
| 3 | Backend kiểm tra payment order |
| 4 | Backend kiểm tra ví user và số dư |
| 5 | Backend kiểm tra payment chưa SUCCESS trước đó |
| 6 | Backend tạo payment transaction |
| 7 | Backend tạo ledger transaction PAYMENT |
| 8 | Backend trừ tiền ví user |
| 9 | Backend cộng tiền merchant balance hoặc system account |
| 10 | Cập nhật payment transaction = SUCCESS |
| 11 | Cập nhật payment order = PAID |
| 12 | Đánh dấu QR = USED |
| 13 | Tạo callback/webhook event |
| 14 | Trả kết quả thanh toán cho app |

**Data fields — payment_transactions:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| payment_order_id | UUID FK | Có | Payment order |
| payer_user_id | UUID FK | Có | User thanh toán |
| payer_wallet_id | UUID FK | Có | Ví thanh toán |
| amount | BIGINT | Có | Số tiền thanh toán |
| status | String(50) | Có | PENDING / SUCCESS / FAILED |
| failure_reason | Text | Không | Lý do thất bại |
| idempotency_key | String(100) | Có | Chống double confirm |
| paid_at | Timestamp | Không | Thời gian thanh toán |
| created_at | Timestamp | Có | Thời gian tạo |
| updated_at | Timestamp | Có | Thời gian cập nhật |

Ledger liên kết gián tiếp bằng `ledger_transactions.source_type = 'PAYMENT_TRANSACTION'` và `source_id = payment_transactions.id`.

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ payment order PENDING mới được thanh toán |
| BR-02 | Mỗi payment order chỉ có tối đa một payment transaction SUCCESS |
| BR-03 | Nếu số dư không đủ, payment transaction FAILED với lý do INSUFFICIENT_BALANCE |
| BR-04 | Trừ tiền ví và cập nhật payment status phải nằm trong cùng DB transaction |
| BR-05 | Nếu ghi ledger lỗi, payment không được SUCCESS |
| BR-06 | Nếu callback gửi lỗi, payment vẫn SUCCESS nhưng callback status = FAILED/RETRYING |
| BR-07 | User không được thanh toán payment của merchant bị khóa |
| BR-08 | Cần chống user bấm thanh toán nhiều lần bằng idempotency key, row lock và kiểm tra trạng thái payment order |

---

### FN-PAY-06: Merchant kiểm tra trạng thái payment

**Mô tả:**  
Merchant gọi API kiểm tra trạng thái payment order hoặc transaction.

**Actor:** Merchant

**Endpoint đề xuất:**

```text
GET /api/v1/merchant/payments/{payment_order_id}
GET /api/v1/merchant/payments/by-order/{merchant_order_id}
```

**Response fields:**

| Trường | Mô tả |
|---|---|
| payment_order_id | ID payment |
| payment_no | Mã payment |
| merchant_order_id | Mã đơn merchant |
| amount | Số tiền |
| status | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| paid_at | Thời gian thanh toán |
| transaction_no | Mã giao dịch nếu đã thanh toán |
| callback_status | Trạng thái callback gần nhất |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem được payment của chính mình |
| BR-02 | API query status phải xác thực bằng API Key + Signature |
| BR-03 | Không trả thông tin ví/user nhạy cảm cho merchant |
| BR-04 | Nếu payment không tồn tại, trả PAYMENT_NOT_FOUND |
| BR-05 | Response status phải đồng nhất với callback đã gửi |

---

### FN-PAY-07: Hủy payment order

**Mô tả:**  
Merchant hoặc hệ thống có thể hủy payment order nếu đơn hàng không còn hiệu lực.

**Actor:** Merchant, System, Admin

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Merchant gọi API hủy payment hoặc hệ thống job xử lý hết hạn |
| 2 | Hệ thống xác thực merchant |
| 3 | Kiểm tra payment order hiện tại |
| 4 | Nếu payment chưa PAID, cập nhật status = CANCELED hoặc EXPIRED |
| 5 | Cập nhật QR Code = CANCELED hoặc EXPIRED |
| 6 | Ghi audit log |
| 7 | Trả kết quả cho merchant |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không được hủy payment đã PAID |
| BR-02 | Payment hết hạn tự chuyển EXPIRED bởi background job |
| BR-03 | Payment CANCELED/EXPIRED không được thanh toán |
| BR-04 | Nếu user quét QR hết hạn, app hiển thị payment đã hết hạn |
| BR-05 | Có thể gửi callback EXPIRED/CANCELED nếu merchant cấu hình nhận |

---

### FN-PAY-08: Callback/Webhook kết quả thanh toán

**Mô tả:**  
Sau khi payment thành công hoặc thất bại cuối cùng, hệ thống gửi callback về URL merchant đã cung cấp.

**Actor:** System, Merchant

**Payload callback đề xuất:**

| Trường | Mô tả |
|---|---|
| event_id | ID sự kiện |
| event_type | PAYMENT_SUCCESS / PAYMENT_FAILED / PAYMENT_EXPIRED |
| payment_order_id | ID payment |
| merchant_order_id | Mã đơn merchant |
| amount | Số tiền |
| status | Trạng thái payment |
| transaction_no | Mã giao dịch |
| paid_at | Thời gian thanh toán |
| timestamp | Thời gian gửi callback |
| signature | Chữ ký payload |

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Payment order chuyển trạng thái cuối |
| 2 | Hệ thống tạo `outbox_events` |
| 3 | Queue worker gửi HTTP POST đến callback_url |
| 4 | Merchant nhận callback và verify signature |
| 5 | Merchant trả HTTP 2xx nếu nhận thành công |
| 6 | Hệ thống cập nhật outbox status và ghi MongoDB webhook attempt = SUCCESS |
| 7 | Nếu lỗi, hệ thống retry theo cấu hình |

**Data fields — outbox_events:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| aggregate_type | String(100) | Có | PAYMENT_ORDER / REFUND_TRANSACTION |
| aggregate_id | UUID | Có | ID payment/refund liên quan |
| event_type | String(100) | Có | PAYMENT_SUCCESS / PAYMENT_FAILED / PAYMENT_EXPIRED |
| payload | JSONB | Có | Payload sự kiện, không chứa secret |
| status | String(20) | Có | PENDING / PROCESSING / SUCCESS / FAILED |
| created_at | Timestamp | Có | Thời gian tạo |

Chi tiết URL đích, chữ ký, HTTP response, số lần retry và lỗi cuối được lưu trong MongoDB collection `webhook_attempt_logs`.

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Callback phải ký signature |
| BR-02 | Callback lỗi không rollback payment đã SUCCESS |
| BR-03 | Callback retry tối đa theo cấu hình, ví dụ 5 lần |
| BR-04 | Chỉ HTTP 2xx được xem là callback thành công |
| BR-05 | Admin có thể retry callback thủ công |
| BR-06 | Lưu toàn bộ request/response callback để truy vết |
| BR-07 | Không gửi thông tin nhạy cảm trong callback payload |

---

## 5. Trạng thái payment order

| Status | Mô tả | Chuyển sang |
|---|---|---|
| PENDING | Đang chờ thanh toán | PAID / EXPIRED / CANCELED / FAILED |
| PAID | Đã thanh toán thành công | Kết thúc |
| EXPIRED | Hết hạn thanh toán | Kết thúc |
| CANCELED | Đã hủy | Kết thúc |
| FAILED | Thanh toán thất bại cuối cùng | Kết thúc |

**Lifecycle đề xuất:**

```text
PENDING
   ├── PAID
   ├── EXPIRED
   ├── CANCELED
   └── FAILED
```

---

## 6. Validation Rules

| Trường | Rule |
|---|---|
| merchant_order_id | Required, unique theo merchant, max 100 |
| amount | Required, > 0 |
| currency | Required, default VND |
| callback_url | Required, valid URL |
| redirect_url | Optional, valid URL |
| expired_at | Phải lớn hơn thời gian hiện tại |
| api_key | Required với merchant API |
| signature | Required với merchant API |
| idempotency_key | Required với create payment và confirm payment |

---

## 7. API đề xuất

### 7.1. Merchant API

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/merchant/payments` | Tạo payment order |
| GET | `/api/v1/merchant/payments/{id}` | Kiểm tra payment theo ID |
| GET | `/api/v1/merchant/payments/by-order/{merchant_order_id}` | Kiểm tra payment theo mã đơn merchant |
| POST | `/api/v1/merchant/payments/{id}/cancel` | Hủy payment |
| POST | `/api/v1/merchant/webhooks/{callback_id}/retry` | Retry callback nếu cho phép |

### 7.2. User/Mobile API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/payments/qr/{qr_token}` | Lấy thông tin payment từ QR |
| POST | `/api/v1/payments/{id}/confirm` | User xác nhận thanh toán |
| POST | `/api/v1/payments/{id}/cancel` | User hủy thao tác trên app |

### 7.3. Admin API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/payment-orders` | Danh sách payment orders |
| GET | `/api/v1/admin/payment-orders/{id}` | Chi tiết payment order |
| GET | `/api/v1/admin/payment-callbacks` | Danh sách callback |
| POST | `/api/v1/admin/payment-callbacks/{id}/retry` | Retry callback thủ công |

---

## 8. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `merchants` | Thông tin merchant |
| `merchant_api_keys` | API key/secret dùng ký request |
| `payment_orders` | Yêu cầu thanh toán merchant tạo |
| `payment_qr_codes` | QR động cho payment order |
| `payment_transactions` | Giao dịch thanh toán thực tế |
| `wallets` | Ví user thanh toán |
| `wallet_balances` | Số dư user |
| `merchant_balances` | Số dư merchant sau thanh toán |
| `ledger_transactions` | Giao dịch ledger PAYMENT |
| `ledger_entries` | Debit user wallet, credit merchant/system |
| `outbox_events` | Sự kiện callback/webhook chờ xử lý |
| `idempotency_keys` | Chống double create/confirm |
| MongoDB `webhook_attempt_logs` | Lần gửi, response và retry callback |
| MongoDB `audit_logs` | Truy vết thao tác |
| MongoDB `system_logs` | Ghi lỗi kỹ thuật/callback |

---

## 9. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-MERCHANT | Merchant/API key/callback config |
| MOD-WALLET | Trừ tiền ví user |
| MOD-TRANSACTION | Ghi ledger debit/credit |
| MOD-QR-PAYMENT | Sinh và xử lý QR |
| MOD-WEBHOOK | Gửi callback merchant |
| MOD-AUDIT | Ghi log nghiệp vụ |
| MOD-ADMIN | Tra cứu, xử lý lỗi, retry callback |

---

## 10. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Merchant tạo payment thành công với API Key và Signature hợp lệ |
| AC-02 | Request sai signature bị từ chối |
| AC-03 | Payment order trả về payment URL và QR Code |
| AC-04 | User quét QR xem được đúng thông tin merchant, số tiền, nội dung |
| AC-05 | User không thanh toán được payment hết hạn |
| AC-06 | User không thanh toán được nếu ví không đủ số dư |
| AC-07 | Payment thành công phải trừ ví user và ghi ledger |
| AC-08 | Một payment order chỉ có tối đa một transaction SUCCESS |
| AC-09 | Request confirm trùng idempotency key không bị trừ tiền lần hai |
| AC-10 | Payment thành công phải tạo callback về merchant |
| AC-11 | Callback lỗi không làm payment bị rollback |
| AC-12 | Admin xem được payment flow và callback log |
| AC-13 | Merchant query status trả đúng trạng thái hiện tại |
| AC-14 | Payment đã PAID không thể hủy |
| AC-15 | QR đã USED không thể dùng lại |

---

## 11. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Payment thành công tiền vào merchant balance hay system holding account? | Mở | MVP nên dùng merchant_balances |
| O-02 | Có settlement/rút tiền cho merchant không? | Đề xuất: Phase sau | Không bắt buộc MVP |
| O-03 | Có phí giao dịch không? | Mở | Có thể thêm ở Setting |
| O-04 | QR hết hạn sau bao lâu? | Đề xuất: 15 phút | Có thể cấu hình |
| O-05 | Có redirect flow web không? | Có | Trả payment_url cho merchant |
| O-06 | Có hỗ trợ refund không? | Phase sau hoặc module riêng | Nếu có cần MOD-REFUND |
| O-07 | Có cần sandbox/live mode cho merchant không? | Đề xuất: Có | Hữu ích cho đồ án |

---

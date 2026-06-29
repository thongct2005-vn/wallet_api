# FRS Chi tiết — MOD-QR-PAYMENT: Thanh toán QR Code

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module QR Payment quản lý toàn bộ nghiệp vụ thanh toán bằng QR Code động. Merchant tạo payment order thông qua Payment Gateway, hệ thống sinh QR Code riêng cho đơn hàng, user dùng mobile app quét QR và xác nhận thanh toán bằng số dư ví.

Module này là phần trực quan nhất của đề tài, thể hiện luồng thanh toán từ merchant đến user.

**Phạm vi chính:**

- Sinh QR Code động cho payment order
- Quét QR bằng mobile app
- Kiểm tra QR còn hiệu lực
- Hiển thị thông tin thanh toán
- User xác nhận thanh toán
- Đánh dấu QR đã dùng
- Chống dùng lại QR
- Chống thanh toán QR hết hạn
- Liên kết Payment Gateway, Wallet và Ledger

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Merchant | Nhận QR Code/payment URL sau khi tạo payment |
| User | Quét QR, xem thông tin, xác nhận thanh toán |
| Admin | Tra cứu QR, kiểm tra lỗi payment flow |
| System | Sinh QR, validate QR, cập nhật trạng thái |
| Mobile App | Đọc QR token và gọi API backend |

---

## 3. Khái niệm nghiệp vụ

### 3.1. Dynamic QR

Dynamic QR là mã QR được sinh riêng cho từng payment order. QR này chứa payment token hoặc payment URL, có thời hạn sử dụng và chỉ thanh toán được cho đúng payment order đó.

### 3.2. QR Token

QR Token là chuỗi định danh an toàn giúp backend tìm được payment order. Token không nên chứa dữ liệu nhạy cảm như API secret, thông tin ví user hoặc thông tin nội bộ.

### 3.3. QR Lifecycle

```text
ACTIVE
  ├── USED
  ├── EXPIRED
  └── CANCELED
```

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-QR-01: Sinh QR Code cho payment order

**Mô tả:**  
Sau khi merchant tạo payment order thành công, hệ thống sinh QR Code động để merchant hiển thị cho user thanh toán.

**Actor:** System

**Điều kiện tiên quyết:**

- Payment order tồn tại
- Payment order ở trạng thái PENDING
- Merchant ACTIVE
- Payment order chưa hết hạn

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Payment order được tạo thành công |
| 2 | Hệ thống tạo QR token unique |
| 3 | Hệ thống tạo payment URL chứa QR token |
| 4 | Hệ thống sinh QR image hoặc QR payload |
| 5 | Lưu bản ghi payment_qr_codes |
| 6 | Trả qr_code_url/qr_payload về Payment Gateway |
| 7 | Merchant hiển thị QR cho user |

**Data fields — payment_qr_codes:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| payment_order_id | UUID FK | Có | Payment order liên kết |
| qr_token | String(255) | Có | Token unique |
| qr_payload | Text | Có | Payload dùng để render QR |
| qr_image_url | Text | Không | Link ảnh QR nếu lưu |
| status | String(50) | Có | ACTIVE / USED / EXPIRED / CANCELED |
| expired_at | Timestamp | Có | Thời điểm hết hạn |
| used_at | Timestamp | Không | Thời điểm dùng |
| created_at | Timestamp | Có | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | QR token phải unique |
| BR-02 | QR phải liên kết với payment order |
| BR-03 | QR hết hạn theo expired_at của payment order hoặc thời hạn riêng |
| BR-04 | QR không chứa dữ liệu nhạy cảm |
| BR-05 | Payment order PENDING mới được sinh QR ACTIVE |
| BR-06 | QR CANCELED/EXPIRED không được dùng để thanh toán |

---

### FN-QR-02: Merchant hiển thị QR Code

**Mô tả:**  
Merchant nhận QR Code/payment URL từ Payment Gateway và hiển thị cho user tại website, POS demo hoặc màn hình checkout.

**Actor:** Merchant

**Thông tin merchant nhận được:**

| Trường | Mô tả |
|---|---|
| payment_order_id | ID payment |
| merchant_order_id | Mã đơn merchant |
| amount | Số tiền cần thanh toán |
| payment_url | Link thanh toán |
| qr_code_url | Link ảnh QR |
| qr_payload | Payload nếu merchant tự render QR |
| expired_at | Thời điểm hết hạn |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant không tự sửa amount trong QR |
| BR-02 | Merchant phải hiển thị đúng QR tương ứng payment order |
| BR-03 | QR hết hạn thì merchant nên tạo payment mới |
| BR-04 | Nếu payment đã PAID, merchant không dùng lại QR cũ |

---

### FN-QR-03: User quét QR

**Mô tả:**  
User dùng mobile app quét QR Code từ merchant để lấy thông tin thanh toán.

**Actor:** User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User mở mobile app |
| 2 | Chọn chức năng “Quét QR thanh toán” |
| 3 | App mở camera và đọc QR |
| 4 | App lấy qr_token/payment_url từ QR |
| 5 | App gọi API backend để resolve QR |
| 6 | Backend validate QR |
| 7 | Backend trả thông tin payment |
| 8 | App hiển thị màn hình xác nhận thanh toán |

**Luồng ngoại lệ:**

| Điều kiện | Xử lý |
|---|---|
| QR không hợp lệ | Hiển thị “QR không hợp lệ” |
| QR đã hết hạn | Hiển thị “Mã QR đã hết hạn” |
| QR đã dùng | Hiển thị “Mã QR đã được thanh toán” |
| Payment đã hủy | Hiển thị “Đơn thanh toán đã bị hủy” |
| Merchant bị khóa | Hiển thị “Merchant tạm ngưng nhận thanh toán” |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User phải đăng nhập mới xem được thông tin thanh toán đầy đủ |
| BR-02 | Backend không tin dữ liệu amount từ QR client gửi lên |
| BR-03 | Backend luôn lấy amount từ payment_orders |
| BR-04 | Không cho thanh toán nếu QR không ACTIVE |
| BR-05 | Mọi lỗi QR phải ghi system log nếu là lỗi bất thường |

---

### FN-QR-04: Hiển thị thông tin thanh toán từ QR

**Mô tả:**  
Sau khi quét QR hợp lệ, app hiển thị thông tin để user kiểm tra trước khi xác nhận thanh toán.

**Actor:** User

**Thông tin hiển thị:**

| Trường | Mô tả |
|---|---|
| Tên merchant | Merchant nhận tiền |
| Logo merchant | Nếu có |
| Số tiền | Amount từ payment order |
| Nội dung | Description |
| Mã đơn hàng | merchant_order_id |
| Thời hạn thanh toán | expired_at |
| Số dư ví hiện tại | available_balance của user |
| Trạng thái | PENDING |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Số tiền phải hiển thị rõ ràng trước khi user xác nhận |
| BR-02 | Merchant name phải lấy từ DB, không lấy từ QR raw payload |
| BR-03 | Nếu ví user không đủ số dư, app vẫn hiển thị nhưng cảnh báo không đủ tiền |
| BR-04 | Nếu payment không còn PENDING, không hiển thị nút xác nhận |
| BR-05 | Không hiển thị API key/technical secret trên app |

---

### FN-QR-05: Xác nhận thanh toán QR

**Mô tả:**  
User xác nhận thanh toán sau khi quét QR. Hệ thống xử lý giống payment confirm của Payment Gateway: trừ ví user, ghi ledger, cập nhật payment order và gửi callback.

**Actor:** User

**Điều kiện tiên quyết:**

- User đã đăng nhập
- QR ACTIVE
- Payment order PENDING
- Payment chưa hết hạn
- Ví user ACTIVE
- Số dư đủ
- Có idempotency key
- PIN/OTP hợp lệ nếu cấu hình

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User kiểm tra thông tin thanh toán |
| 2 | User click “Xác nhận thanh toán” |
| 3 | App yêu cầu PIN/OTP nếu có |
| 4 | Backend kiểm tra idempotency key |
| 5 | Backend lock payment order |
| 6 | Backend kiểm tra payment chưa PAID |
| 7 | Backend lock wallet balance user |
| 8 | Backend trừ tiền ví user |
| 9 | Backend cộng merchant balance/system account |
| 10 | Backend ghi ledger transaction PAYMENT |
| 11 | Backend cập nhật payment order = PAID |
| 12 | Backend cập nhật QR = USED |
| 13 | Backend tạo callback event |
| 14 | Trả kết quả thành công cho app |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Một QR chỉ được thanh toán thành công một lần |
| BR-02 | Một payment order chỉ có tối đa một payment transaction SUCCESS |
| BR-03 | Payment confirm phải dùng idempotency key |
| BR-04 | Nếu user bấm xác nhận nhiều lần, không được trừ tiền nhiều lần |
| BR-05 | Nếu ví không đủ tiền, payment transaction FAILED |
| BR-06 | Nếu callback lỗi, payment vẫn SUCCESS |
| BR-07 | Trừ tiền ví và cập nhật payment phải nằm trong cùng DB transaction |
| BR-08 | QR chuyển USED sau khi payment thành công |

---

### FN-QR-06: Kiểm tra QR hết hạn

**Mô tả:**  
Hệ thống kiểm tra và cập nhật trạng thái QR/payment order khi quá thời hạn thanh toán.

**Actor:** System

**Luồng realtime khi quét QR:**

| Bước | Hành động |
|---|---|
| 1 | User quét QR |
| 2 | Backend kiểm tra expired_at |
| 3 | Nếu đã hết hạn, cập nhật QR = EXPIRED |
| 4 | Cập nhật payment order = EXPIRED nếu chưa thanh toán |
| 5 | Trả lỗi PAYMENT_EXPIRED |

**Luồng background job:**

| Bước | Hành động |
|---|---|
| 1 | Job chạy định kỳ |
| 2 | Tìm payment order PENDING đã quá expired_at |
| 3 | Cập nhật payment order = EXPIRED |
| 4 | Cập nhật QR ACTIVE = EXPIRED |
| 5 | Ghi system log |
| 6 | Có thể tạo callback PAYMENT_EXPIRED nếu cấu hình |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Payment PAID không được chuyển EXPIRED |
| BR-02 | QR USED không được chuyển EXPIRED |
| BR-03 | Payment EXPIRED không thể thanh toán |
| BR-04 | Job hết hạn phải idempotent, chạy lại không gây sai dữ liệu |
| BR-05 | Merchant có thể query status để biết payment đã EXPIRED |

---

### FN-QR-07: Admin tra cứu QR/payment flow

**Mô tả:**  
Admin có thể tra cứu QR và payment flow để debug lỗi thanh toán.

**Actor:** Admin

**Thông tin hiển thị:**

| Section | Nội dung |
|---|---|
| QR Info | qr_token masked, status, expired_at, used_at |
| Payment Order | payment_no, merchant_order_id, amount, status |
| Merchant | merchant_code, merchant_name |
| Payment Transaction | status, payer, paid_at |
| Ledger | transaction_no, debit/credit |
| Callback | Outbox status và MongoDB webhook attempt: retry_count, last_error |
| Audit/System Log | trace_id, events liên quan |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin xem được toàn bộ QR/payment flow |
| BR-02 | Không hiển thị full token nếu không cần thiết |
| BR-03 | Không cho admin sửa trạng thái QR thủ công trong MVP |
| BR-04 | Có thể retry callback từ màn hình chi tiết nếu payment đã SUCCESS |
| BR-05 | Mọi thao tác admin phải ghi audit log |

---

## 5. Validation Rules

| Trường | Rule |
|---|---|
| qr_token | Required, unique |
| qr_payload | Required |
| status | ACTIVE / USED / EXPIRED / CANCELED |
| expired_at | Required, lớn hơn created_at |
| payment_order_id | Required, tồn tại |
| amount | Lấy từ payment order, không lấy từ client |
| idempotency_key | Required khi xác nhận payment |

---

## 6. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| GET | `/api/v1/qr-payments/{qr_token}` | Resolve QR và lấy thông tin payment | User |
| POST | `/api/v1/qr-payments/{qr_token}/confirm` | Xác nhận thanh toán QR | User |
| POST | `/api/v1/qr-payments/{qr_token}/cancel` | User hủy thao tác trên app | User |
| GET | `/api/v1/admin/qr-payments` | Admin xem danh sách QR/payment | Admin |
| GET | `/api/v1/admin/qr-payments/{id}` | Admin xem chi tiết QR/payment flow | Admin |
| POST | `/api/v1/admin/qr-payments/jobs/expire` | Chạy job expire QR thủ công khi demo | Admin |

---

## 7. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `payment_orders` | Đơn thanh toán merchant |
| `payment_qr_codes` | QR động |
| `payment_transactions` | Giao dịch thanh toán |
| `wallets` | Ví user |
| `wallet_balances` | Số dư ví |
| `merchant_balances` | Số dư merchant |
| `ledger_transactions` | Ledger PAYMENT |
| `ledger_entries` | Debit user, credit merchant/system |
| `outbox_events` | Sự kiện callback về merchant |
| MongoDB `webhook_attempt_logs` | Lịch sử gửi callback |
| `idempotency_keys` | Chống double confirm |
| MongoDB `audit_logs` | Ghi audit |
| MongoDB `system_logs` | Ghi lỗi QR/payment flow |

---

## 8. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-PAYMENT-GATEWAY | Tạo payment order và QR |
| MOD-MERCHANT | Thông tin merchant |
| MOD-WALLET | Trừ tiền ví user |
| MOD-TRANSACTION | Ghi ledger PAYMENT |
| MOD-WEBHOOK | Gửi callback kết quả |
| MOD-ADMIN | Tra cứu flow |
| MOD-AUDIT | Ghi audit log |

---

## 9. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Payment order tạo thành công thì sinh QR Code |
| AC-02 | QR token unique |
| AC-03 | User quét QR hợp lệ xem được thông tin thanh toán |
| AC-04 | QR hết hạn không thanh toán được |
| AC-05 | QR đã USED không thanh toán lại được |
| AC-06 | User xác nhận thanh toán QR thành công khi đủ số dư |
| AC-07 | Thanh toán QR trừ ví user và ghi ledger |
| AC-08 | Một payment order chỉ có một transaction SUCCESS |
| AC-09 | Request confirm trùng idempotency key không trừ tiền lần hai |
| AC-10 | Payment thành công tạo callback |
| AC-11 | Admin xem được QR/payment flow |
| AC-12 | Background job expire QR hoạt động đúng |

---

## 10. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | QR payload là URL hay JSON payload? | Đề xuất: URL token | Dễ demo mobile/web |
| O-02 | QR hết hạn sau bao lâu? | Đề xuất: 15 phút | Cấu hình trong setting |
| O-03 | Có cho thanh toán QR khi app offline không? | Không | Cần realtime |
| O-04 | Có cần QR cá nhân để nhận tiền không? | Phase sau | Không thuộc merchant payment |
| O-05 | Có cần lưu ảnh QR file không? | Mở | Có thể sinh realtime |

---

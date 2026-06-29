# FRS Chi tiết — MOD-SETTING: Cấu hình hệ thống

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Setting quản lý các cấu hình hệ thống ảnh hưởng đến bảo mật, giao dịch ví, thanh toán merchant, QR Code, webhook, hạn mức và logging. Đây là module nền giúp hệ thống có thể thay đổi một số rule mà không cần sửa code.

**Phạm vi chính:**

- Cấu hình bảo mật
- Cấu hình hạn mức ví
- Cấu hình topup
- Cấu hình transfer
- Cấu hình payment gateway
- Cấu hình QR Code
- Cấu hình webhook retry
- Cấu hình audit/system log retention
- Cấu hình phí giao dịch nếu có
- Ghi audit khi thay đổi setting

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Super Admin | Toàn quyền xem/sửa setting |
| Admin | Xem setting, sửa một số setting vận hành nếu được cấp quyền |
| Support Staff | Không được sửa setting |
| Merchant | Chỉ cấu hình callback/redirect của merchant, không sửa global setting |
| System | Đọc setting để xử lý nghiệp vụ |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-SET-01: Cấu hình bảo mật

**Mô tả:**  
Quản lý các cấu hình liên quan đến đăng nhập, mật khẩu, token và xác thực giao dịch.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| password_min_length | INT | 8 | Độ dài mật khẩu tối thiểu |
| max_login_attempts | INT | 5 | Số lần đăng nhập sai trước khi khóa |
| lock_duration_minutes | INT | 15 | Thời gian khóa tạm |
| access_token_ttl_minutes | INT | 30 | Hạn access token |
| refresh_token_ttl_days | INT | 7 | Hạn refresh token |
| require_pin_for_payment | Boolean | true | Có yêu cầu PIN khi thanh toán |
| require_otp_threshold | BIGINT | 2000000 | Giao dịch từ mức này cần OTP |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ Super Admin được sửa security setting |
| BR-02 | Thay đổi setting không làm token cũ tự hết hạn trừ khi có action revoke |
| BR-03 | Không cho đặt password_min_length quá thấp |
| BR-04 | Mọi thay đổi security setting phải ghi audit log |
| BR-05 | Setting nhạy cảm cần confirm trước khi lưu |

---

### FN-SET-02: Cấu hình ví

**Mô tả:**  
Quản lý các rule chung của ví điện tử.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| default_currency | String | VND | Tiền tệ mặc định |
| allow_negative_balance | Boolean | false | Có cho số dư âm không |
| wallet_auto_create | Boolean | true | Tự tạo ví khi user đăng ký |
| wallet_no_prefix | String | WAL | Prefix mã ví |
| enable_wallet_lock | Boolean | true | Cho phép khóa ví |
| balance_decimal_scale | INT | 0 | VND dùng số nguyên |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho allow_negative_balance = true trong MVP |
| BR-02 | default_currency MVP là VND |
| BR-03 | Tắt auto create wallet có thể làm user không dùng được ví |
| BR-04 | Đổi prefix chỉ áp dụng cho mã ví mới |
| BR-05 | Thay đổi cấu hình ví phải ghi audit log |

---

### FN-SET-03: Cấu hình nạp tiền

**Mô tả:**  
Quản lý hạn mức và phương thức nạp tiền giả lập.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| topup_enabled | Boolean | true | Bật/tắt nạp tiền |
| min_topup_amount | BIGINT | 10000 | Số tiền nạp tối thiểu |
| max_topup_amount | BIGINT | 10000000 | Số tiền nạp tối đa/lần |
| daily_topup_limit | BIGINT | 50000000 | Hạn mức nạp/ngày |
| monthly_topup_limit | BIGINT | 200000000 | Hạn mức nạp/tháng |
| topup_simulation_mode | Enum | ALWAYS_SUCCESS | ALWAYS_SUCCESS / ALWAYS_FAILED / MANUAL |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | min_topup_amount phải > 0 |
| BR-02 | max_topup_amount phải >= min_topup_amount |
| BR-03 | daily limit phải >= max per transaction |
| BR-04 | Nếu topup_enabled = false, user không tạo được topup |
| BR-05 | Thay đổi hạn mức chỉ áp dụng cho giao dịch mới |

---

### FN-SET-04: Cấu hình chuyển tiền

**Mô tả:**  
Quản lý hạn mức và xác thực giao dịch chuyển tiền.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| transfer_enabled | Boolean | true | Bật/tắt chuyển tiền |
| min_transfer_amount | BIGINT | 1000 | Số tiền chuyển tối thiểu |
| max_transfer_amount | BIGINT | 10000000 | Số tiền chuyển tối đa/lần |
| daily_transfer_limit | BIGINT | 50000000 | Hạn mức chuyển/ngày |
| monthly_transfer_limit | BIGINT | 200000000 | Hạn mức chuyển/tháng |
| require_pin_for_transfer | Boolean | true | Yêu cầu PIN khi chuyển tiền |
| require_otp_for_large_transfer | Boolean | true | Yêu cầu OTP với giao dịch lớn |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Nếu transfer_enabled = false, user không chuyển tiền được |
| BR-02 | Hạn mức chỉ áp dụng cho giao dịch mới |
| BR-03 | max_transfer_amount phải >= min_transfer_amount |
| BR-04 | Vượt hạn mức trả lỗi LIMIT_EXCEEDED |
| BR-05 | Thay đổi setting phải ghi audit log |

---

### FN-SET-05: Cấu hình Payment Gateway

**Mô tả:**  
Quản lý rule chung cho merchant payment.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| payment_enabled | Boolean | true | Bật/tắt payment gateway |
| min_payment_amount | BIGINT | 1000 | Số tiền payment tối thiểu |
| max_payment_amount | BIGINT | 50000000 | Số tiền payment tối đa |
| payment_expiry_minutes | INT | 15 | Thời hạn payment order |
| require_merchant_signature | Boolean | true | Bắt buộc signature |
| signature_timestamp_tolerance_minutes | INT | 5 | Lệch timestamp cho phép |
| payment_idempotency_ttl_hours | INT | 24 | Hạn idempotency key |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Payment gateway tắt thì merchant không tạo payment được |
| BR-02 | Merchant API bắt buộc signature trong MVP |
| BR-03 | Payment expiry áp dụng cho payment mới |
| BR-04 | max_payment_amount phải >= min_payment_amount |
| BR-05 | Thay đổi setting payment phải ghi audit log |

---

### FN-SET-06: Cấu hình QR Code

**Mô tả:**  
Quản lý thời hạn và cách sinh QR Code.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| qr_enabled | Boolean | true | Bật/tắt thanh toán QR |
| qr_expiry_minutes | INT | 15 | Hạn QR |
| qr_payload_type | Enum | URL_TOKEN | URL_TOKEN / JSON_TOKEN |
| qr_allow_reuse | Boolean | false | Có cho dùng lại QR không |
| qr_image_storage_enabled | Boolean | false | Có lưu ảnh QR không |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho qr_allow_reuse = true trong MVP |
| BR-02 | QR hết hạn không thanh toán được |
| BR-03 | QR payload không chứa dữ liệu nhạy cảm |
| BR-04 | Nếu qr_enabled = false, payment vẫn có payment_url nhưng không có QR |
| BR-05 | Đổi cấu hình QR chỉ áp dụng cho QR mới |

---

### FN-SET-07: Cấu hình webhook/callback

**Mô tả:**  
Quản lý retry, timeout và signature cho callback merchant.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| webhook_enabled | Boolean | true | Bật/tắt gửi webhook |
| webhook_timeout_seconds | INT | 10 | Timeout HTTP callback |
| webhook_max_retry | INT | 5 | Số lần retry tối đa |
| webhook_retry_schedule | String | 1m,5m,15m,1h,6h | Lịch retry |
| webhook_require_signature | Boolean | true | Bắt buộc ký webhook |
| webhook_log_body_enabled | Boolean | true | Lưu request/response body |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Callback payment success nên luôn bật trong hệ thống payment |
| BR-02 | Callback lỗi không rollback payment |
| BR-03 | max_retry không được quá cao để tránh spam merchant |
| BR-04 | Retry schedule phải parse hợp lệ |
| BR-05 | Thay đổi webhook setting phải ghi audit log |

---

### FN-SET-08: Cấu hình phí giao dịch

**Mô tả:**  
Cấu hình phí giao dịch nếu hệ thống muốn mô phỏng phí payment/transfer. Trong MVP có thể để phí = 0.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| fee_enabled | Boolean | false | Bật/tắt phí |
| transfer_fee_type | Enum | NONE | NONE / FIXED / PERCENT |
| transfer_fee_value | BIGINT/Decimal | 0 | Giá trị phí chuyển tiền |
| payment_fee_type | Enum | NONE | NONE / FIXED / PERCENT |
| payment_fee_value | BIGINT/Decimal | 0 | Giá trị phí payment |
| merchant_fee_bearer | Enum | MERCHANT | USER / MERCHANT |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | MVP đề xuất fee_enabled = false |
| BR-02 | Nếu bật phí, ledger phải ghi rõ fee entry |
| BR-03 | Fee không được làm user bị trừ mơ hồ |
| BR-04 | Merchant fee bearer cần thống nhất trong FRS payment |
| BR-05 | Thay đổi phí chỉ áp dụng cho giao dịch mới |

---

### FN-SET-09: Cấu hình logging & retention

**Mô tả:**  
Quản lý thời gian lưu audit log, system log, webhook log và idempotency key.

**Settings đề xuất:**

| Setting | Kiểu | Default | Mô tả |
|---|---|---|---|
| audit_log_retention_days | INT | 365 | Thời gian lưu audit |
| system_log_retention_days | INT | 90 | Thời gian lưu system log |
| webhook_log_retention_days | INT | 180 | Thời gian lưu webhook log |
| idempotency_retention_hours | INT | 24 | Thời gian lưu idempotency key |
| mask_sensitive_logs | Boolean | true | Mask dữ liệu nhạy cảm |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Audit log không cho sửa/xóa thủ công |
| BR-02 | Cleanup log cũ chạy bằng job |
| BR-03 | Không cleanup log đang cần điều tra nếu có flag giữ lại |
| BR-04 | Dữ liệu nhạy cảm phải mask trước khi log |
| BR-05 | Thay đổi retention phải ghi audit log |

---

### FN-SET-10: Lịch sử thay đổi setting

**Mô tả:**  
Mọi thay đổi cấu hình hệ thống phải được ghi lại để truy vết.

**Data fields:**

| Trường | Mô tả |
|---|---|
| setting_key | Key cấu hình |
| old_value | Giá trị cũ |
| new_value | Giá trị mới |
| changed_by | Người thay đổi |
| changed_at | Thời gian thay đổi |
| reason | Lý do thay đổi |
| ip_address | IP |
| user_agent | Thiết bị/trình duyệt |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Thay đổi setting nhạy cảm bắt buộc nhập lý do |
| BR-02 | Không log secret plain text |
| BR-03 | Lịch sử setting chỉ đọc, không sửa/xóa |
| BR-04 | Super Admin xem toàn bộ lịch sử thay đổi |
| BR-05 | Có filter theo key, người thay đổi, thời gian |

---

## 4. API đề xuất

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/settings` | Xem toàn bộ setting |
| GET | `/api/v1/admin/settings/{group}` | Xem setting theo nhóm |
| PATCH | `/api/v1/admin/settings/{group}` | Cập nhật setting theo nhóm |
| GET | `/api/v1/admin/settings/history` | Lịch sử thay đổi setting |
| POST | `/api/v1/admin/settings/{group}/reset-default` | Reset nhóm setting về mặc định |
| GET | `/api/v1/admin/settings/effective` | Xem cấu hình đang có hiệu lực |

---

## 5. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `app_settings` | Lưu cấu hình key-value |
| MongoDB `audit_logs` | Lịch sử và audit thay đổi setting |
| MongoDB `system_logs` | Log lỗi khi apply setting |
| `users` | Người thay đổi setting |

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Super Admin xem được danh sách setting |
| AC-02 | Super Admin cập nhật được setting hợp lệ |
| AC-03 | Setting invalid bị từ chối |
| AC-04 | Thay đổi setting ghi audit log |
| AC-05 | Thay đổi setting nhạy cảm bắt buộc nhập lý do |
| AC-06 | Payment expiry áp dụng cho payment mới |
| AC-07 | Transfer limit áp dụng cho giao dịch mới |
| AC-08 | Webhook retry đọc đúng cấu hình |
| AC-09 | Không log secret/token/password plain text |
| AC-10 | Xem được lịch sử thay đổi setting |

---

## 7. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Setting lưu key-value hay bảng riêng từng nhóm? | Đề xuất: key-value | Linh hoạt cho đồ án |
| O-02 | Có cần approval khi đổi setting nhạy cảm không? | Phase sau | MVP chỉ cần confirm |
| O-03 | Có cần multi-environment setting SANDBOX/LIVE không? | Mở | Nên có nếu làm merchant sandbox/live |
| O-04 | Có cần phí giao dịch không? | Đề xuất: Không trong MVP | Có thể đưa vào phase sau |
| O-05 | Có cần cache setting không? | Có thể | Cache ngắn, clear khi update |

---

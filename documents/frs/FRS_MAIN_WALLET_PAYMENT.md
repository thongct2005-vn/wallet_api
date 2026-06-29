# FRS Tổng quan — Xây dựng Ví điện tử và Cổng thanh toán

> Phiên bản: 1.0 | Ngày: 08/06/2026  
> Đề tài: Xây dựng ví điện tử và cổng thanh toán  
> Mục tiêu: Thiết kế hệ thống ví điện tử cho người dùng và cổng thanh toán cho merchant tích hợp API, QR Code, callback/webhook, bảo mật và audit.

---

## 1. Tổng quan đề tài

Hệ thống “Ví điện tử và Cổng thanh toán” cho phép người dùng lưu trữ tiền trong ví điện tử, nạp tiền giả lập, chuyển tiền giữa các ví, thanh toán đơn hàng qua QR Code và cho phép merchant tích hợp thanh toán thông qua API.

Hệ thống gồm 3 nhóm ứng dụng chính:

| Nhóm ứng dụng | Mô tả |
|---|---|
| Mobile App / User App | Ứng dụng cho người dùng ví: đăng ký, đăng nhập, xem số dư, nạp tiền, chuyển tiền, quét QR, thanh toán, xem lịch sử |
| Merchant Portal / Merchant API | Cổng cho merchant: tạo payment, nhận QR/payment URL, query trạng thái, nhận callback/webhook |
| Admin Web | Trang quản trị: quản lý user, ví, merchant, giao dịch, payment, callback, audit log, dashboard, báo cáo |

---

## 2. Mục tiêu hệ thống

### 2.1. Mục tiêu nghiệp vụ

- Cho phép user có một ví điện tử để lưu trữ và sử dụng tiền.
- Cho phép user nạp tiền giả lập vào ví.
- Cho phép user chuyển tiền cho user khác trong hệ thống.
- Cho phép user thanh toán đơn hàng merchant bằng QR Code.
- Cho phép merchant tích hợp API thanh toán.
- Cho phép merchant nhận callback/webhook khi thanh toán hoàn tất.
- Cho phép admin quản lý toàn bộ user, ví, merchant, giao dịch và lỗi hệ thống.

### 2.2. Mục tiêu kỹ thuật

- Đảm bảo giao dịch tiền chính xác theo nguyên tắc debit/credit.
- Đảm bảo không mất tiền.
- Đảm bảo không double payment/double transfer.
- Đảm bảo xử lý giao dịch bằng ACID database transaction.
- Có idempotency key cho các API nhạy cảm.
- Có audit log và ledger để truy vết toàn bộ dòng tiền.
- Có API Key + Signature cho merchant API.
- Có callback/webhook ký signature.
- Có dashboard và report để theo dõi hệ thống.

---

## 3. Phạm vi hệ thống

### 3.1. Trong phạm vi MVP

| Nhóm | Chức năng |
|---|---|
| Auth | Đăng ký, đăng nhập, refresh token, quên mật khẩu, đổi mật khẩu |
| Wallet | Tạo ví, xem số dư, khóa/mở ví, xem biến động số dư |
| Topup | Nạp tiền giả lập |
| Transfer | Chuyển tiền giữa 2 user |
| Merchant | Quản lý merchant, API key, callback URL |
| Payment Gateway | Merchant tạo payment, nhận payment URL/QR |
| QR Payment | User quét QR và thanh toán |
| Webhook | Gửi callback kết quả payment/refund về merchant |
| Transaction/Ledger | Ghi nhận giao dịch debit/credit |
| Refund | Hoàn tiền toàn phần/một phần cho payment |
| Admin | Quản lý user, ví, merchant, payment, transaction, webhook |
| Dashboard | KPI, biểu đồ, top merchant, cảnh báo |
| Report | Báo cáo giao dịch, payment, merchant, webhook, ledger |
| Setting | Cấu hình hạn mức, timeout, webhook retry, bảo mật |
| Audit Log | Audit log, system log, trace payment flow |

### 3.2. Ngoài phạm vi MVP

| Chức năng | Lý do |
|---|---|
| Tích hợp ngân hàng thật | Phức tạp, cần pháp lý và API bank |
| KYC/eKYC thật | Cần tích hợp bên thứ ba |
| Rút tiền về ngân hàng | Có thể để phase sau |
| Settlement merchant tự động | Nên làm sau khi payment ổn định |
| Đa tiền tệ | MVP chỉ dùng VND |
| Ví doanh nghiệp phức tạp | Phase sau |
| QR nhận tiền cá nhân | Không thuộc flow merchant payment chính |
| Chống gian lận nâng cao | Phase sau |
| Notification realtime phức tạp | Không bắt buộc MVP |

---

## 4. Actor hệ thống

| Actor | Mô tả |
|---|---|
| Guest | Người chưa đăng nhập, có thể đăng ký/đăng nhập |
| User | Người dùng ví điện tử trên mobile app |
| Merchant Owner | Chủ merchant, quản lý thông tin merchant/API key/payment |
| Merchant Staff | Nhân sự merchant, xem payment/report theo quyền |
| Admin | Quản trị hệ thống, quản lý user/ví/merchant/giao dịch |
| Super Admin | Toàn quyền hệ thống, quản lý setting và admin |
| Support Staff | Nhân sự hỗ trợ, xem dữ liệu read-only theo quyền |
| System | Thành phần backend tự động xử lý transaction, webhook, audit, job |

---

## 5. Danh sách module

| Mã module | Tên module | File chi tiết |
|---|---|---|
| MOD-AUTH | Xác thực & Phân quyền | `FRS_MOD_AUTH.md` |
| MOD-WALLET | Ví điện tử | `FRS_MOD_WALLET.md` |
| MOD-TRANSACTION | Giao dịch & Ledger | `FRS_MOD_TRANSACTION.md` |
| MOD-TOPUP | Nạp tiền giả lập | `FRS_MOD_TOPUP.md` |
| MOD-TRANSFER | Chuyển tiền giữa ví | `FRS_MOD_TRANSFER.md` |
| MOD-MERCHANT | Quản lý Merchant | `FRS_MOD_MERCHANT.md` |
| MOD-PAYMENT-GATEWAY | Cổng thanh toán Merchant | `FRS_MOD_PAYMENT_GATEWAY.md` |
| MOD-QR-PAYMENT | Thanh toán QR Code | `FRS_MOD_QR_PAYMENT.md` |
| MOD-WEBHOOK | Callback & Webhook Merchant | `FRS_MOD_WEBHOOK.md` |
| MOD-REFUND | Hoàn tiền | `FRS_MOD_REFUND.md` |
| MOD-ADMIN | Quản trị hệ thống | `FRS_MOD_ADMIN.md` |
| MOD-DASHBOARD | Dashboard hệ thống | `FRS_MOD_DASHBOARD.md` |
| MOD-REPORT | Báo cáo & Đối soát | `FRS_MOD_REPORT.md` |
| MOD-SETTING | Cấu hình hệ thống | `FRS_MOD_SETTING.md` |
| MOD-AUDIT-LOG | Audit Log & System Log | `FRS_MOD_AUDIT_LOG.md` |

---

## 6. Use Case tổng quan

### 6.1. User App

| Use Case | Mô tả |
|---|---|
| UC-USER-01 | Đăng ký tài khoản ví |
| UC-USER-02 | Đăng nhập |
| UC-USER-03 | Xem số dư ví |
| UC-USER-04 | Nạp tiền giả lập |
| UC-USER-05 | Chuyển tiền cho user khác |
| UC-USER-06 | Quét QR merchant |
| UC-USER-07 | Xem thông tin thanh toán |
| UC-USER-08 | Xác nhận thanh toán |
| UC-USER-09 | Xem lịch sử giao dịch |
| UC-USER-10 | Xem refund/hoàn tiền |

### 6.2. Merchant

| Use Case | Mô tả |
|---|---|
| UC-MER-01 | Đăng ký merchant |
| UC-MER-02 | Cấu hình callback URL |
| UC-MER-03 | Tạo API Key/Secret |
| UC-MER-04 | Tạo payment order qua API |
| UC-MER-05 | Nhận payment URL/QR Code |
| UC-MER-06 | Query trạng thái payment |
| UC-MER-07 | Nhận callback/webhook payment |
| UC-MER-08 | Tạo refund |
| UC-MER-09 | Xem báo cáo payment/refund |
| UC-MER-10 | Retry webhook nếu có quyền |

### 6.3. Admin

| Use Case | Mô tả |
|---|---|
| UC-ADM-01 | Quản lý user |
| UC-ADM-02 | Quản lý ví |
| UC-ADM-03 | Quản lý merchant |
| UC-ADM-04 | Duyệt/tạm ngưng merchant |
| UC-ADM-05 | Quản lý payment order |
| UC-ADM-06 | Quản lý transaction/ledger |
| UC-ADM-07 | Quản lý webhook/callback |
| UC-ADM-08 | Retry callback |
| UC-ADM-09 | Chạy đối soát ledger |
| UC-ADM-10 | Xem dashboard |
| UC-ADM-11 | Xem báo cáo |
| UC-ADM-12 | Xem audit/system log |
| UC-ADM-13 | Cấu hình hệ thống |

---

## 7. Luồng nghiệp vụ chính

---

### 7.1. Luồng đăng ký user và tạo ví

```text
Guest đăng ký
→ Hệ thống validate thông tin
→ Tạo user
→ Tạo ví mặc định
→ Tạo wallet_balance = 0
→ Ghi audit log
→ Trả kết quả đăng ký thành công
```

**Nguyên tắc:**

- Nếu tạo ví lỗi thì rollback tạo user.
- Mỗi user có một ví chính duy nhất.
- Ví mới có trạng thái ACTIVE.

---

### 7.2. Luồng nạp tiền giả lập

```text
User chọn nạp tiền
→ Nhập số tiền
→ Backend kiểm tra ví ACTIVE
→ Kiểm tra hạn mức
→ Kiểm tra idempotency key
→ Tạo deposit transaction
→ Tạo ledger TOPUP
→ CREDIT ví user
→ Cập nhật wallet_balance
→ Deposit SUCCESS
→ Ghi audit log
```

**Nguyên tắc:**

- Request trùng idempotency key không cộng tiền lần hai.
- Nếu ledger lỗi thì không cập nhật số dư.
- TOPUP trong MVP là giả lập, không tích hợp ngân hàng thật.

---

### 7.3. Luồng chuyển tiền giữa 2 ví

```text
User tìm người nhận
→ Nhập số tiền
→ Xác nhận chuyển tiền
→ Backend kiểm tra ví gửi/nhận ACTIVE
→ Kiểm tra số dư ví gửi
→ Kiểm tra hạn mức
→ Kiểm tra idempotency key
→ Tạo wallet_transfer
→ Tạo ledger TRANSFER
→ DEBIT ví gửi
→ CREDIT ví nhận
→ Cập nhật balance 2 ví
→ Transfer SUCCESS
→ Ghi audit log
```

**Nguyên tắc:**

- Không cho chuyển tiền cho chính mình.
- Không cho ví âm.
- Debit và Credit phải nằm trong cùng DB transaction.

---

### 7.4. Luồng merchant tạo payment

```text
Merchant gọi API tạo payment
→ Backend xác thực API Key
→ Verify Signature
→ Kiểm tra idempotency key
→ Validate amount/order_id/callback_url
→ Tạo payment_order PENDING
→ Sinh payment_url
→ Sinh QR Code động
→ Trả payment_url/QR cho merchant
→ Ghi audit log
```

**Nguyên tắc:**

- `merchant_order_id` unique theo merchant.
- Payment có thời hạn hết hạn.
- Merchant chưa ACTIVE không được tạo payment.
- API merchant bắt buộc dùng API Key + Signature.

---

### 7.5. Luồng thanh toán QR Code

```text
Merchant hiển thị QR
→ User mở app quét QR
→ Backend resolve qr_token
→ Kiểm tra QR ACTIVE
→ Kiểm tra payment PENDING
→ App hiển thị merchant, amount, description
→ User xác nhận thanh toán
→ Backend kiểm tra ví user ACTIVE và đủ tiền
→ Kiểm tra idempotency key
→ Lock payment_order
→ Lock wallet_balance
→ Tạo payment_transaction
→ Tạo ledger PAYMENT
→ DEBIT ví user
→ CREDIT merchant balance/system account
→ Payment PAID
→ QR USED
→ Tạo webhook PAYMENT_SUCCESS
→ Trả kết quả cho app
```

**Nguyên tắc:**

- Một payment order chỉ có tối đa một payment transaction SUCCESS.
- QR hết hạn/đã dùng không được thanh toán.
- Nếu callback lỗi, payment vẫn SUCCESS.
- Không lấy amount từ QR client gửi lên; amount phải lấy từ DB.

---

### 7.6. Luồng callback/webhook merchant

```text
Payment PAID
→ Tạo webhook event PAYMENT_SUCCESS
→ Build payload
→ Ký signature
→ Queue gửi callback
→ Merchant nhận callback
→ Merchant verify signature
→ Merchant trả HTTP 2xx
→ Callback SUCCESS
```

**Luồng lỗi:**

```text
Callback timeout/non-2xx
→ Lưu response/error
→ retry_count + 1
→ status RETRYING
→ Đến next_retry_at thì gửi lại
→ Quá max_retry thì FAILED
```

**Nguyên tắc:**

- Callback lỗi không rollback payment.
- Mọi callback phải lưu request/response.
- Callback phải có signature.
- Admin có thể retry thủ công.

---

### 7.7. Luồng hoàn tiền

```text
Merchant/Admin chọn payment PAID
→ Nhập số tiền hoàn và lý do
→ Backend kiểm tra refundable_amount
→ Kiểm tra idempotency key
→ Tạo refund transaction
→ Tạo ledger REFUND
→ DEBIT merchant balance/system account
→ CREDIT ví user
→ Refund SUCCESS
→ Cập nhật payment refund_status
→ Tạo webhook REFUND_SUCCESS nếu cấu hình
→ Ghi audit log
```

**Nguyên tắc:**

- Không refund vượt số tiền payment.
- Cho phép partial refund nhiều lần.
- Refund SUCCESS không cho sửa/xóa.
- Refund phải có ledger.

---

### 7.8. Luồng đối soát ledger

```text
Admin chạy đối soát
→ Hệ thống kiểm tra tổng debit/credit
→ Kiểm tra balance hiện tại so với ledger
→ Kiểm tra payment success trùng
→ Kiểm tra ví âm
→ Ghi kết quả
→ Nếu lỗi nghiêm trọng, ghi system log CRITICAL
```

**Nguyên tắc:**

- Đối soát chỉ đọc dữ liệu, không tự sửa.
- Sai lệch ledger là lỗi nghiêm trọng.
- Kết quả dùng để điều tra và báo cáo.

---

## 8. Quy tắc nghiệp vụ tổng hợp

### 8.1. Quy tắc về ví

| Mã rule | Nội dung |
|---|---|
| BR-WALLET-01 | Mỗi user có một ví chính duy nhất trong MVP |
| BR-WALLET-02 | Ví phải ACTIVE mới được topup/transfer/payment |
| BR-WALLET-03 | Không cho số dư ví âm |
| BR-WALLET-04 | Không cho admin sửa số dư trực tiếp |
| BR-WALLET-05 | Mọi thay đổi số dư phải đi qua ledger |

### 8.2. Quy tắc về ledger

| Mã rule | Nội dung |
|---|---|
| BR-LEDGER-01 | Mọi giao dịch tiền thành công phải có ledger transaction |
| BR-LEDGER-02 | Transfer/Payment/Refund phải có debit và credit |
| BR-LEDGER-03 | Tổng debit phải bằng tổng credit |
| BR-LEDGER-04 | Ledger entry không cho sửa/xóa |
| BR-LEDGER-05 | Balance snapshot phải lưu trước/sau giao dịch |

### 8.3. Quy tắc về payment

| Mã rule | Nội dung |
|---|---|
| BR-PAY-01 | Payment order mới tạo có trạng thái PENDING |
| BR-PAY-02 | Payment hết hạn không được thanh toán |
| BR-PAY-03 | Một payment order chỉ có một transaction SUCCESS |
| BR-PAY-04 | Payment PAID không được hủy |
| BR-PAY-05 | Payment callback lỗi không rollback payment |

### 8.4. Quy tắc về merchant

| Mã rule | Nội dung |
|---|---|
| BR-MER-01 | Merchant ACTIVE mới được tạo payment |
| BR-MER-02 | Merchant API bắt buộc API Key + Signature |
| BR-MER-03 | API Secret không lưu plain text |
| BR-MER-04 | Merchant chỉ xem dữ liệu của chính mình |
| BR-MER-05 | Merchant SUSPENDED không tạo được payment mới |

### 8.5. Quy tắc idempotency

| Mã rule | Nội dung |
|---|---|
| BR-IDEM-01 | Topup, Transfer, Payment confirm, Refund bắt buộc có idempotency key |
| BR-IDEM-02 | Cùng key và cùng payload trả lại response cũ |
| BR-IDEM-03 | Cùng key nhưng khác payload trả lỗi conflict |
| BR-IDEM-04 | Idempotency key unique theo actor |
| BR-IDEM-05 | Request trùng không được tạo giao dịch tiền mới |

### 8.6. Quy tắc audit/logging

| Mã rule | Nội dung |
|---|---|
| BR-AUDIT-01 | Audit log chỉ ghi, không sửa/xóa |
| BR-AUDIT-02 | Không log password/token/API secret |
| BR-AUDIT-03 | Payment flow phải truy vết được bằng trace_id hoặc payment_id |
| BR-AUDIT-04 | Ledger lệch phải ghi system log CRITICAL |
| BR-AUDIT-05 | Export log/report phải mask dữ liệu nhạy cảm nếu cần |

---

## 9. Trạng thái nghiệp vụ chính

### 9.1. Wallet Status

| Status | Mô tả |
|---|---|
| ACTIVE | Ví hoạt động |
| LOCKED | Ví bị khóa, không giao dịch được |
| CLOSED | Ví đã đóng |

### 9.2. Transaction Status

| Status | Mô tả |
|---|---|
| PENDING | Đang xử lý |
| SUCCESS | Thành công |
| FAILED | Thất bại |
| CANCELED | Đã hủy |

### 9.3. Payment Order Status

| Status | Mô tả |
|---|---|
| PENDING | Chờ thanh toán |
| PAID | Đã thanh toán |
| EXPIRED | Hết hạn |
| CANCELED | Đã hủy |
| FAILED | Thất bại |

### 9.4. QR Status

| Status | Mô tả |
|---|---|
| ACTIVE | QR còn hiệu lực |
| USED | QR đã dùng |
| EXPIRED | QR hết hạn |
| CANCELED | QR bị hủy |

### 9.5. Merchant Status

| Status | Mô tả |
|---|---|
| PENDING_REVIEW | Chờ duyệt |
| ACTIVE | Đang hoạt động |
| SUSPENDED | Tạm ngưng |
| REJECTED | Bị từ chối |
| CLOSED | Đã đóng |

### 9.6. Webhook Status

| Status | Mô tả |
|---|---|
| PENDING | Chờ gửi |
| SUCCESS | Gửi thành công |
| RETRYING | Đang retry |
| FAILED | Gửi thất bại sau retry |

---

## 10. Entity tổng quan

> **Schema baseline:** Tài liệu này sử dụng `ewallet_core_db.sql` làm nguồn chuẩn. Dữ liệu nghiệp vụ và ledger nằm trong PostgreSQL; audit, system, security và webhook-attempt logs là collection MongoDB. Không giả định tồn tại các bảng PostgreSQL `audit_logs`, `system_logs`, `payment_callbacks`, `auth_login_attempts` hoặc `setting_histories`.
>
> Mapping chi tiết được khóa tại `documents/DATABASE_SCHEMA_ALIGNMENT_CORE.md`.

| Entity | Mô tả |
|---|---|
| users | Tài khoản user/admin/merchant staff |
| roles | Vai trò hệ thống |
| permissions | Quyền chi tiết |
| wallets | Ví điện tử |
| wallet_balances | Số dư ví |
| wallet_limits | Hạn mức giao dịch của ví |
| wallet_linked_banks | Ngân hàng/thẻ liên kết |
| ledger_transactions | Giao dịch tổng |
| ledger_entries | Dòng debit/credit |
| deposit_transactions | Giao dịch nạp tiền |
| withdrawal_transactions | Giao dịch rút/chuyển ngân hàng |
| wallet_transfers | Giao dịch chuyển tiền |
| merchants | Thông tin merchant |
| merchant_api_keys | API key/secret của merchant |
| merchant_callback_configs | Callback/redirect config |
| merchant_balances | Số dư merchant nếu có |
| payment_orders | Yêu cầu thanh toán |
| payment_qr_codes | QR động |
| payment_transactions | Giao dịch thanh toán |
| refund_transactions | Giao dịch hoàn tiền |
| outbox_events | Sự kiện tích hợp/webhook chờ xử lý |
| idempotency_keys | Chống request trùng |
| app_settings | Cấu hình hệ thống |
| notifications, user_devices | Thông báo và thiết bị |
| otp_tracking, password_resets | OTP và reset mật khẩu |
| chat_messages | Tin nhắn giữa các ví |
| group_fundings, group_funding_members | Chia tiền/lì xì nhóm |
| MongoDB `audit_logs` | Log nghiệp vụ |
| MongoDB `system_logs`, `security_logs` | Log kỹ thuật và bảo mật |
| MongoDB `webhook_attempt_logs` | Chi tiết từng lần gửi webhook |

---

## 11. API nhóm tổng quan

### 11.1. Auth API

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/auth/register` | Đăng ký user |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/logout` | Đăng xuất |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Thông tin user hiện tại |

### 11.2. Wallet/User API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/wallets/me` | Xem ví |
| GET | `/api/v1/wallets/me/balance` | Xem số dư |
| GET | `/api/v1/wallets/me/statement` | Sao kê ví |
| GET | `/api/v1/wallets/me/linked-banks` | Danh sách ngân hàng/thẻ liên kết |
| POST | `/api/v1/wallets/me/linked-banks` | Liên kết ngân hàng/thẻ |
| GET | `/api/v1/wallets/me/limits` | Xem hạn mức ví |
| POST | `/api/v1/topups` | Nạp tiền |
| POST | `/api/v1/withdrawals` | Rút tiền về ngân hàng đã liên kết |
| POST | `/api/v1/transfers` | Chuyển tiền |
| GET | `/api/v1/transactions/me` | Lịch sử giao dịch |

Các bảng `chat_messages`, `group_fundings` và `group_funding_members` đã tồn tại trong schema core nhưng API tương ứng nằm ngoài phạm vi phase hiện tại; không được xóa bảng chỉ vì chưa công bố endpoint.

### 11.3. QR/Payment User API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/qr-payments/{qr_token}` | Resolve QR |
| POST | `/api/v1/qr-payments/{qr_token}/confirm` | Xác nhận thanh toán QR |
| GET | `/api/v1/refunds/me` | Xem refund của user |

### 11.4. Merchant API

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/merchant/payments` | Tạo payment |
| GET | `/api/v1/merchant/payments/{id}` | Query payment |
| GET | `/api/v1/merchant/payments/by-order/{merchant_order_id}` | Query payment theo order |
| POST | `/api/v1/merchant/payments/{id}/cancel` | Hủy payment |
| POST | `/api/v1/merchant/refunds` | Tạo refund |
| GET | `/api/v1/merchant/webhooks` | Xem webhook |
| GET | `/api/v1/merchant/reports/payments` | Báo cáo payment |

### 11.5. Admin API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/users` | Quản lý user |
| GET | `/api/v1/admin/wallets` | Quản lý ví |
| GET | `/api/v1/admin/merchants` | Quản lý merchant |
| GET | `/api/v1/admin/payment-orders` | Quản lý payment |
| GET | `/api/v1/admin/transactions` | Quản lý transaction |
| GET | `/api/v1/admin/webhooks` | Quản lý webhook |
| GET | `/api/v1/admin/reports/payments` | Báo cáo payment |
| GET | `/api/v1/admin/audit-logs` | Audit log |
| GET | `/api/v1/admin/settings` | Setting |

---

## 12. Non-Functional Requirements

### 12.1. Bảo mật

| Yêu cầu | Mô tả |
|---|---|
| NFR-SEC-01 | User/Admin API dùng JWT |
| NFR-SEC-02 | Merchant API dùng API Key + Signature |
| NFR-SEC-03 | Callback/Webhook phải ký signature |
| NFR-SEC-04 | Password phải hash |
| NFR-SEC-05 | API Secret không lưu plain text |
| NFR-SEC-06 | Không log token/password/secret |
| NFR-SEC-07 | Có rate limit cho login, merchant API, payment confirm |
| NFR-SEC-08 | Có timestamp tolerance chống replay attack |

### 12.2. Tính đúng đắn giao dịch

| Yêu cầu | Mô tả |
|---|---|
| NFR-TXN-01 | Mọi giao dịch tiền chạy trong DB transaction |
| NFR-TXN-02 | Debit/Credit cùng thành công hoặc cùng rollback |
| NFR-TXN-03 | Không cho balance âm |
| NFR-TXN-04 | Có lock balance row khi trừ tiền |
| NFR-TXN-05 | Có unique constraint chống double payment |
| NFR-TXN-06 | Có idempotency key cho API nhạy cảm |
| NFR-TXN-07 | Ledger không cho sửa/xóa |
| NFR-TXN-08 | Có đối soát ledger |

### 12.3. Hiệu năng

| Yêu cầu | Mô tả |
|---|---|
| NFR-PERF-01 | API xem số dư phản hồi nhanh |
| NFR-PERF-02 | Payment confirm nên xử lý trong thời gian ngắn |
| NFR-PERF-03 | Báo cáo lớn cần phân trang |
| NFR-PERF-04 | Dashboard có thể cache ngắn hạn |
| NFR-PERF-05 | Webhook nên xử lý async bằng queue |

### 12.4. Logging & Audit

| Yêu cầu | Mô tả |
|---|---|
| NFR-LOG-01 | Ghi audit cho mọi nghiệp vụ tiền |
| NFR-LOG-02 | Ghi system log cho lỗi kỹ thuật |
| NFR-LOG-03 | Có trace_id để truy vết payment flow |
| NFR-LOG-04 | Audit log append-only |
| NFR-LOG-05 | Có retention log theo cấu hình |

### 12.5. Khả dụng và mở rộng

| Yêu cầu | Mô tả |
|---|---|
| NFR-AVL-01 | Callback lỗi không làm payment rollback |
| NFR-AVL-02 | Retry webhook theo cấu hình |
| NFR-AVL-03 | Job expire payment/QR phải idempotent |
| NFR-AVL-04 | Module hóa rõ để dễ mở rộng |
| NFR-AVL-05 | Có thể bổ sung settlement/rút tiền sau MVP |

---

## 13. Đề xuất công nghệ

| Thành phần | Đề xuất |
|---|---|
| Backend | Node.js NestJS hoặc .NET 8 |
| Database nghiệp vụ | PostgreSQL (`ewallet_core_db.sql`) |
| Log store | MongoDB |
| Cache/Lock | Redis |
| Queue | BullMQ/RabbitMQ |
| Mobile App | Flutter hoặc React Native |
| Admin Web | Next.js/React |
| Merchant Demo Web | Next.js/React |
| API Docs | Swagger/OpenAPI |
| Auth | JWT + Refresh Token |
| Merchant Security | API Key + HMAC Signature |
| Logging | Application log + MongoDB audit/system/security/webhook-attempt collections |
| Deploy demo | Docker Compose |

**Khuyến nghị cho đồ án:**  
Nếu nhóm đã quen JavaScript/TypeScript, nên chọn **NestJS + PostgreSQL + Redis + Next.js + Flutter/React Native**. NestJS hỗ trợ module rõ, dễ viết DEV-SPEC, API Docs và phù hợp hệ thống payment có nhiều service.

---

## 14. Roadmap triển khai đề xuất

### Sprint 1 — Foundation

| Công việc | Mô tả |
|---|---|
| Thiết kế DB | ERD, bảng/cột, validation code và index theo schema core |
| Auth | Register/login/JWT/refresh token |
| Wallet | Tạo ví, xem số dư |
| Ledger base | ledger_transactions, ledger_entries |
| Audit base | MongoDB `audit_logs`, `system_logs`, `security_logs` |

### Sprint 2 — User Wallet Flow

| Công việc | Mô tả |
|---|---|
| Topup | Nạp tiền giả lập |
| Transfer | Chuyển tiền user-user |
| Statement | Lịch sử giao dịch |
| Idempotency | Chống double topup/transfer |
| Admin user/wallet | Quản lý user/ví |

### Sprint 3 — Merchant Payment Gateway

| Công việc | Mô tả |
|---|---|
| Merchant | Merchant profile/API key |
| Payment API | Tạo payment order |
| Signature | API Key + HMAC Signature |
| QR | Sinh QR/payment URL |
| Payment query | Merchant query status |

### Sprint 4 — QR Payment & Webhook

| Công việc | Mô tả |
|---|---|
| QR scan | Resolve QR |
| Payment confirm | Trừ ví, ledger, payment PAID |
| Webhook | Callback merchant |
| Retry | Retry callback |
| Double payment protection | Unique success + idempotency |

### Sprint 5 — Admin, Report, Refund

| Công việc | Mô tả |
|---|---|
| Refund | Full/partial refund |
| Dashboard | KPI, chart, alerts |
| Report | Payment, transfer, topup, ledger |
| Reconciliation | Đối soát ledger |
| Audit trace | Trace payment flow |

### Sprint 6 — Hoàn thiện đồ án

| Công việc | Mô tả |
|---|---|
| API Docs | Swagger/OpenAPI |
| DEV-SPEC | Service design, transaction flow |
| Sequence diagrams | Các luồng chính |
| Use case diagram | Actor/use case |
| Testing | Test double payment, insufficient balance, webhook retry |
| Demo script | Kịch bản demo bảo vệ |

---

## 15. Danh sách tài liệu cần có

| Tài liệu | Mô tả |
|---|---|
| `FRS_MAIN_WALLET_PAYMENT.md` | FRS tổng quan |
| `FRS_MOD_*.md` | FRS chi tiết từng module |
| `ERD_WALLET_PAYMENT.md` | Thiết kế ERD |
| `ewallet_core_db.sql` | Schema PostgreSQL chuẩn |
| `sample-data.sql` | Dữ liệu mẫu |
| `API_DESIGN_OVERVIEW.md` | API design tổng quan |
| `API_DESIGN_DETAIL.md` | API design chi tiết |
| `DEV_SPEC.md` | Tài liệu kỹ thuật cho dev |
| `SEQUENCE_DIAGRAMS.md` | Sequence các luồng chính |
| `USE_CASE_DIAGRAM.md` | Use case |
| `ARCHITECTURE.md` | Kiến trúc hệ thống |
| `README.md` | Tổng quan source/demo |
| `map.txt` | Cấu trúc thư mục dự án |

---

## 16. Tiêu chí nghiệm thu tổng thể

| # | Tiêu chí |
|---|---|
| AC-GEN-01 | User đăng ký thành công và có ví mặc định |
| AC-GEN-02 | User xem được số dư ví |
| AC-GEN-03 | User nạp tiền giả lập thành công |
| AC-GEN-04 | User chuyển tiền cho user khác thành công |
| AC-GEN-05 | Không cho chuyển tiền khi số dư không đủ |
| AC-GEN-06 | Merchant tạo payment bằng API Key + Signature |
| AC-GEN-07 | Payment tạo thành công trả về QR Code/payment URL |
| AC-GEN-08 | User quét QR xem đúng thông tin merchant và số tiền |
| AC-GEN-09 | User xác nhận thanh toán thành công khi đủ số dư |
| AC-GEN-10 | Thanh toán thành công trừ ví user và ghi ledger |
| AC-GEN-11 | Một payment không thể bị thanh toán thành công hai lần |
| AC-GEN-12 | Callback gửi về merchant sau khi payment thành công |
| AC-GEN-13 | Callback lỗi được retry và không rollback payment |
| AC-GEN-14 | Refund không vượt số tiền payment |
| AC-GEN-15 | Admin xem được user, ví, merchant, payment, transaction |
| AC-GEN-16 | Admin chạy được đối soát ledger |
| AC-GEN-17 | Audit log ghi lại các nghiệp vụ quan trọng |
| AC-GEN-18 | API nhạy cảm có idempotency key |
| AC-GEN-19 | Không có ví âm sau mọi giao dịch |
| AC-GEN-20 | Báo cáo/Dashboard hiển thị dữ liệu giao dịch |

---

## 17. Rủi ro và lưu ý triển khai

| Rủi ro | Ảnh hưởng | Giải pháp |
|---|---|---|
| Double payment | User bị trừ tiền nhiều lần | Idempotency key + unique success payment |
| Race condition balance | Sai số dư khi nhiều request cùng lúc | Row lock `wallet_balances` khi trừ tiền |
| Callback thất bại | Merchant không cập nhật đơn | Queue + retry + query status API |
| Sai ledger | Không đối soát được tiền | Debit/Credit balance check |
| Lộ API Secret | Merchant bị giả mạo request | Secret hash/encrypt, chỉ hiển thị một lần |
| Log lộ dữ liệu nhạy cảm | Rủi ro bảo mật | Mask password/token/secret |
| Payment hết hạn vẫn thanh toán | Sai trạng thái đơn | Check expired_at khi confirm + job expire |
| Admin sửa tiền thủ công | Mất tính toàn vẹn | Không có API sửa balance trực tiếp |
| Không thống nhất status | Lỗi logic | Dùng enum/check constraint |
| DB thiếu constraint | Dữ liệu rác/sai | Thiết kế constraint/index ngay từ đầu |

---

## 18. Kết luận

Bộ FRS này định hướng hệ thống ví điện tử và cổng thanh toán theo mô hình có module rõ ràng, có ledger giao dịch, có bảo mật merchant API, có QR payment, webhook callback, idempotency và audit log.

MVP không cần tích hợp ngân hàng thật, nhưng cần làm kỹ các phần cốt lõi của payment:

- Ví và số dư
- Debit/Credit ledger
- ACID transaction
- Idempotency
- Chống double payment
- Merchant API + Signature
- QR dynamic
- Callback/Webhook
- Audit/Report/Admin

Đây là nền tảng phù hợp để tiếp tục thiết kế ERD, database schema, API design chi tiết, DEV-SPEC và sequence diagram cho đồ án.

---

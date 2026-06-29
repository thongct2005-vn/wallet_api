# API Design Tổng quan — Wallet Payment Gateway

> Phiên bản: 1.0 | Ngày: 08/06/2026  
> Áp dụng cho: Đề tài **Xây dựng Ví điện tử và Cổng thanh toán**  
> Căn cứ thiết kế: FRS tổng quan, FRS module, `ewallet_core_db.sql` và API conventions của project.

> **Storage baseline:** PostgreSQL chỉ sử dụng các bảng có trong `ewallet_core_db.sql`. Audit/system/security/webhook-attempt logs lưu tại MongoDB. Webhook event dùng `outbox_events`; ledger liên kết nghiệp vụ bằng `ledger_transactions.source_type + source_id`.
>
> Xem mapping chuẩn tại `documents/DATABASE_SCHEMA_ALIGNMENT_CORE.md`.

---

## 1. Mục tiêu

Tài liệu này mô tả tổng quan danh sách API phase 1 cho hệ thống ví điện tử và cổng thanh toán.

Mục tiêu:

- Chốt danh sách endpoint chung cho team BE, Mobile, Admin Web, Merchant Demo.
- Đảm bảo API phủ đủ FRS module.
- Đảm bảo API bám theo DB schema v2.
- Đảm bảo các flow liên quan đến tiền có transaction, ledger, idempotency, audit.
- Đảm bảo merchant API có API Key + Signature.
- Đảm bảo callback/webhook có retry và signature.
- Secret dùng HMAC nằm trong secret manager/KMS; PostgreSQL core chỉ lưu `api_secret_hash` và `webhook_secret_hash`.

---

## 2. Nguyên tắc chung

### 2.1. Base path

```http
/api/v1
```

### 2.2. JSON contract

- Request/response dùng `snake_case`.
- Enum dùng `UPPERCASE`.
- Timestamp dùng UTC ISO-8601.
- Amount dùng integer VND.

### 2.3. Response envelope

Tất cả JSON response dùng:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {},
  "trace_id": "trace-001"
}
```

### 2.4. Auth

| Nhóm API | Auth |
|---|---|
| Public Auth | Không cần token |
| User App | JWT |
| Admin Web | JWT + role/permission |
| Merchant Portal | JWT + merchant context |
| Merchant Open API | API Key + Signature |
| Webhook callback | Signature |

### 2.5. Idempotency

Bắt buộc `Idempotency-Key` cho:

```http
POST /topups
POST /transfers
POST /merchant/payments
POST /qr-payments/{qr_token}/confirm
POST /merchant/refunds
POST /admin/refunds
```

### 2.6. Action endpoint

Dùng format:

```http
POST /resources/{id}/actions/{action}
```

Ví dụ:

```http
POST /admin/wallets/{id}/actions/lock
POST /admin/merchants/{id}/actions/suspend
POST /admin/webhooks/{id}/actions/retry
```

---

## 3. Phạm vi API Phase 1

Phase 1 gồm các nhóm:

| Module | Scope |
|---|---|
| Auth | Register, login, refresh, logout, forgot/reset/change password |
| Identity/RBAC | Users, roles, permissions |
| Wallet | Xem ví, số dư, statement, admin quản lý ví |
| Transaction/Ledger | Lịch sử giao dịch, ledger entries, đối soát |
| Topup | User nạp tiền giả lập |
| Transfer | User chuyển tiền |
| Merchant | Merchant profile, API keys, callback config |
| Payment Gateway | Merchant tạo payment, query status, cancel payment |
| QR Payment | User quét QR, confirm payment |
| Webhook | Callback logs, retry |
| Refund | Merchant/Admin refund |
| Admin | User, wallet, merchant, payment, transaction management |
| Dashboard | KPI admin/merchant |
| Report | Báo cáo topup, transfer, payment, refund, webhook, ledger |
| Setting | App settings, setting histories |
| Audit Log | Audit logs, system logs, payment trace |
| Platform | Health/status |

---

## 4. API Groups

---

## 4.1. Auth

### Endpoints

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/auth/register` | User đăng ký ví | Public |
| POST | `/auth/login` | Đăng nhập user/admin/merchant portal | Public |
| POST | `/auth/refresh-token` | Refresh token | Public |
| POST | `/auth/logout` | Đăng xuất | JWT |
| POST | `/auth/forgot-password` | Quên mật khẩu | Public |
| POST | `/auth/reset-password` | Đặt lại mật khẩu | Public |
| POST | `/auth/change-password` | Đổi mật khẩu | JWT |
| POST | `/auth/revoke-token` | Revoke refresh token | JWT |
| GET | `/auth/me` | Thông tin user hiện tại | JWT |

### Domain decisions

- `login_id` hỗ trợ `username | email | phone`.
- Register user ví thành công phải tạo ví mặc định.
- Refresh token dùng rotation.
- Password reset phải revoke session cũ.
- Login sai nhiều lần phải ghi MongoDB `security_logs`; không có bảng PostgreSQL `auth_login_attempts`.

---

## 4.2. Identity & Access

### Users

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/users` | Admin xem danh sách user | Admin |
| POST | `/admin/customers` | Admin tạo khách hàng (tự động cấp ví) | Admin |
| POST | `/admin/staffs` | Admin tạo nhân viên (không có ví, phân quyền RBAC) | Admin |
| GET | `/admin/users/{id}` | Admin xem chi tiết user | Admin |
| PATCH | `/admin/users/{id}` | Admin cập nhật user | Admin |
| POST | `/admin/users/{id}/actions/lock` | Khóa user | Admin |
| POST | `/admin/users/{id}/actions/unlock` | Mở khóa user | Admin |
| POST | `/admin/users/{id}/actions/reset-password` | Reset password | Admin |

### Roles/Permissions

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/roles` | Danh sách role | Admin |
| POST | `/admin/roles` | Tạo role | Super Admin |
| GET | `/admin/roles/{id}` | Chi tiết role | Admin |
| PATCH | `/admin/roles/{id}` | Cập nhật role | Super Admin |
| GET | `/admin/permissions` | Danh sách permission | Admin |

---

## 4.3. Wallet

### User Wallet API

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/wallets/me` | Xem ví của user hiện tại | User |
| GET | `/wallets/me/balance` | Xem số dư ví | User |
| GET | `/wallets/me/summary` | Tổng quan ví | User |
| GET | `/wallets/me/history` | Lịch sử biến động | User |
| GET | `/wallets/me/ledger` | Ledger của ví | User |
| GET | `/wallets/me/linked-banks` | Danh sách ngân hàng/thẻ liên kết | User |
| POST | `/wallets/me/linked-banks` | Tạo liên kết ngân hàng/thẻ | User |
| GET | `/wallets/me/limits` | Xem hạn mức ví | User |

### Admin Wallet API

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/wallets` | Admin xem danh sách ví | Admin |
| GET | `/admin/wallets/{id}` | Chi tiết ví | Admin |
| GET | `/admin/wallets/{id}/summary` | Tổng quan ví | Admin |
| GET | `/admin/wallets/{id}/ledger` | Ledger ví | Admin |
| POST | `/admin/wallets/{id}/actions/lock` | Khóa ví | Admin |
| POST | `/admin/wallets/{id}/actions/unlock` | Mở khóa ví | Admin |

### Business rules

- User chỉ xem ví của mình.
- Admin không được sửa số dư trực tiếp.
- Ví LOCKED không được topup/transfer/payment.
- Khóa/mở ví phải nhập reason và ghi audit.

---

## 4.4. Topup

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/topups` | User nạp tiền giả lập | User |
| GET | `/topups/me` | User xem lịch sử nạp | User |
| GET | `/topups/me/{id}` | User xem chi tiết nạp | User |
| GET | `/admin/topups` | Admin xem toàn bộ topup | Admin |
| GET | `/admin/topups/{id}` | Admin xem chi tiết topup | Admin |

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: <key>
```

### Side effects

`POST /topups`:

- Tạo `deposit_transactions`.
- Tạo `ledger_transactions` type `TOPUP`.
- Tạo `ledger_entries`.
- Cộng `wallet_balances.available_balance`.
- Ghi `idempotency_keys`.
- Ghi MongoDB `audit_logs`.

### Withdrawal

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/withdrawals` | Rút tiền về `linked_bank_id` | User |
| GET | `/withdrawals/me` | Lịch sử rút tiền | User |
| GET | `/withdrawals/me/{id}` | Chi tiết rút tiền | User |

`withdrawal_transactions` chỉ lưu `linked_bank_id`; không lưu trực tiếp `bank_code` hoặc `account_number`. Ledger WITHDRAWAL liên kết bằng `source_type + source_id`.

Các bảng `chat_messages`, `group_fundings` và `group_funding_members` thuộc schema core nhưng chưa công bố API trong phase 1.

---

## 4.5. Transfer

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/transfers/receivers/lookup` | Tìm người nhận | User |
| POST | `/transfers` | Tạo chuyển tiền | User |
| GET | `/transfers/me` | User xem lịch sử chuyển tiền | User |
| GET | `/transfers/me/{id}` | User xem chi tiết chuyển tiền | User |
| GET | `/admin/transfers` | Admin xem toàn bộ transfer | Admin |
| GET | `/admin/transfers/{id}` | Admin xem chi tiết transfer | Admin |

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: <key>
```

### Side effects

`POST /transfers`:

- Tạo `wallet_transfers`.
- Lock ví gửi và ví nhận.
- Tạo ledger `TRANSFER`.
- DEBIT ví gửi.
- CREDIT ví nhận.
- Cập nhật `wallet_balances`.
- Ghi audit.

---

## 4.6. Transaction & Ledger

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/transactions/me` | User xem lịch sử giao dịch | User |
| GET | `/transactions/me/{id}` | User xem chi tiết giao dịch | User |
| GET | `/admin/transactions` | Admin xem toàn bộ giao dịch | Admin |
| GET | `/admin/transactions/{id}` | Chi tiết giao dịch | Admin |
| GET | `/admin/ledger-entries` | Tra cứu ledger entries | Admin |
| POST | `/admin/transactions/reconcile` | Chạy đối soát ledger | Admin |

### Business rules

- User chỉ xem giao dịch liên quan đến ví của mình.
- Ledger transaction/entry không cho sửa/xóa.
- Đối soát chỉ đọc, không tự sửa dữ liệu.
- Ledger lệch ghi system log CRITICAL.

---

## 4.7. Merchant

### Merchant Portal

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/merchants/register` | Merchant tự đăng ký | Public |
| GET | `/merchant/profile` | Merchant xem profile | Merchant JWT |
| PATCH | `/merchant/profile` | Cập nhật profile | Merchant Owner |
| GET | `/merchant/api-keys` | Danh sách API key | Merchant Owner |
| POST | `/merchant/api-keys` | Tạo API key | Merchant Owner |
| POST | `/merchant/api-keys/{id}/actions/rotate` | Rotate secret | Merchant Owner |
| POST | `/merchant/api-keys/{id}/actions/revoke` | Revoke API key | Merchant Owner |
| GET | `/merchant/callback-config` | Xem callback config | Merchant Owner |
| PATCH | `/merchant/callback-config` | Cập nhật callback config | Merchant Owner |

### Admin Merchant

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/merchants` | Danh sách merchant | Admin |
| POST | `/admin/merchants` | Admin tạo merchant (kèm owner, API key, callback) | Admin |
| GET | `/admin/merchants/{id}` | Chi tiết merchant | Admin |
| POST | `/admin/merchants/{id}/actions/approve` | Duyệt merchant | Admin |
| POST | `/admin/merchants/{id}/actions/reject` | Từ chối merchant | Admin |
| POST | `/admin/merchants/{id}/actions/suspend` | Tạm ngưng merchant | Admin |
| POST | `/admin/merchants/{id}/actions/activate` | Kích hoạt lại merchant | Admin |
| GET | `/admin/merchants/{id}/api-keys` | API keys merchant | Admin |

---

## 4.8. Payment Gateway

### Merchant Open API

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/merchant/payments` | Merchant tạo payment | API Key + Signature |
| GET | `/merchant/payments/{id}` | Query payment theo ID | API Key + Signature |
| GET | `/merchant/payments/by-order/{merchant_order_id}` | Query theo mã đơn merchant | API Key + Signature |
| POST | `/merchant/payments/{id}/actions/cancel` | Hủy payment | API Key + Signature |

### Merchant Portal Payment

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/merchant/payment-orders` | Merchant xem payment orders | Merchant JWT |
| GET | `/merchant/payment-orders/{id}` | Merchant xem chi tiết payment | Merchant JWT |

### Admin Payment

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/payment-orders` | Admin xem payment orders | Admin |
| GET | `/admin/payment-orders/{id}` | Chi tiết payment | Admin |
| GET | `/admin/payment-orders/{id}/timeline` | Timeline payment flow | Admin |
| GET | `/admin/payment-orders/{id}/ledger` | Ledger payment | Admin |
| GET | `/admin/payment-orders/{id}/callbacks` | Callback của payment | Admin |

### Side effects

`POST /merchant/payments`:

- Verify API key/signature.
- Kiểm tra idempotency.
- Tạo `payment_orders`.
- Tạo `payment_qr_codes`.
- Ghi audit.

---

## 4.9. QR Payment

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/qr-payments/{qr_token}` | Resolve QR, xem thông tin thanh toán | User |
| POST | `/qr-payments/{qr_token}/confirm` | User xác nhận thanh toán | User |
| POST | `/qr-payments/{qr_token}/cancel` | User hủy thao tác trên app | User |
| GET | `/admin/qr-payments` | Admin tra cứu QR | Admin |
| GET | `/admin/qr-payments/{id}` | Chi tiết QR/payment flow | Admin |
| POST | `/admin/qr-payments/jobs/expire` | Chạy job expire QR demo | Admin |

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: <key>
```

### Side effects

`POST /qr-payments/{qr_token}/confirm`:

- Kiểm tra QR/payment còn hiệu lực.
- Lock payment order.
- Lock wallet balance.
- Tạo `payment_transactions`.
- Tạo ledger `PAYMENT`.
- DEBIT user wallet.
- CREDIT merchant balance.
- Cập nhật `payment_orders = PAID`.
- Cập nhật QR `USED`.
- Tạo `outbox_events` cho `PAYMENT_SUCCESS`.
- Ghi MongoDB audit.

---

## 4.10. Webhook/Callback

### Merchant Webhook Logs

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/merchant/webhooks` | Merchant xem webhook của mình | Merchant JWT |
| GET | `/merchant/webhooks/{id}` | Chi tiết webhook | Merchant JWT |
| POST | `/merchant/webhooks/{id}/actions/retry` | Merchant retry webhook của mình | Merchant Owner |

### Admin Webhook

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/webhooks` | Admin xem toàn bộ callback | Admin |
| GET | `/admin/webhooks/{id}` | Chi tiết callback | Admin |
| POST | `/admin/webhooks/{id}/actions/retry` | Admin retry callback | Admin |
| POST | `/admin/webhooks/jobs/retry-due` | Chạy job retry due demo | Admin |

### Business rules

- Callback lỗi không rollback payment/refund.
- Callback phải có signature.
- Retry không tạo payment transaction mới.
- Chỉ HTTP 2xx được xem là success.

---

## 4.11. Refund

### Merchant Refund

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/merchant/refunds` | Merchant tạo refund | Merchant API/JWT tùy flow |
| GET | `/merchant/refunds` | Merchant xem refund | Merchant JWT |
| GET | `/merchant/refunds/{id}` | Chi tiết refund | Merchant JWT |

### User Refund

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/refunds/me` | User xem refund của mình | User |

### Admin Refund

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/refunds` | Admin xem toàn bộ refund | Admin |
| GET | `/admin/refunds/{id}` | Admin xem chi tiết refund | Admin |
| POST | `/admin/refunds` | Admin tạo refund | Admin |

### Side effects

`POST /merchant/refunds` hoặc `POST /admin/refunds`:

- Kiểm tra payment PAID.
- Kiểm tra refundable amount.
- Tạo `refund_transactions`.
- Tạo ledger `REFUND`.
- DEBIT merchant balance/system account.
- CREDIT user wallet.
- Cập nhật `payment_orders.refund_status`.
- Tạo webhook `REFUND_SUCCESS`.
- Ghi audit.

---

## 4.12. Dashboard

### Admin Dashboard

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/dashboard/kpis` | KPI tổng quan | Admin |
| GET | `/admin/dashboard/transactions-chart` | Biểu đồ giao dịch | Admin |
| GET | `/admin/dashboard/success-rate` | Tỷ lệ thành công | Admin |
| GET | `/admin/dashboard/top-merchants` | Top merchant | Admin |
| GET | `/admin/dashboard/recent-activities` | Hoạt động gần đây | Admin |
| GET | `/admin/dashboard/alerts` | Cảnh báo hệ thống | Admin |

### Merchant Dashboard

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/merchant/dashboard/kpis` | KPI merchant | Merchant JWT |
| GET | `/merchant/dashboard/chart` | Biểu đồ merchant | Merchant JWT |
| GET | `/merchant/dashboard/recent-activities` | Hoạt động merchant | Merchant JWT |

---

## 4.13. Reports

### Admin Reports

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/reports/wallet-transactions` | Báo cáo giao dịch ví | Admin |
| GET | `/admin/reports/topups` | Báo cáo topup | Admin |
| GET | `/admin/reports/transfers` | Báo cáo transfer | Admin |
| GET | `/admin/reports/payments` | Báo cáo payment | Admin |
| GET | `/admin/reports/refunds` | Báo cáo refund | Admin |
| GET | `/admin/reports/merchants` | Báo cáo merchant | Admin |
| GET | `/admin/reports/webhooks` | Báo cáo webhook | Admin |
| POST | `/admin/reports/ledger-reconciliation` | Đối soát ledger | Admin |
| POST | `/admin/reports/{report_code}/export` | Export báo cáo | Admin |

### Merchant Reports

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/merchant/reports/payments` | Báo cáo payment merchant | Merchant JWT |
| GET | `/merchant/reports/refunds` | Báo cáo refund merchant | Merchant JWT |
| GET | `/merchant/reports/webhooks` | Báo cáo webhook merchant | Merchant JWT |

---

## 4.14. Settings

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/settings` | Xem toàn bộ settings | Admin |
| GET | `/admin/settings/{group}` | Xem setting theo nhóm | Admin |
| PATCH | `/admin/settings/{group}` | Cập nhật setting | Super Admin |
| GET | `/admin/settings/history` | Lịch sử thay đổi setting | Admin |
| POST | `/admin/settings/{group}/actions/reset-default` | Reset default | Super Admin |

### Setting groups

```text
security
wallet
topup
transfer
payment
qr
webhook
fee
logging
```

---

## 4.15. Audit/System Logs

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/admin/audit-logs` | Danh sách audit log | Admin |
| GET | `/admin/audit-logs/{id}` | Chi tiết audit log | Admin |
| GET | `/admin/system-logs` | Danh sách system log | Admin |
| GET | `/admin/system-logs/{id}` | Chi tiết system log | Admin |
| GET | `/admin/security-logs` | Security logs nếu tách riêng | Admin |
| GET | `/admin/traces/{trace_id}` | Trace theo trace_id | Admin |
| GET | `/admin/traces/payment/{payment_no}` | Trace payment flow | Admin |
| POST | `/admin/logs/export` | Export log | Admin |

---

## 4.16. Platform

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | `/health` | Health check | Public |
| GET | `/status` | System status | Public/Admin tùy cấu hình |

---

## 5. Domain Decisions

### 5.1. Wallet

- Mỗi user có một ví chính trong MVP.
- Admin không được sửa số dư thủ công.
- Số dư chỉ thay đổi qua ledger.
- Ví LOCKED không được topup/transfer/payment.

### 5.2. Ledger

- Ledger là nguồn truy vết dòng tiền.
- Giao dịch tiền SUCCESS phải có ledger transaction.
- Transfer/Payment/Refund phải cân bằng Debit/Credit.
- Ledger entries immutable.

### 5.3. Topup

- Topup là giả lập, không tích hợp ngân hàng thật.
- Topup thành công cộng tiền vào ví user.
- Topup phải có idempotency.

### 5.4. Transfer

- Không cho chuyển tiền cho chính mình.
- Không cho chuyển nếu số dư không đủ.
- Phải lock balance ví gửi/ví nhận.
- Request trùng không được chuyển tiền lần hai.

### 5.5. Payment Gateway

- Merchant ACTIVE mới tạo payment.
- Merchant API phải có API Key + Signature.
- `merchant_order_id` unique theo merchant.
- Payment PENDING mới thanh toán được.
- Payment PAID không được cancel.
- Một payment chỉ có một transaction SUCCESS.

### 5.6. QR Payment

- QR dynamic theo payment order.
- QR ACTIVE mới thanh toán được.
- QR hết hạn/đã dùng không thanh toán được.
- Amount lấy từ DB, không tin client.

### 5.7. Webhook

- Payment/refund success tạo webhook event.
- Callback lỗi không rollback payment/refund.
- Retry có giới hạn.
- Webhook phải ký signature.

### 5.8. Refund

- Chỉ payment PAID mới refund được.
- Tổng refund không vượt payment amount.
- Refund thành công phải ghi ledger.
- Refund lỗi không được cập nhật số dư.

### 5.9. Audit

- Audit log không sửa/xóa.
- Không log password/token/API secret.
- Payment flow phải trace được.

---

## 6. Side Effects bắt buộc ghi trong API detail

| Endpoint | Side effects |
|---|---|
| `POST /auth/register` | Tạo user, tạo wallet, wallet_balance, audit |
| `POST /topups` | Deposit, ledger TOPUP, credit wallet, audit |
| `POST /transfers` | Transfer, ledger TRANSFER, debit/credit wallets, audit |
| `POST /merchant/payments` | Payment order, QR, idempotency, audit |
| `POST /qr-payments/{qr_token}/confirm` | Payment transaction, ledger PAYMENT, debit user, credit merchant, callback, audit |
| `POST /merchant/refunds` | Refund, ledger REFUND, credit user, callback, audit |
| `POST /admin/webhooks/{id}/actions/retry` | Retry callback only, no money movement |
| `POST /admin/transactions/reconcile` | Read-only reconciliation, system log if mismatch |

---

## 7. Non-functional Rules

| Nhóm | Rule |
|---|---|
| Security | JWT, API Key, Signature, no secret in logs |
| Idempotency | Required for money-moving endpoints |
| Transaction | Money operations use DB transaction |
| Locking | Lock wallet balance before debit |
| Audit | Audit all money and admin actions |
| Logging | System log for technical errors |
| Rate limit | Login, merchant API, payment confirm |
| Timeout | Webhook timeout configurable |
| Retry | Webhook retry with backoff |
| Pagination | Required for all list APIs |
| Export | Large export should be async |
| Versioning | Base version `/api/v1` |

---

## 8. Permission Namespace

Đề xuất namespace:

```text
access-control.users.read
access-control.roles.manage

wallet.wallets.read
wallet.wallets.lock
wallet.topups.create
wallet.transfers.create
wallet.transactions.read

merchant.merchants.read
merchant.merchants.approve
merchant.api-keys.manage

payment.payment-orders.create
payment.payment-orders.read
payment.qr-payments.confirm
payment.refunds.create

webhook.callbacks.read
webhook.callbacks.retry

reports.payments.read
reports.ledger.reconcile

operations.settings.read
operations.settings.update

audit.audit-logs.read
audit.system-logs.read
```

---

## 9. Error Codes chính

| Nhóm | Codes |
|---|---|
| Common | VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_SERVER_ERROR |
| Auth | INVALID_CREDENTIALS, ACCOUNT_LOCKED, TOKEN_EXPIRED, REFRESH_TOKEN_INVALID |
| Wallet | WALLET_NOT_FOUND, WALLET_NOT_ACTIVE, INSUFFICIENT_BALANCE, LIMIT_EXCEEDED |
| Payment | PAYMENT_NOT_FOUND, PAYMENT_EXPIRED, PAYMENT_ALREADY_PAID, PAYMENT_NOT_PAYABLE |
| QR | QR_INVALID, QR_EXPIRED, QR_ALREADY_USED |
| Merchant | MERCHANT_NOT_FOUND, MERCHANT_NOT_ACTIVE, API_KEY_INVALID, SIGNATURE_INVALID |
| Idempotency | IDEMPOTENCY_KEY_REQUIRED, IDEMPOTENCY_CONFLICT, REQUEST_PROCESSING |
| Webhook | CALLBACK_NOT_FOUND, CALLBACK_RETRY_LIMIT_EXCEEDED |
| Ledger | LEDGER_UNBALANCED, LEDGER_NOT_FOUND |

---

## 10. Thứ tự ưu tiên implement API

### Phase A — Foundation

1. Auth
2. Users/Roles/Permissions
3. Wallets
4. Transactions/Ledger base
5. Settings
6. Audit logs

### Phase B — User wallet

1. Topup
2. Transfer
3. Wallet statement
4. Admin wallet/user management

### Phase C — Merchant payment

1. Merchant profile/API keys
2. Merchant create payment
3. QR generation
4. Merchant query payment

### Phase D — QR payment/webhook

1. Resolve QR
2. Confirm QR payment
3. Payment ledger
4. Callback/webhook
5. Retry callback

### Phase E — Refund/report/admin

1. Refund
2. Admin payment management
3. Dashboard
4. Reports
5. Ledger reconciliation
6. Trace payment flow

---

## 11. Tài liệu chi tiết liên quan

| Tài liệu | Mục đích |
|---|---|
| `API_CONVENTIONS_WALLET_PAYMENT.md` | Quy ước chung |
| `API_DESIGN_DETAIL_WALLET_PAYMENT.md` | Request/response chi tiết |
| `FRS_MAIN_WALLET_PAYMENT.md` | FRS tổng quan |
| `FRS_MOD_*.md` | FRS từng module |
| `ewallet_core_db.sql` | Schema PostgreSQL chuẩn |
| PostgreSQL dump `COPY` data | Dữ liệu hiện có trong bản core nếu được cung cấp |

---

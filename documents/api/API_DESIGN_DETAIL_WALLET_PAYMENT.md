# API Design Chi tiết — Wallet Payment Gateway

> Phiên bản: 1.0 | Ngày: 08/06/2026  
> Áp dụng cho: Đề tài **Xây dựng Ví điện tử và Cổng thanh toán**  
> Ghi chú: Payload/response ưu tiên dùng `snake_case` và bám theo `ewallet_core_db.sql`.
>
> PostgreSQL lưu dữ liệu nghiệp vụ; MongoDB lưu `audit_logs`, `system_logs`, `security_logs`, `webhook_attempt_logs`. Webhook event dùng `outbox_events`. Các bảng nghiệp vụ liên kết ledger qua `ledger_transactions.source_type + source_id`.

---

## 1. Conventions

### 1.1. Base URL

```http
/api/v1
```

### 1.2. Required headers

User/Admin protected API:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Endpoint nhạy cảm có side effect:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: <unique_key>
```

Merchant Open API:

```http
X-API-Key: <merchant_api_key>
X-Timestamp: <timestamp>
X-Signature: <signature>
Content-Type: application/json
Idempotency-Key: <unique_key>
```

### 1.3. Query convention

```http
filters
sorts
page
page_size
include
fields
include_inactive
```

Ví dụ:

```http
GET /api/v1/admin/payment-orders?filters=status==PAID&sorts=-created_at&page=1&page_size=20
GET /api/v1/transactions/me?filters=transaction_type==PAYMENT&sorts=-created_at&page=1&page_size=20
GET /api/v1/admin/wallets/{id}?include=balance,ledger
```

### 1.4. Success response

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "trace_id": "trace-001"
}
```

### 1.5. Paged response

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

### 1.6. Error response

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

---

# 2. Auth API

## 2.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | User đăng ký ví |
| POST | `/auth/login` | Đăng nhập |
| POST | `/auth/refresh-token` | Refresh token |
| POST | `/auth/logout` | Đăng xuất |
| POST | `/auth/forgot-password` | Quên mật khẩu |
| POST | `/auth/reset-password` | Đặt lại mật khẩu |
| POST | `/auth/change-password` | Đổi mật khẩu |
| POST | `/auth/revoke-token` | Revoke token |
| GET | `/auth/me` | User hiện tại |

---

## 2.2. POST `/auth/register`

### Mô tả

User đăng ký tài khoản ví. Sau khi đăng ký thành công, hệ thống tạo ví mặc định và số dư ban đầu bằng 0.

### Auth

Public

### Request

```json
{
  "full_name": "Nguyen Van An",
  "phone": "0900000001",
  "email": "an@example.com",
  "password": "Password@123",
  "confirm_password": "Password@123"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "User registered",
  "data": {
    "user": {
      "id": "00000000-0000-0000-0000-000000000101",
      "username": "user_an",
      "full_name": "Nguyen Van An",
      "phone": "0900000001",
      "email": "an@example.com",
      "status": "ACTIVE"
    },
    "wallet": {
      "id": "00000000-0000-0000-0000-000000000201",
      "wallet_no": "WAL000001",
      "status": "ACTIVE",
      "currency": "VND",
      "available_balance": 0,
      "locked_balance": 0
    }
  },
  "trace_id": "trace-auth-register-001"
}
```

### Storage affected

```text
users
user_roles
wallets
wallet_balances
MongoDB audit_logs
```

### Business rules

- Phone phải unique.
- Email nếu có phải unique.
- Password phải hash.
- Tạo user và tạo ví phải cùng transaction.
- Nếu tạo ví lỗi thì rollback user.
- User mới có role `USER`.

---

## 2.3. POST `/auth/login`

### Request

```json
{
  "login_id": "0900000001",
  "password": "Password@123"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Login success",
  "data": {
    "access_token": "jwt-access-token",
    "refresh_token": "refresh-token",
    "expires_in": 3600,
    "user": {
      "id": "00000000-0000-0000-0000-000000000101",
      "username": "user_an",
      "full_name": "Nguyen Van An",
      "phone": "0900000001",
      "email": "an@example.com",
      "status": "ACTIVE",
      "roles": ["USER"],
      "permissions": [
        "wallet.wallets.read",
        "wallet.topups.create",
        "wallet.transfers.create",
        "payment.qr-payments.confirm"
      ]
    }
  },
  "trace_id": "trace-auth-login-001"
}
```

### Business rules

- `login_id` hỗ trợ username/email/phone.
- Không thông báo rõ sai tài khoản hay sai mật khẩu.
- Sai quá số lần cấu hình thì khóa tạm.
- Login thành công tạo refresh token và reset failed attempts.

---

## 2.4. POST `/auth/refresh-token`

### Request

```json
{
  "refresh_token": "refresh-token"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "access_token": "jwt-access-token-new",
    "refresh_token": "refresh-token-new",
    "expires_in": 3600
  },
  "trace_id": "trace-auth-refresh-001"
}
```

### Business rules

- Dùng refresh token rotation.
- Refresh token cũ bị revoke sau khi dùng.
- Nếu phát hiện reuse token cũ, revoke token family.

---

## 2.5. GET `/auth/me`

### Response `200`

```json
{
  "success": true,
  "message": "Current user",
  "data": {
    "id": "00000000-0000-0000-0000-000000000101",
    "username": "user_an",
    "full_name": "Nguyen Van An",
    "phone": "0900000001",
    "email": "an@example.com",
    "status": "ACTIVE",
    "roles": [
      {
        "code": "USER",
        "name": "User"
      }
    ],
    "permissions": [
      "wallet.wallets.read",
      "wallet.topups.create"
    ]
  },
  "trace_id": "trace-auth-me-001"
}
```

---

# 3. Wallet API

## 3.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/wallets/me` | Xem ví của user hiện tại |
| GET | `/wallets/me/balance` | Xem số dư |
| GET | `/wallets/me/summary` | Tổng quan ví |
| GET | `/wallets/me/history` | Lịch sử biến động |
| GET | `/wallets/me/ledger` | Ledger ví |
| GET | `/admin/wallets` | Admin xem danh sách ví |
| GET | `/admin/wallets/{id}` | Chi tiết ví |
| POST | `/admin/wallets/{id}/actions/lock` | Khóa ví |
| POST | `/admin/wallets/{id}/actions/unlock` | Mở khóa ví |

---

## 3.2. GET `/wallets/me`

### Response `200`

```json
{
  "success": true,
  "message": "Wallet detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000201",
    "wallet_no": "WAL000001",
    "wallet_type": "PERSONAL",
    "status": "ACTIVE",
    "currency": "VND",
    "available_balance": 1680000,
    "locked_balance": 0,
    "total_balance": 1680000,
    "updated_at": "2026-06-08T09:30:00Z"
  },
  "trace_id": "trace-wallet-me-001"
}
```

### Business rules

- User chỉ xem ví của chính mình.
- Số dư lấy từ `wallet_balances`.
- Không tính số dư ở client.

---

## 3.3. GET `/wallets/me/history`

### Query

```http
GET /wallets/me/history?filters=transaction_type==PAYMENT&sorts=-created_at&page=1&page_size=20
```

### Response `200`

```json
{
  "success": true,
  "message": "Wallet history",
  "data": [
    {
      "transaction_id": "00000000-0000-0000-0000-000000000501",
      "transaction_no": "PAY000001",
      "transaction_type": "PAYMENT",
      "entry_type": "DEBIT",
      "amount": 320000,
      "currency": "VND",
      "balance_before": 2000000,
      "balance_after": 1680000,
      "description": "Thanh toan Coffee Demo Merchant",
      "status": "SUCCESS",
      "created_at": "2026-06-08T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  },
  "trace_id": "trace-wallet-history-001"
}
```

---

## 3.4. POST `/admin/wallets/{id}/actions/lock`

### Request

```json
{
  "reason": "Suspected fraud transaction"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Wallet locked",
  "data": {
    "id": "00000000-0000-0000-0000-000000000201",
    "wallet_no": "WAL000001",
    "status": "LOCKED",
    "locked_at": "2026-06-08T10:00:00Z",
    "lock_reason": "Suspected fraud transaction"
  },
  "trace_id": "trace-wallet-lock-001"
}
```

### Business rules

- Chỉ Admin được khóa ví.
- Bắt buộc có `reason`.
- Khóa ví không làm thay đổi số dư.
- Ghi audit log.

---

# 4. Topup API

## 4.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/topups` | User nạp tiền giả lập |
| GET | `/topups/me` | Lịch sử nạp của user |
| GET | `/topups/me/{id}` | Chi tiết nạp |
| GET | `/admin/topups` | Admin xem topup |
| GET | `/admin/topups/{id}` | Admin xem chi tiết topup |

---

## 4.2. POST `/topups`

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: topup-user-001-amount-2000000
```

### Request

```json
{
  "amount": 2000000,
  "deposit_method": "SANDBOX_BANK",
  "description": "Nap tien demo"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Topup success",
  "data": {
    "id": "00000000-0000-0000-0000-000000000301",
    "deposit_no": "DEP000001",
    "wallet_id": "00000000-0000-0000-0000-000000000201",
    "amount": 2000000,
    "currency": "VND",
    "deposit_method": "SANDBOX_BANK",
    "status": "SUCCESS",
    "transaction_no": "TXN000001",
    "wallet_balance": {
      "available_balance": 2000000,
      "locked_balance": 0
    },
    "completed_at": "2026-06-08T08:00:00Z"
  },
  "trace_id": "trace-topup-create-001"
}
```

### Storage affected

```text
deposit_transactions
ledger_transactions
ledger_entries
wallet_balances
idempotency_keys
MongoDB audit_logs
```

### Transaction boundary

```text
BEGIN
- validate wallet ACTIVE
- validate amount and limits
- create deposit_transaction PENDING
- create ledger_transaction TOPUP
- create ledger_entries
- update wallet_balances
- update deposit_transaction SUCCESS
- save idempotency response
COMMIT
```

### Business rules

- Ví phải ACTIVE.
- Amount > 0.
- Không vượt hạn mức.
- Request trùng `Idempotency-Key` không cộng tiền lần hai.
- Nếu ledger lỗi thì rollback toàn bộ.

---

# 5. Transfer API

## 5.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/transfers/receivers/lookup` | Tìm người nhận |
| POST | `/transfers` | Chuyển tiền |
| GET | `/transfers/me` | Lịch sử chuyển tiền |
| GET | `/transfers/me/{id}` | Chi tiết chuyển tiền |
| GET | `/admin/transfers` | Admin xem transfer |
| GET | `/admin/transfers/{id}` | Admin xem chi tiết transfer |

---

## 5.2. GET `/transfers/receivers/lookup`

### Query

```http
GET /transfers/receivers/lookup?identifier=0900000002
```

### Response `200`

```json
{
  "success": true,
  "message": "Receiver found",
  "data": {
    "receiver_user_id": "00000000-0000-0000-0000-000000000102",
    "receiver_name": "Tran Thi Binh",
    "receiver_phone_masked": "090***0002",
    "wallet_id": "00000000-0000-0000-0000-000000000202",
    "wallet_no_masked": "WAL***002",
    "wallet_status": "ACTIVE"
  },
  "trace_id": "trace-transfer-lookup-001"
}
```

### Business rules

- Không trả full thông tin nhạy cảm.
- Không cho chuyển cho chính mình.
- Ví nhận phải ACTIVE.

---

## 5.3. POST `/transfers`

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: transfer-user-an-to-binh-150000
```

### Request

```json
{
  "receiver_identifier": "0900000002",
  "amount": 150000,
  "description": "Chuyen tien an trua",
  "pin_or_otp": "123456"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Transfer success",
  "data": {
    "id": "00000000-0000-0000-0000-000000000601",
    "transfer_no": "TRF000001",
    "sender_wallet_id": "00000000-0000-0000-0000-000000000201",
    "receiver_wallet_id": "00000000-0000-0000-0000-000000000202",
    "amount": 150000,
    "currency": "VND",
    "description": "Chuyen tien an trua",
    "status": "SUCCESS",
    "transaction_no": "TXN000002",
    "sender_balance": {
      "available_balance": 1850000
    },
    "completed_at": "2026-06-08T08:10:00Z"
  },
  "trace_id": "trace-transfer-create-001"
}
```

### Storage affected

```text
wallet_transfers
wallet_balances
ledger_transactions
ledger_entries
idempotency_keys
MongoDB audit_logs
```

### Transaction boundary

```text
BEGIN
- validate sender wallet ACTIVE
- validate receiver wallet ACTIVE
- lock sender wallet_balance
- lock receiver wallet_balance
- validate available_balance >= amount
- create wallet_transfer PENDING
- create ledger_transaction TRANSFER
- create ledger entry DEBIT sender
- create ledger entry CREDIT receiver
- update both balances
- update transfer SUCCESS
COMMIT
```

### Business rules

- Không chuyển cho chính mình.
- Ví gửi và ví nhận phải ACTIVE.
- Số dư khả dụng phải đủ.
- Tổng debit = tổng credit.
- Idempotency chống trừ tiền hai lần.

---

# 6. Transaction & Ledger API

## 6.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/transactions/me` | User xem lịch sử giao dịch |
| GET | `/transactions/me/{id}` | User xem chi tiết giao dịch |
| GET | `/admin/transactions` | Admin xem toàn bộ transaction |
| GET | `/admin/transactions/{id}` | Admin xem chi tiết |
| GET | `/admin/ledger-entries` | Admin tra cứu ledger entries |
| POST | `/admin/transactions/reconcile` | Đối soát ledger |

---

## 6.2. GET `/transactions/me`

### Query

```http
GET /transactions/me?filters=transaction_type==PAYMENT;status==SUCCESS&sorts=-created_at&page=1&page_size=20
```

### Response `200`

```json
{
  "success": true,
  "message": "Transactions",
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000403",
      "transaction_no": "TXN000003",
      "transaction_type": "PAYMENT",
      "status": "SUCCESS",
      "amount": 320000,
      "currency": "VND",
      "source_type": "PAYMENT_ORDER",
      "description": "Thanh toan Coffee Demo Merchant",
      "created_at": "2026-06-08T09:00:00Z",
      "completed_at": "2026-06-08T09:00:03Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  },
  "trace_id": "trace-transactions-me-001"
}
```

---

## 6.3. GET `/admin/transactions/{id}`

### Response `200`

```json
{
  "success": true,
  "message": "Transaction detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000403",
    "transaction_no": "TXN000003",
    "transaction_type": "PAYMENT",
    "status": "SUCCESS",
    "amount": 320000,
    "currency": "VND",
    "source_type": "PAYMENT_ORDER",
    "source_id": "00000000-0000-0000-0000-000000000701",
    "entries": [
      {
        "entry_type": "DEBIT",
        "account_type": "USER_WALLET",
        "wallet_id": "00000000-0000-0000-0000-000000000201",
        "amount": 320000,
        "balance_before": 2000000,
        "balance_after": 1680000
      },
      {
        "entry_type": "CREDIT",
        "account_type": "MERCHANT_BALANCE",
        "merchant_id": "00000000-0000-0000-0000-000000000801",
        "amount": 320000,
        "balance_before": 0,
        "balance_after": 320000
      }
    ]
  },
  "trace_id": "trace-transaction-detail-001"
}
```

---

# 7. Merchant API

## 7.1. Merchant Portal Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/merchants/register` | Merchant đăng ký |
| GET | `/merchant/profile` | Xem profile |
| PATCH | `/merchant/profile` | Cập nhật profile |
| GET | `/merchant/api-keys` | Danh sách API key |
| POST | `/merchant/api-keys` | Tạo API key |
| POST | `/merchant/api-keys/{id}/actions/rotate` | Rotate secret |
| POST | `/merchant/api-keys/{id}/actions/revoke` | Revoke API key |
| GET | `/merchant/callback-config` | Xem callback config |
| PATCH | `/merchant/callback-config` | Cập nhật callback config |

---

## 7.2. POST `/merchants/register`

### Request

```json
{
  "merchant_name": "Coffee Demo Merchant",
  "business_type": "OFFLINE",
  "representative_name": "Pham Van Coffee",
  "phone": "0900000101",
  "email": "coffee@example.com",
  "address": "123 Coffee Street, HCM",
  "owner_username": "merchant_one_owner",
  "owner_password": "Password@123"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Merchant registered",
  "data": {
    "merchant": {
      "id": "00000000-0000-0000-0000-000000000801",
      "merchant_code": "MER000001",
      "merchant_name": "Coffee Demo Merchant",
      "status": "PENDING_REVIEW"
    },
    "owner_user": {
      "id": "00000000-0000-0000-0000-000000000151",
      "username": "merchant_one_owner",
      "roles": ["MERCHANT_OWNER"]
    }
  },
  "trace_id": "trace-merchant-register-001"
}
```

---

## 7.3. POST `/merchant/api-keys`

### Request

```json
{
  "key_name": "Default Sandbox Key",
  "environment": "SANDBOX"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "API key created",
  "data": {
    "id": "00000000-0000-0000-0000-000000000901",
    "merchant_id": "00000000-0000-0000-0000-000000000801",
    "key_name": "Default Sandbox Key",
    "api_key": "pk_sandbox_coffee_demo",
    "api_secret": "sk_sandbox_show_once_only",
    "environment": "SANDBOX",
    "status": "ACTIVE",
    "created_at": "2026-06-08T07:00:00Z"
  },
  "trace_id": "trace-api-key-create-001"
}
```

### Business rules

- `api_secret` chỉ trả về một lần.
- DB chỉ lưu hash/encrypted secret.
- Tạo API key phải ghi audit.

---

# 8. Payment Gateway API

## 8.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/merchant/payments` | Merchant tạo payment |
| GET | `/merchant/payments/{id}` | Query payment theo ID |
| GET | `/merchant/payments/by-order/{merchant_order_id}` | Query theo mã đơn |
| POST | `/merchant/payments/{id}/actions/cancel` | Hủy payment |
| GET | `/merchant/payment-orders` | Merchant portal xem payment |
| GET | `/admin/payment-orders` | Admin xem payment |
| GET | `/admin/payment-orders/{id}` | Admin chi tiết payment |

---

## 8.2. POST `/merchant/payments`

### Auth

Merchant API Key + Signature

### Required headers

```http
X-API-Key: pk_sandbox_coffee_demo
X-Timestamp: 2026-06-08T09:00:00Z
X-Signature: hmac-signature
Content-Type: application/json
Idempotency-Key: merchant-order-ORDER-COFFEE-001
```

### Request

```json
{
  "merchant_order_id": "ORDER-COFFEE-001",
  "amount": 320000,
  "currency": "VND",
  "description": "Thanh toan don hang Coffee #001",
  "callback_url": "https://merchant.example.com/webhooks/payment",
  "redirect_url": "https://merchant.example.com/orders/ORDER-COFFEE-001",
  "expired_at": "2026-06-08T09:15:00Z",
  "metadata": {
    "table_no": "A01",
    "customer_note": "no sugar"
  }
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Payment created",
  "data": {
    "id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "merchant_order_id": "ORDER-COFFEE-001",
    "merchant_id": "00000000-0000-0000-0000-000000000801",
    "amount": 320000,
    "currency": "VND",
    "status": "PENDING",
    "payment_url": "https://wallet-demo.local/pay/qr_000001",
    "qr": {
      "id": "00000000-0000-0000-0000-000000000711",
      "qr_token": "qr_000001",
      "qr_payload": "https://wallet-demo.local/pay/qr_000001",
      "status": "ACTIVE",
      "expired_at": "2026-06-08T09:15:00Z"
    },
    "expired_at": "2026-06-08T09:15:00Z",
    "created_at": "2026-06-08T09:00:00Z"
  },
  "trace_id": "trace-payment-create-001"
}
```

### Storage affected

```text
payment_orders
payment_qr_codes
idempotency_keys
MongoDB audit_logs
```

### Business rules

- Merchant phải ACTIVE.
- API key phải ACTIVE.
- Signature hợp lệ.
- `merchant_order_id` unique theo merchant.
- Amount > 0.
- Payment mới có status `PENDING`.
- Tạo payment phải sinh QR.
- Request trùng idempotency key trả lại response cũ.

---

## 8.3. GET `/merchant/payments/{id}`

### Response `200`

```json
{
  "success": true,
  "message": "Payment detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "merchant_order_id": "ORDER-COFFEE-001",
    "amount": 320000,
    "currency": "VND",
    "status": "PAID",
    "paid_at": "2026-06-08T09:03:00Z",
    "refund_status": "PARTIALLY_REFUNDED",
    "refunded_amount": 100000,
    "transaction": {
      "transaction_no": "TXN000003",
      "status": "SUCCESS"
    },
    "callback_status": "SUCCESS"
  },
  "trace_id": "trace-payment-query-001"
}
```

---

# 9. QR Payment API

## 9.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/qr-payments/{qr_token}` | Resolve QR |
| POST | `/qr-payments/{qr_token}/confirm` | Xác nhận thanh toán |
| POST | `/qr-payments/{qr_token}/cancel` | User hủy thao tác |
| GET | `/admin/qr-payments` | Admin xem QR |
| GET | `/admin/qr-payments/{id}` | Admin chi tiết QR |

---

## 9.2. GET `/qr-payments/{qr_token}`

### Response `200`

```json
{
  "success": true,
  "message": "Payment information",
  "data": {
    "qr_token": "qr_000001",
    "payment_order_id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "merchant": {
      "id": "00000000-0000-0000-0000-000000000801",
      "merchant_code": "MER000001",
      "merchant_name": "Coffee Demo Merchant",
      "logo_url": null
    },
    "amount": 320000,
    "currency": "VND",
    "description": "Thanh toan don hang Coffee #001",
    "status": "PENDING",
    "expired_at": "2026-06-08T09:15:00Z",
    "payer_wallet": {
      "wallet_no": "WAL000001",
      "available_balance": 2000000,
      "currency": "VND"
    }
  },
  "trace_id": "trace-qr-resolve-001"
}
```

### Business rules

- QR phải ACTIVE.
- Payment phải PENDING.
- Payment chưa hết hạn.
- Amount lấy từ DB.

---

## 9.3. POST `/qr-payments/{qr_token}/confirm`

### Required headers

```http
Authorization: Bearer <access_token>
Idempotency-Key: pay-qr-000001-user-an
```

### Request

```json
{
  "pin_or_otp": "123456",
  "note": "Thanh toan bang vi"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Payment success",
  "data": {
    "payment_order_id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "merchant_order_id": "ORDER-COFFEE-001",
    "amount": 320000,
    "currency": "VND",
    "status": "PAID",
    "payment_transaction": {
      "id": "00000000-0000-0000-0000-000000000721",
      "status": "SUCCESS",
      "paid_at": "2026-06-08T09:03:00Z"
    },
    "ledger_transaction": {
      "id": "00000000-0000-0000-0000-000000000403",
      "transaction_no": "TXN000003"
    },
    "wallet_balance": {
      "available_balance": 1680000,
      "locked_balance": 0
    },
    "callback": {
      "event_id": "CBK000001",
      "status": "PENDING"
    }
  },
  "trace_id": "trace-qr-confirm-001"
}
```

### Storage affected

```text
payment_orders
payment_qr_codes
payment_transactions
wallet_balances
merchant_balances
ledger_transactions
ledger_entries
outbox_events
idempotency_keys
MongoDB audit_logs
MongoDB system_logs
MongoDB webhook_attempt_logs
```

### Transaction boundary

```text
BEGIN
- validate QR ACTIVE
- validate payment PENDING and not expired
- lock payment_order
- lock payer wallet_balance
- validate wallet ACTIVE
- validate available_balance >= amount
- create payment_transaction PENDING
- create ledger_transaction PAYMENT
- create DEBIT user wallet entry
- create CREDIT merchant balance entry
- update wallet_balance
- update merchant_balance
- update payment_transaction SUCCESS
- update payment_order PAID
- update QR USED
- create callback PENDING
- save idempotency response
COMMIT
```

### Business rules

- Một payment chỉ có tối đa một `SUCCESS`.
- Nếu request retry cùng idempotency key thì không trừ tiền lần hai.
- Callback lỗi không rollback payment.
- Nếu số dư không đủ, trả `INSUFFICIENT_BALANCE`.

---

# 10. Webhook API

## 10.1. Merchant nhận callback

### Endpoint merchant tự triển khai

```http
POST https://merchant.example.com/webhooks/payment
```

### Headers hệ thống gửi

```http
X-Webhook-Id: CBK000001
X-Webhook-Event: PAYMENT_SUCCESS
X-Timestamp: 2026-06-08T09:03:05Z
X-Signature: hmac-signature
X-Retry-Count: 0
```

### Payload

```json
{
  "event_id": "CBK000001",
  "event_type": "PAYMENT_SUCCESS",
  "payment_order_id": "00000000-0000-0000-0000-000000000701",
  "payment_no": "PAY000001",
  "merchant_order_id": "ORDER-COFFEE-001",
  "amount": 320000,
  "currency": "VND",
  "status": "PAID",
  "transaction_no": "TXN000003",
  "paid_at": "2026-06-08T09:03:00Z",
  "timestamp": "2026-06-08T09:03:05Z",
  "metadata": {
    "table_no": "A01"
  }
}
```

### Expected merchant response

```json
{
  "received": true
}
```

HTTP 2xx được xem là thành công.

---

## 10.2. Webhook management endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/merchant/webhooks` | Merchant xem webhook |
| GET | `/merchant/webhooks/{id}` | Chi tiết webhook |
| POST | `/merchant/webhooks/{id}/actions/retry` | Merchant retry webhook |
| GET | `/admin/webhooks` | Admin xem callback |
| GET | `/admin/webhooks/{id}` | Admin chi tiết callback |
| POST | `/admin/webhooks/{id}/actions/retry` | Admin retry |
| POST | `/admin/webhooks/jobs/retry-due` | Chạy retry due job |

---

## 10.3. POST `/admin/webhooks/{id}/actions/retry`

### Request

```json
{
  "reason": "Merchant server has been fixed"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Webhook retry queued",
  "data": {
    "id": "00000000-0000-0000-0000-000000000731",
    "event_id": "CBK000001",
    "status": "RETRYING",
    "retry_count": 2,
    "next_retry_at": "2026-06-08T10:05:00Z"
  },
  "trace_id": "trace-webhook-retry-001"
}
```

### Business rules

- Retry không tạo payment/refund mới.
- Retry phải ghi audit.
- Chỉ retry callback FAILED/RETRYING.
- Callback success không cần retry.

---

# 11. Refund API

## 11.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/merchant/refunds` | Merchant tạo refund |
| GET | `/merchant/refunds` | Merchant xem refund |
| GET | `/merchant/refunds/{id}` | Merchant chi tiết refund |
| GET | `/refunds/me` | User xem refund của mình |
| GET | `/admin/refunds` | Admin xem refund |
| GET | `/admin/refunds/{id}` | Admin chi tiết refund |
| POST | `/admin/refunds` | Admin tạo refund |

---

## 11.2. POST `/merchant/refunds`

### Required headers

```http
Authorization: Bearer <merchant_access_token>
Idempotency-Key: refund-order-coffee-001-100000
```

### Request

```json
{
  "payment_order_id": "00000000-0000-0000-0000-000000000701",
  "amount": 100000,
  "description": "Khach huy mot phan don hang"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Refund success",
  "data": {
    "id": "00000000-0000-0000-0000-000000000741",
    "refund_no": "RFD000001",
    "payment_order_id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "amount": 100000,
    "currency": "VND",
    "description": "Khach huy mot phan don hang",
    "status": "SUCCESS",
    "ledger_transaction": {
      "id": "00000000-0000-0000-0000-000000000404",
      "transaction_no": "TXN000004"
    },
    "refunded_at": "2026-06-08T09:30:00Z"
  },
  "trace_id": "trace-refund-create-001"
}
```

### Storage affected

```text
refund_transactions
payment_orders
wallet_balances
merchant_balances
ledger_transactions
ledger_entries
outbox_events
idempotency_keys
MongoDB audit_logs
MongoDB webhook_attempt_logs
```

### Transaction boundary

```text
BEGIN
- validate payment PAID
- validate merchant owns payment
- calculate refundable_amount
- validate amount <= refundable_amount
- lock merchant_balance
- lock user wallet_balance
- create refund_transaction PENDING
- create ledger_transaction REFUND
- DEBIT merchant balance
- CREDIT user wallet
- update balances
- update refund SUCCESS
- update payment_orders.refunded_amount/refund_status
- create webhook REFUND_SUCCESS
COMMIT
```

### Business rules

- Chỉ payment PAID mới refund được.
- Không refund vượt số tiền còn lại.
- Refund thành công phải ghi ledger.
- Request trùng không hoàn tiền lần hai.
- Refund success không cho sửa/xóa.

---

# 12. Admin APIs

## 12.1. Users

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/users` | Danh sách user |
| POST | `/admin/users` | Tạo người dùng ví (kèm ví, trả mật khẩu tạm 6 số, ép đổi MK) |
| POST | `/admin/staffs` | Tạo nhân viên (kèm RBAC role, trả mật khẩu tạm 6 số, ép đổi MK) |
| GET | `/admin/users/{id}` | Chi tiết user |
| PATCH | `/admin/users/{id}` | Cập nhật user |
| POST | `/admin/users/{id}/actions/lock` | Khóa user |
| POST | `/admin/users/{id}/actions/unlock` | Mở khóa user |
| POST | `/admin/users/{id}/actions/reset-password` | Reset password (trả mật khẩu tạm 6 số, ép đổi MK) |

## 12.2. Merchants

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/merchants` | Danh sách merchant |
| POST | `/admin/merchants` | Tạo merchant (kèm owner, webhook) |
| GET | `/admin/merchants/{id}` | Chi tiết merchant |
| POST | `/admin/merchants/{id}/actions/approve` | Duyệt merchant |
| POST | `/admin/merchants/{id}/actions/reject` | Từ chối |
| POST | `/admin/merchants/{id}/actions/suspend` | Tạm ngưng |
| POST | `/admin/merchants/{id}/actions/activate` | Kích hoạt lại |

## 12.3. Payment flow detail

### GET `/admin/payment-orders/{id}/timeline`

Response `200`:

```json
{
  "success": true,
  "message": "Payment timeline",
  "data": {
    "payment_order_id": "00000000-0000-0000-0000-000000000701",
    "payment_no": "PAY000001",
    "events": [
      {
        "time": "2026-06-08T09:00:00Z",
        "type": "PAYMENT_CREATED",
        "description": "Merchant created payment"
      },
      {
        "time": "2026-06-08T09:00:01Z",
        "type": "QR_CREATED",
        "description": "QR created"
      },
      {
        "time": "2026-06-08T09:03:00Z",
        "type": "PAYMENT_SUCCESS",
        "description": "User paid successfully"
      },
      {
        "time": "2026-06-08T09:03:05Z",
        "type": "WEBHOOK_SENT",
        "description": "Webhook sent to merchant"
      }
    ]
  },
  "trace_id": "trace-payment-timeline-001"
}
```

---

# 13. Dashboard API

## 13.1. Admin Dashboard

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/dashboard/kpis` | KPI tổng quan |
| GET | `/admin/dashboard/transactions-chart` | Biểu đồ giao dịch |
| GET | `/admin/dashboard/success-rate` | Tỷ lệ thành công |
| GET | `/admin/dashboard/top-merchants` | Top merchant |
| GET | `/admin/dashboard/recent-activities` | Hoạt động gần đây |
| GET | `/admin/dashboard/alerts` | Cảnh báo |

### GET `/admin/dashboard/kpis`

Response `200`:

```json
{
  "success": true,
  "message": "Dashboard KPIs",
  "data": {
    "total_users": 3,
    "active_wallets": 2,
    "total_merchants": 3,
    "payment_success_count": 2,
    "payment_success_amount": 1020000,
    "transfer_success_count": 2,
    "transfer_success_amount": 200000,
    "topup_success_amount": 3000000,
    "refund_success_amount": 100000,
    "callback_failed_count": 1
  },
  "trace_id": "trace-dashboard-kpis-001"
}
```

## 13.2. Merchant Dashboard

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/merchant/dashboard/kpis` | KPI merchant |
| GET | `/merchant/dashboard/chart` | Biểu đồ merchant |
| GET | `/merchant/dashboard/recent-activities` | Hoạt động merchant |

---

# 14. Reports API

## 14.1. Admin Reports

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/reports/wallet-transactions` | Báo cáo giao dịch ví |
| GET | `/admin/reports/topups` | Báo cáo topup |
| GET | `/admin/reports/transfers` | Báo cáo transfer |
| GET | `/admin/reports/payments` | Báo cáo payment |
| GET | `/admin/reports/refunds` | Báo cáo refund |
| GET | `/admin/reports/merchants` | Báo cáo merchant |
| GET | `/admin/reports/webhooks` | Báo cáo webhook |
| POST | `/admin/reports/ledger-reconciliation` | Đối soát ledger |
| POST | `/admin/reports/{report_code}/export` | Export report |

### GET `/admin/reports/payments`

Query:

```http
GET /admin/reports/payments?from_date=2026-06-01&to_date=2026-06-08&status=PAID&page=1&page_size=20
```

Response `200`:

```json
{
  "success": true,
  "message": "Payment report",
  "data": [
    {
      "payment_no": "PAY000001",
      "merchant_order_id": "ORDER-COFFEE-001",
      "merchant_name": "Coffee Demo Merchant",
      "amount": 320000,
      "currency": "VND",
      "status": "PAID",
      "paid_at": "2026-06-08T09:03:00Z",
      "callback_status": "SUCCESS"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "summary": {
      "total_paid_amount": 320000,
      "paid_count": 1
    }
  },
  "trace_id": "trace-report-payments-001"
}
```

---

# 15. Settings API

## 15.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/settings` | Xem toàn bộ setting |
| GET | `/admin/settings/{group}` | Xem theo group |
| PATCH | `/admin/settings/{group}` | Cập nhật setting |
| GET | `/admin/settings/history` | Lịch sử thay đổi |
| POST | `/admin/settings/{group}/actions/reset-default` | Reset default |

## 15.2. PATCH `/admin/settings/payment`

Request:

```json
{
  "payment_enabled": true,
  "min_payment_amount": 1000,
  "max_payment_amount": 50000000,
  "payment_expiry_minutes": 15,
  "require_merchant_signature": true,
  "signature_timestamp_tolerance_minutes": 5,
  "reason": "Update payment limits for demo"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Settings updated",
  "data": {
    "group": "payment",
    "updated_keys": [
      "payment_enabled",
      "max_payment_amount",
      "payment_expiry_minutes"
    ]
  },
  "trace_id": "trace-settings-payment-update-001"
}
```

---

# 16. Audit/System Log API

## 16.1. Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/admin/audit-logs` | Danh sách audit log |
| GET | `/admin/audit-logs/{id}` | Chi tiết audit |
| GET | `/admin/system-logs` | Danh sách system log |
| GET | `/admin/system-logs/{id}` | Chi tiết system log |
| GET | `/admin/security-logs` | Security logs |
| GET | `/admin/traces/{trace_id}` | Trace theo trace_id |
| GET | `/admin/traces/payment/{payment_no}` | Trace payment |
| POST | `/admin/logs/export` | Export log |

## 16.2. GET `/admin/audit-logs`

Response `200`:

```json
{
  "success": true,
  "message": "Audit logs",
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000001001",
      "trace_id": "trace-payment-create-001",
      "actor_type": "MERCHANT",
      "actor_id": "00000000-0000-0000-0000-000000000801",
      "action": "PAYMENT_CREATED",
      "entity_type": "payment_orders",
      "entity_id": "00000000-0000-0000-0000-000000000701",
      "metadata": {
        "payment_no": "PAY000001"
      },
      "ip_address": "127.0.0.1",
      "created_at": "2026-06-08T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  },
  "trace_id": "trace-audit-list-001"
}
```

---

# 17. Platform API

## 17.1. GET `/health`

Response `200`:

```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "UP",
    "server_time": "2026-06-08T10:00:00Z",
    "database": "UP"
  },
  "trace_id": "trace-health-001"
}
```

## 17.2. GET `/status`

Response `200`:

```json
{
  "success": true,
  "message": "System status",
  "data": {
    "api": "UP",
    "database": "UP",
    "queue": "UP",
    "version": "1.0.0"
  },
  "trace_id": "trace-status-001"
}
```

---

# 18. Important Implementation Notes

## 18.1. API không được có

```http
PATCH /wallet-balances/{id}
POST /ledger-entries
DELETE /payment-orders/{id}
DELETE /ledger-transactions/{id}
DELETE /wallet-transfers/{id}
```

Lý do: dữ liệu tiền phải được thay đổi qua nghiệp vụ hợp lệ, không sửa trực tiếp.

## 18.2. API bắt buộc có transaction boundary

| API | Transaction |
|---|---|
| `POST /topups` | Có |
| `POST /transfers` | Có |
| `POST /qr-payments/{qr_token}/confirm` | Có |
| `POST /merchant/refunds` | Có |
| `POST /admin/refunds` | Có |

## 18.3. API bắt buộc có idempotency

| API | Idempotency |
|---|---|
| `POST /topups` | Bắt buộc |
| `POST /transfers` | Bắt buộc |
| `POST /merchant/payments` | Bắt buộc |
| `POST /qr-payments/{qr_token}/confirm` | Bắt buộc |
| `POST /merchant/refunds` | Bắt buộc |

## 18.4. API bắt buộc ghi audit

| Nhóm | Events |
|---|---|
| Auth | login, logout, password change |
| Wallet | create, lock, unlock |
| Topup | created, success, failed |
| Transfer | created, success, failed |
| Payment | created, paid, failed, expired |
| Refund | created, success, failed |
| Merchant | approve, reject, suspend, api key rotate |
| Webhook | retry, success, failed |
| Setting | update |

---

## 19. Core schema additions

### 19.1. Withdrawal API

```http
POST /api/v1/withdrawals
Authorization: Bearer <access_token>
Idempotency-Key: <unique_key>
```

```json
{
  "linked_bank_id": "00000000-0000-0000-0000-000000000901",
  "amount": 500000,
  "description": "Rut tien ve ngan hang"
}
```

Backend tạo `withdrawal_transactions`, ledger WITHDRAWAL và debit ví trong cùng transaction. Không ghi `bank_code` hoặc `account_number` vào `withdrawal_transactions`; thông tin tài khoản lấy từ `wallet_linked_banks`.

### 19.2. Deferred core resources

`chat_messages`, `group_fundings` và `group_funding_members` đã có trong schema core nhưng chưa công bố endpoint trong API phase hiện tại.

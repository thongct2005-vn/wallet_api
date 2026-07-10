# API Design Chi tiết — Wallet Payment Gateway

> Phiên bản: 1.0 | Ngày: 08/06/2026  
> Áp dụng cho: Đề tài \\\*\\\*Xây dựng Ví điện tử và Cổng thanh toán\\\*\\\*  
> Ghi chú: Payload/response ưu tiên dùng `snake\\\_case` và bám theo `ewallet_core_db.sql`.
>
> PostgreSQL lưu dữ liệu nghiệp vụ; MongoDB lưu `audit_logs`, `system_logs`, `security_logs`, `webhook_attempt_logs`. Webhook event dùng `outbox_events`. Các bảng nghiệp vụ liên kết ledger qua `ledger_transactions.source_type + source_id`.

\---

## 1\. Conventions

### 1.1. Base URL

```http
/api/v1
```

### 1.2. Required headers

User/Admin protected API:

```http
Authorization: Bearer <access\\\_token>
Content-Type: application/json
```

Endpoint nhạy cảm có side effect:

```http
Authorization: Bearer <access\\\_token>
Content-Type: application/json
Idempotency-Key: <unique\\\_key>
```

Merchant Open API:

```http
X-API-Key: <merchant\\\_api\\\_key>
X-Timestamp: <timestamp>
X-Signature: <signature>
Content-Type: application/json
Idempotency-Key: <unique\\\_key>
```

### 1.3. Query convention

```http
filters
sorts
page
page\\\_size
include
fields
include\\\_inactive
```

Ví dụ:

```http
GET /api/v1/admin/payment-orders?filters=status==PAID\\\&sorts=-created\\\_at\\\&page=1\\\&page\\\_size=20
GET /api/v1/transactions/me?filters=transaction\\\_type==PAYMENT\\\&sorts=-created\\\_at\\\&page=1\\\&page\\\_size=20
GET /api/v1/admin/wallets/{id}?include=balance,ledger
```

### 1.4. Success response

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "trace\\\_id": "trace-001"
}
```

### 1.5. Paged response

```json
{
  "success": true,
  "message": "OK",
  "data": \\\[],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 100,
    "sorts": "-created\\\_at",
    "filters": "status==PAID"
  },
  "trace\\\_id": "trace-001"
}
```

### 1.6. Error response

```json
{
  "success": false,
  "message": "Validation error",
  "error\\\_code": "VALIDATION\\\_ERROR",
  "errors": \\\[
    {
      "field": "amount",
      "message": "amount must be greater than 0"
    }
  ],
  "trace\\\_id": "trace-001"
}
```

\---

# 2\. Auth API

## 2.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|POST|`/auth/register`|User đăng ký ví|
|POST|`/auth/login`|Đăng nhập|
|POST|`/auth/refresh-token`|Refresh token|
|POST|`/auth/logout`|Đăng xuất|
|POST|`/auth/forgot-password`|Quên mật khẩu|
|POST|`/auth/reset-password`|Đặt lại mật khẩu|
|POST|`/auth/change-password`|Đổi mật khẩu|
|POST|`/auth/revoke-token`|Revoke token|
|GET|`/auth/me`|User hiện tại|

\---

## 2.2. POST `/auth/register`

### Mô tả

User đăng ký tài khoản ví. Sau khi đăng ký thành công, hệ thống tạo ví mặc định và số dư ban đầu bằng 0.

### Auth

Public

### Request

```json
{
  "full\\\_name": "Nguyen Van An",
  "phone": "0900000001",
  "email": "an@example.com",
  "password": "Password@123",
  "confirm\\\_password": "Password@123"
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
      "username": "user\\\_an",
      "full\\\_name": "Nguyen Van An",
      "phone": "0900000001",
      "email": "an@example.com",
      "status": "ACTIVE"
    },
    "wallet": {
      "id": "00000000-0000-0000-0000-000000000201",
      "wallet\\\_no": "WAL000001",
      "status": "ACTIVE",
      "currency": "VND",
      "available\\\_balance": 0,
      "locked\\\_balance": 0
    }
  },
  "trace\\\_id": "trace-auth-register-001"
}
```

### Storage affected

```text
users
user\\\_roles
wallets
wallet\\\_balances
MongoDB audit\\\_logs
```

### Business rules

* Phone phải unique.
* Email nếu có phải unique.
* Password phải hash.
* Tạo user và tạo ví phải cùng transaction.
* Nếu tạo ví lỗi thì rollback user.
* User mới có role `USER`.

\---

## 2.3. POST `/auth/login`

### Request

```json
{
  "login\\\_id": "0900000001",
  "password": "Password@123"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Login success",
  "data": {
    "access\\\_token": "jwt-access-token",
    "refresh\\\_token": "refresh-token",
    "expires\\\_in": 3600,
    "user": {
      "id": "00000000-0000-0000-0000-000000000101",
      "username": "user\\\_an",
      "full\\\_name": "Nguyen Van An",
      "phone": "0900000001",
      "email": "an@example.com",
      "status": "ACTIVE",
      "roles": \\\["USER"],
      "permissions": \\\[
        "wallet.wallets.read",
        "wallet.topups.create",
        "wallet.transfers.create",
        "payment.qr-payments.confirm"
      ]
    }
  },
  "trace\\\_id": "trace-auth-login-001"
}
```

### Business rules

* `login\\\_id` hỗ trợ username/email/phone.
* Không thông báo rõ sai tài khoản hay sai mật khẩu.
* Sai quá số lần cấu hình thì khóa tạm.
* Login thành công tạo refresh token và reset failed attempts.

\---

## 2.4. POST `/auth/refresh-token`

### Request

```json
{
  "refresh\\\_token": "refresh-token"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "access\\\_token": "jwt-access-token-new",
    "refresh\\\_token": "refresh-token-new",
    "expires\\\_in": 3600
  },
  "trace\\\_id": "trace-auth-refresh-001"
}
```

### Business rules

* Dùng refresh token rotation.
* Refresh token cũ bị revoke sau khi dùng.
* Nếu phát hiện reuse token cũ, revoke token family.

\---

## 2.5. GET `/auth/me`

### Response `200`

```json
{
  "success": true,
  "message": "Current user",
  "data": {
    "id": "00000000-0000-0000-0000-000000000101",
    "username": "user\\\_an",
    "full\\\_name": "Nguyen Van An",
    "phone": "0900000001",
    "email": "an@example.com",
    "status": "ACTIVE",
    "roles": \\\[
      {
        "code": "USER",
        "name": "User"
      }
    ],
    "permissions": \\\[
      "wallet.wallets.read",
      "wallet.topups.create"
    ]
  },
  "trace\\\_id": "trace-auth-me-001"
}
```

\---

# 3\. Wallet API

## 3.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/wallets/me`|Xem ví của user hiện tại|
|GET|`/wallets/me/balance`|Xem số dư|
|GET|`/wallets/me/summary`|Tổng quan ví|
|GET|`/wallets/me/history`|Lịch sử biến động|
|GET|`/wallets/me/ledger`|Ledger ví|
|GET|`/admin/wallets`|Admin xem danh sách ví|
|GET|`/admin/wallets/{id}`|Chi tiết ví|
|POST|`/admin/wallets/{id}/actions/lock`|Khóa ví|
|POST|`/admin/wallets/{id}/actions/unlock`|Mở khóa ví|

\---

## 3.2. GET `/wallets/me`

### Response `200`

```json
{
  "success": true,
  "message": "Wallet detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000201",
    "wallet\\\_no": "WAL000001",
    "wallet\\\_type": "PERSONAL",
    "status": "ACTIVE",
    "currency": "VND",
    "available\\\_balance": 1680000,
    "locked\\\_balance": 0,
    "total\\\_balance": 1680000,
    "updated\\\_at": "2026-06-08T09:30:00Z"
  },
  "trace\\\_id": "trace-wallet-me-001"
}
```

### Business rules

* User chỉ xem ví của chính mình.
* Số dư lấy từ `wallet\\\_balances`.
* Không tính số dư ở client.

\---

## 3.3. GET `/wallets/me/history`

### Query

```http
GET /wallets/me/history?filters=transaction\\\_type==PAYMENT\\\&sorts=-created\\\_at\\\&page=1\\\&page\\\_size=20
```

### Response `200`

```json
{
  "success": true,
  "message": "Wallet history",
  "data": \\\[
    {
      "transaction\\\_id": "00000000-0000-0000-0000-000000000501",
      "transaction\\\_no": "PAY000001",
      "transaction\\\_type": "PAYMENT",
      "entry\\\_type": "DEBIT",
      "amount": 320000,
      "currency": "VND",
      "balance\\\_before": 2000000,
      "balance\\\_after": 1680000,
      "description": "Thanh toan Coffee Demo Merchant",
      "status": "SUCCESS",
      "created\\\_at": "2026-06-08T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1
  },
  "trace\\\_id": "trace-wallet-history-001"
}
```

\---

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
    "wallet\\\_no": "WAL000001",
    "status": "LOCKED",
    "locked\\\_at": "2026-06-08T10:00:00Z",
    "lock\\\_reason": "Suspected fraud transaction"
  },
  "trace\\\_id": "trace-wallet-lock-001"
}
```

### Business rules

* Chỉ Admin được khóa ví.
* Bắt buộc có `reason`.
* Khóa ví không làm thay đổi số dư.
* Ghi audit log.

\---

# 4\. Topup API

## 4.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|POST|`/topups`|User nạp tiền giả lập|
|GET|`/topups/me`|Lịch sử nạp của user|
|GET|`/topups/me/{id}`|Chi tiết nạp|
|GET|`/admin/topups`|Admin xem topup|
|GET|`/admin/topups/{id}`|Admin xem chi tiết topup|

\---

## 4.2. POST `/topups`

### Required headers

```http
Authorization: Bearer <access\\\_token>
Idempotency-Key: topup-user-001-amount-2000000
```

### Request

```json
{
  "amount": 2000000,
  "deposit\\\_method": "SANDBOX\\\_BANK",
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
    "deposit\\\_no": "DEP000001",
    "wallet\\\_id": "00000000-0000-0000-0000-000000000201",
    "amount": 2000000,
    "currency": "VND",
    "deposit\\\_method": "SANDBOX\\\_BANK",
    "status": "SUCCESS",
    "transaction\\\_no": "TXN000001",
    "wallet\\\_balance": {
      "available\\\_balance": 2000000,
      "locked\\\_balance": 0
    },
    "completed\\\_at": "2026-06-08T08:00:00Z"
  },
  "trace\\\_id": "trace-topup-create-001"
}
```

### Storage affected

```text
deposit\\\_transactions
ledger\\\_transactions
ledger\\\_entries
wallet\\\_balances
idempotency\\\_keys
MongoDB audit\\\_logs
```

### Transaction boundary

```text
BEGIN
- validate wallet ACTIVE
- validate amount and limits
- create deposit\\\_transaction PENDING
- create ledger\\\_transaction TOPUP
- create ledger\\\_entries
- update wallet\\\_balances
- update deposit\\\_transaction SUCCESS
- save idempotency response
COMMIT
```

### Business rules

* Ví phải ACTIVE.
* Amount > 0.
* Không vượt hạn mức.
* Request trùng `Idempotency-Key` không cộng tiền lần hai.
* Nếu ledger lỗi thì rollback toàn bộ.

\---

# 5\. Transfer API

## 5.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/transfers/receivers/lookup`|Tìm người nhận|
|POST|`/transfers`|Chuyển tiền|
|GET|`/transfers/me`|Lịch sử chuyển tiền|
|GET|`/transfers/me/{id}`|Chi tiết chuyển tiền|
|GET|`/admin/transfers`|Admin xem transfer|
|GET|`/admin/transfers/{id}`|Admin xem chi tiết transfer|

\---

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
    "receiver\\\_user\\\_id": "00000000-0000-0000-0000-000000000102",
    "receiver\\\_name": "Tran Thi Binh",
    "receiver\\\_phone\\\_masked": "090\\\*\\\*\\\*0002",
    "wallet\\\_id": "00000000-0000-0000-0000-000000000202",
    "wallet\\\_no\\\_masked": "WAL\\\*\\\*\\\*002",
    "wallet\\\_status": "ACTIVE"
  },
  "trace\\\_id": "trace-transfer-lookup-001"
}
```

### Business rules

* Không trả full thông tin nhạy cảm.
* Không cho chuyển cho chính mình.
* Ví nhận phải ACTIVE.

\---

## 5.3. POST `/transfers`

### Required headers

```http
Authorization: Bearer <access\\\_token>
Idempotency-Key: transfer-user-an-to-binh-150000
```

### Request

```json
{
  "receiver\\\_identifier": "0900000002",
  "amount": 150000,
  "description": "Chuyen tien an trua",
  "pin\\\_or\\\_otp": "123456"
}
```

### Response `201`

```json
{
  "success": true,
  "message": "Transfer success",
  "data": {
    "id": "00000000-0000-0000-0000-000000000601",
    "transfer\\\_no": "TRF000001",
    "sender\\\_wallet\\\_id": "00000000-0000-0000-0000-000000000201",
    "receiver\\\_wallet\\\_id": "00000000-0000-0000-0000-000000000202",
    "amount": 150000,
    "currency": "VND",
    "description": "Chuyen tien an trua",
    "status": "SUCCESS",
    "transaction\\\_no": "TXN000002",
    "sender\\\_balance": {
      "available\\\_balance": 1850000
    },
    "completed\\\_at": "2026-06-08T08:10:00Z"
  },
  "trace\\\_id": "trace-transfer-create-001"
}
```

### Storage affected

```text
wallet\\\_transfers
wallet\\\_balances
ledger\\\_transactions
ledger\\\_entries
idempotency\\\_keys
MongoDB audit\\\_logs
```

### Transaction boundary

```text
BEGIN
- validate sender wallet ACTIVE
- validate receiver wallet ACTIVE
- lock sender wallet\\\_balance
- lock receiver wallet\\\_balance
- validate available\\\_balance >= amount
- create wallet\\\_transfer PENDING
- create ledger\\\_transaction TRANSFER
- create ledger entry DEBIT sender
- create ledger entry CREDIT receiver
- update both balances
- update transfer SUCCESS
COMMIT
```

### Business rules

* Không chuyển cho chính mình.
* Ví gửi và ví nhận phải ACTIVE.
* Số dư khả dụng phải đủ.
* Tổng debit = tổng credit.
* Idempotency chống trừ tiền hai lần.

\---

# 6\. Transaction \& Ledger API

## 6.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/transactions/me`|User xem lịch sử giao dịch|
|GET|`/transactions/me/{id}`|User xem chi tiết giao dịch|
|GET|`/admin/transactions`|Admin xem toàn bộ transaction|
|GET|`/admin/transactions/{id}`|Admin xem chi tiết|
|GET|`/admin/ledger-entries`|Admin tra cứu ledger entries|
|POST|`/admin/transactions/reconcile`|Đối soát ledger|

\---

## 6.2. GET `/transactions/me`

### Query

```http
GET /transactions/me?filters=transaction\\\_type==PAYMENT;status==SUCCESS\\\&sorts=-created\\\_at\\\&page=1\\\&page\\\_size=20
```

### Response `200`

```json
{
  "success": true,
  "message": "Transactions",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000000403",
      "transaction\\\_no": "TXN000003",
      "transaction\\\_type": "PAYMENT",
      "status": "SUCCESS",
      "amount": 320000,
      "currency": "VND",
      "source\\\_type": "PAYMENT\\\_ORDER",
      "description": "Thanh toan Coffee Demo Merchant",
      "created\\\_at": "2026-06-08T09:00:00Z",
      "completed\\\_at": "2026-06-08T09:00:03Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1
  },
  "trace\\\_id": "trace-transactions-me-001"
}
```

\---

## 6.3. GET `/admin/transactions/{id}`

### Response `200`

```json
{
  "success": true,
  "message": "Transaction detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000403",
    "transaction\\\_no": "TXN000003",
    "transaction\\\_type": "PAYMENT",
    "status": "SUCCESS",
    "amount": 320000,
    "currency": "VND",
    "source\\\_type": "PAYMENT\\\_ORDER",
    "source\\\_id": "00000000-0000-0000-0000-000000000701",
    "entries": \\\[
      {
        "entry\\\_type": "DEBIT",
        "account\\\_type": "USER\\\_WALLET",
        "wallet\\\_id": "00000000-0000-0000-0000-000000000201",
        "amount": 320000,
        "balance\\\_before": 2000000,
        "balance\\\_after": 1680000
      },
      {
        "entry\\\_type": "CREDIT",
        "account\\\_type": "MERCHANT\\\_BALANCE",
        "merchant\\\_id": "00000000-0000-0000-0000-000000000801",
        "amount": 320000,
        "balance\\\_before": 0,
        "balance\\\_after": 320000
      }
    ]
  },
  "trace\\\_id": "trace-transaction-detail-001"
}
```

\---

# 7\. Merchant API

## 7.1. Merchant Portal Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|POST|`/merchants/register`|Merchant đăng ký|
|GET|`/merchant/profile`|Xem profile|
|PATCH|`/merchant/profile`|Cập nhật profile|
|GET|`/merchant/api-keys`|Danh sách API key|
|POST|`/merchant/api-keys`|Tạo API key|
|POST|`/merchant/api-keys/{id}/actions/rotate`|Rotate secret|
|POST|`/merchant/api-keys/{id}/actions/revoke`|Revoke API key|
|GET|`/merchant/callback-config`|Xem callback config|
|PATCH|`/merchant/callback-config`|Cập nhật callback config|

\---

## 7.2. POST `/merchants/register`

### Request

```json
{
  "merchant\\\_name": "Coffee Demo Merchant",
  "business\\\_type": "OFFLINE",
  "representative\\\_name": "Pham Van Coffee",
  "phone": "0900000101",
  "email": "coffee@example.com",
  "address": "123 Coffee Street, HCM",
  "owner\\\_username": "merchant\\\_one\\\_owner",
  "owner\\\_password": "Password@123"
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
      "merchant\\\_code": "MER000001",
      "merchant\\\_name": "Coffee Demo Merchant",
      "status": "PENDING\\\_REVIEW"
    },
    "owner\\\_user": {
      "id": "00000000-0000-0000-0000-000000000151",
      "username": "merchant\\\_one\\\_owner",
      "roles": \\\["MERCHANT\\\_OWNER"]
    }
  },
  "trace\\\_id": "trace-merchant-register-001"
}
```

\---

## 7.3. POST `/merchant/api-keys`

### Request

```json
{
  "key\\\_name": "Default Sandbox Key",
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
    "merchant\\\_id": "00000000-0000-0000-0000-000000000801",
    "key\\\_name": "Default Sandbox Key",
    "api\\\_key": "pk\\\_sandbox\\\_coffee\\\_demo",
    "api\\\_secret": "sk\\\_sandbox\\\_show\\\_once\\\_only",
    "environment": "SANDBOX",
    "status": "ACTIVE",
    "created\\\_at": "2026-06-08T07:00:00Z"
  },
  "trace\\\_id": "trace-api-key-create-001"
}
```

### Business rules

* `api\\\_secret` chỉ trả về một lần.
* DB chỉ lưu hash/encrypted secret.
* Tạo API key phải ghi audit.

\---

# 8\. Payment Gateway API

## 8.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|POST|`/merchant/payments`|Merchant tạo payment|
|GET|`/merchant/payments/{id}`|Query payment theo ID|
|GET|`/merchant/payments/by-order/{merchant\\\_order\\\_id}`|Query theo mã đơn|
|POST|`/merchant/payments/{id}/actions/cancel`|Hủy payment|
|GET|`/merchant/payment-orders`|Merchant portal xem payment|
|GET|`/admin/payment-orders`|Admin xem payment|
|GET|`/admin/payment-orders/{id}`|Admin chi tiết payment|

\---

## 8.2. POST `/merchant/payments`

### Auth

Merchant API Key + Signature

### Required headers

```http
X-API-Key: pk\\\_sandbox\\\_coffee\\\_demo
X-Timestamp: 2026-06-08T09:00:00Z
X-Signature: hmac-signature
Content-Type: application/json
Idempotency-Key: merchant-order-ORDER-COFFEE-001
```

### Request

```json
{
  "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
  "amount": 320000,
  "currency": "VND",
  "description": "Thanh toan don hang Coffee #001",
  "callback\\\_url": "https://merchant.example.com/webhooks/payment",
  "redirect\\\_url": "https://merchant.example.com/orders/ORDER-COFFEE-001",
  "expired\\\_at": "2026-06-08T09:15:00Z",
  "metadata": {
    "table\\\_no": "A01",
    "customer\\\_note": "no sugar"
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
    "payment\\\_no": "PAY000001",
    "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
    "merchant\\\_id": "00000000-0000-0000-0000-000000000801",
    "amount": 320000,
    "currency": "VND",
    "status": "PENDING",
    "payment\\\_url": "https://wallet-demo.local/pay/qr\\\_000001",
    "qr": {
      "id": "00000000-0000-0000-0000-000000000711",
      "qr\\\_token": "qr\\\_000001",
      "qr\\\_payload": "https://wallet-demo.local/pay/qr\\\_000001",
      "status": "ACTIVE",
      "expired\\\_at": "2026-06-08T09:15:00Z"
    },
    "expired\\\_at": "2026-06-08T09:15:00Z",
    "created\\\_at": "2026-06-08T09:00:00Z"
  },
  "trace\\\_id": "trace-payment-create-001"
}
```

### Storage affected

```text
payment\\\_orders
payment\\\_qr\\\_codes
idempotency\\\_keys
MongoDB audit\\\_logs
```

### Business rules

* Merchant phải ACTIVE.
* API key phải ACTIVE.
* Signature hợp lệ.
* `merchant\\\_order\\\_id` unique theo merchant.
* Amount > 0.
* Payment mới có status `PENDING`.
* Tạo payment phải sinh QR.
* Request trùng idempotency key trả lại response cũ.

\---

## 8.3. GET `/merchant/payments/{id}`

### Response `200`

```json
{
  "success": true,
  "message": "Payment detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
    "amount": 320000,
    "currency": "VND",
    "status": "PAID",
    "paid\\\_at": "2026-06-08T09:03:00Z",
    "refund\\\_status": "PARTIALLY\\\_REFUNDED",
    "refunded\\\_amount": 100000,
    "transaction": {
      "transaction\\\_no": "TXN000003",
      "status": "SUCCESS"
    },
    "callback\\\_status": "SUCCESS"
  },
  "trace\\\_id": "trace-payment-query-001"
}
```

\---

# 9\. QR Payment API

## 9.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/qr-payments/{qr\\\_token}`|Resolve QR|
|POST|`/qr-payments/{qr\\\_token}/confirm`|Xác nhận thanh toán|
|POST|`/qr-payments/{qr\\\_token}/cancel`|User hủy thao tác|
|GET|`/admin/qr-payments`|Admin xem QR|
|GET|`/admin/qr-payments/{id}`|Admin chi tiết QR|

\---

## 9.2. GET `/qr-payments/{qr\\\_token}`

### Response `200`

```json
{
  "success": true,
  "message": "Payment information",
  "data": {
    "qr\\\_token": "qr\\\_000001",
    "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "merchant": {
      "id": "00000000-0000-0000-0000-000000000801",
      "merchant\\\_code": "MER000001",
      "merchant\\\_name": "Coffee Demo Merchant",
      "logo\\\_url": null
    },
    "amount": 320000,
    "currency": "VND",
    "description": "Thanh toan don hang Coffee #001",
    "status": "PENDING",
    "expired\\\_at": "2026-06-08T09:15:00Z",
    "payer\\\_wallet": {
      "wallet\\\_no": "WAL000001",
      "available\\\_balance": 2000000,
      "currency": "VND"
    }
  },
  "trace\\\_id": "trace-qr-resolve-001"
}
```

### Business rules

* QR phải ACTIVE.
* Payment phải PENDING.
* Payment chưa hết hạn.
* Amount lấy từ DB.

\---

## 9.3. POST `/qr-payments/{qr\\\_token}/confirm`

### Required headers

```http
Authorization: Bearer <access\\\_token>
Idempotency-Key: pay-qr-000001-user-an
```

### Request

```json
{
  "pin\\\_or\\\_otp": "123456",
  "note": "Thanh toan bang vi"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "Payment success",
  "data": {
    "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
    "amount": 320000,
    "currency": "VND",
    "status": "PAID",
    "payment\\\_transaction": {
      "id": "00000000-0000-0000-0000-000000000721",
      "status": "SUCCESS",
      "paid\\\_at": "2026-06-08T09:03:00Z"
    },
    "ledger\\\_transaction": {
      "id": "00000000-0000-0000-0000-000000000403",
      "transaction\\\_no": "TXN000003"
    },
    "wallet\\\_balance": {
      "available\\\_balance": 1680000,
      "locked\\\_balance": 0
    },
    "callback": {
      "event\\\_id": "CBK000001",
      "status": "PENDING"
    }
  },
  "trace\\\_id": "trace-qr-confirm-001"
}
```

### Storage affected

```text
payment\\\_orders
payment\\\_qr\\\_codes
payment\\\_transactions
wallet\\\_balances
merchant\\\_balances
ledger\\\_transactions
ledger\\\_entries
outbox\\\_events
idempotency\\\_keys
MongoDB audit\\\_logs
MongoDB system\\\_logs
MongoDB webhook\\\_attempt\\\_logs
```

### Transaction boundary

```text
BEGIN
- validate QR ACTIVE
- validate payment PENDING and not expired
- lock payment\\\_order
- lock payer wallet\\\_balance
- validate wallet ACTIVE
- validate available\\\_balance >= amount
- create payment\\\_transaction PENDING
- create ledger\\\_transaction PAYMENT
- create DEBIT user wallet entry
- create CREDIT merchant balance entry
- update wallet\\\_balance
- update merchant\\\_balance
- update payment\\\_transaction SUCCESS
- update payment\\\_order PAID
- update QR USED
- create callback PENDING
- save idempotency response
COMMIT
```

### Business rules

* Một payment chỉ có tối đa một `SUCCESS`.
* Nếu request retry cùng idempotency key thì không trừ tiền lần hai.
* Callback lỗi không rollback payment.
* Nếu số dư không đủ, trả `INSUFFICIENT\\\_BALANCE`.

\---

# 10\. Webhook API

## 10.1. Merchant nhận callback

### Endpoint merchant tự triển khai

```http
POST https://merchant.example.com/webhooks/payment
```

### Headers hệ thống gửi

```http
X-Webhook-Id: CBK000001
X-Webhook-Event: PAYMENT\\\_SUCCESS
X-Timestamp: 2026-06-08T09:03:05Z
X-Signature: hmac-signature
X-Retry-Count: 0
```

### Payload

```json
{
  "event\\\_id": "CBK000001",
  "event\\\_type": "PAYMENT\\\_SUCCESS",
  "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
  "payment\\\_no": "PAY000001",
  "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
  "amount": 320000,
  "currency": "VND",
  "status": "PAID",
  "transaction\\\_no": "TXN000003",
  "paid\\\_at": "2026-06-08T09:03:00Z",
  "timestamp": "2026-06-08T09:03:05Z",
  "metadata": {
    "table\\\_no": "A01"
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

\---

## 10.2. Webhook management endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/merchant/webhooks`|Merchant xem webhook|
|GET|`/merchant/webhooks/{id}`|Chi tiết webhook|
|POST|`/merchant/webhooks/{id}/actions/retry`|Merchant retry webhook|
|GET|`/admin/webhooks`|Admin xem callback|
|GET|`/admin/webhooks/{id}`|Admin chi tiết callback|
|POST|`/admin/webhooks/{id}/actions/retry`|Admin retry|
|POST|`/admin/webhooks/jobs/retry-due`|Chạy retry due job|

\---

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
    "event\\\_id": "CBK000001",
    "status": "RETRYING",
    "retry\\\_count": 2,
    "next\\\_retry\\\_at": "2026-06-08T10:05:00Z"
  },
  "trace\\\_id": "trace-webhook-retry-001"
}
```

### Business rules

* Retry không tạo payment/refund mới.
* Retry phải ghi audit.
* Chỉ retry callback FAILED/RETRYING.
* Callback success không cần retry.

\---

# 11\. Refund API

## 11.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|POST|`/merchant/refunds`|Merchant tạo refund|
|GET|`/merchant/refunds`|Merchant xem refund|
|GET|`/merchant/refunds/{id}`|Merchant chi tiết refund|
|GET|`/refunds/me`|User xem refund của mình|
|GET|`/admin/refunds`|Admin xem refund|
|GET|`/admin/refunds/{id}`|Admin chi tiết refund|
|POST|`/admin/refunds`|Admin tạo refund|

\---

## 11.2. POST `/merchant/refunds`

### Required headers

```http
Authorization: Bearer <merchant\\\_access\\\_token>
Idempotency-Key: refund-order-coffee-001-100000
```

### Request

```json
{
  "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
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
    "refund\\\_no": "RFD000001",
    "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "amount": 100000,
    "currency": "VND",
    "description": "Khach huy mot phan don hang",
    "status": "SUCCESS",
    "ledger\\\_transaction": {
      "id": "00000000-0000-0000-0000-000000000404",
      "transaction\\\_no": "TXN000004"
    },
    "refunded\\\_at": "2026-06-08T09:30:00Z"
  },
  "trace\\\_id": "trace-refund-create-001"
}
```

### Storage affected

```text
refund\\\_transactions
payment\\\_orders
wallet\\\_balances
merchant\\\_balances
ledger\\\_transactions
ledger\\\_entries
outbox\\\_events
idempotency\\\_keys
MongoDB audit\\\_logs
MongoDB webhook\\\_attempt\\\_logs
```

### Transaction boundary

```text
BEGIN
- validate payment PAID
- validate merchant owns payment
- calculate refundable\\\_amount
- validate amount <= refundable\\\_amount
- lock merchant\\\_balance
- lock user wallet\\\_balance
- create refund\\\_transaction PENDING
- create ledger\\\_transaction REFUND
- DEBIT merchant balance
- CREDIT user wallet
- update balances
- update refund SUCCESS
- update payment\\\_orders.refunded\\\_amount/refund\\\_status
- create webhook REFUND\\\_SUCCESS
COMMIT
```

### Business rules

* Chỉ payment PAID mới refund được.
* Không refund vượt số tiền còn lại.
* Refund thành công phải ghi ledger.
* Request trùng không hoàn tiền lần hai.
* Refund success không cho sửa/xóa.

\---

# 12\. Admin APIs

## 12.1. Users

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/users`|Danh sách user|
|POST|`/admin/users`|Tạo người dùng ví (kèm ví, trả mật khẩu tạm 6 số, ép đổi MK)|
|POST|`/admin/staffs`|Tạo nhân viên (kèm RBAC role, trả mật khẩu tạm 6 số, ép đổi MK)|
|GET|`/admin/users/{id}`|Chi tiết user|
|PATCH|`/admin/users/{id}`|Cập nhật user|
|POST|`/admin/users/{id}/actions/lock`|Khóa user|
|POST|`/admin/users/{id}/actions/unlock`|Mở khóa user|
|POST|`/admin/users/{id}/actions/reset-password`|Reset password (trả mật khẩu tạm 6 số, ép đổi MK)|

## 12.2. Merchants

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/merchants`|Danh sách merchant|
|POST|`/admin/merchants`|Tạo merchant (kèm owner, webhook)|
|GET|`/admin/merchants/{id}`|Chi tiết merchant|
|POST|`/admin/merchants/{id}/actions/approve`|Duyệt merchant|
|POST|`/admin/merchants/{id}/actions/reject`|Từ chối|
|POST|`/admin/merchants/{id}/actions/suspend`|Tạm ngưng|
|POST|`/admin/merchants/{id}/actions/activate`|Kích hoạt lại|

## 12.3. Payment flow detail

### GET `/admin/payment-orders/{id}/timeline`

Response `200`:

```json
{
  "success": true,
  "message": "Payment timeline",
  "data": {
    "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "events": \\\[
      {
        "time": "2026-06-08T09:00:00Z",
        "type": "PAYMENT\\\_CREATED",
        "description": "Merchant created payment"
      },
      {
        "time": "2026-06-08T09:00:01Z",
        "type": "QR\\\_CREATED",
        "description": "QR created"
      },
      {
        "time": "2026-06-08T09:03:00Z",
        "type": "PAYMENT\\\_SUCCESS",
        "description": "User paid successfully"
      },
      {
        "time": "2026-06-08T09:03:05Z",
        "type": "WEBHOOK\\\_SENT",
        "description": "Webhook sent to merchant"
      }
    ]
  },
  "trace\\\_id": "trace-payment-timeline-001"
}
```

\---

# 13\. Dashboard API

## 13.1. Admin Dashboard

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/dashboard/kpis`|KPI tổng quan|
|GET|`/admin/dashboard/transactions-chart`|Biểu đồ giao dịch|
|GET|`/admin/dashboard/success-rate`|Tỷ lệ thành công|
|GET|`/admin/dashboard/top-merchants`|Top merchant|
|GET|`/admin/dashboard/recent-activities`|Hoạt động gần đây|
|GET|`/admin/dashboard/alerts`|Cảnh báo|

### GET `/admin/dashboard/kpis`

Response `200`:

```json
{
  "success": true,
  "message": "Dashboard KPIs",
  "data": {
    "total\\\_users": 3,
    "active\\\_wallets": 2,
    "total\\\_merchants": 3,
    "payment\\\_success\\\_count": 2,
    "payment\\\_success\\\_amount": 1020000,
    "transfer\\\_success\\\_count": 2,
    "transfer\\\_success\\\_amount": 200000,
    "topup\\\_success\\\_amount": 3000000,
    "refund\\\_success\\\_amount": 100000,
    "callback\\\_failed\\\_count": 1
  },
  "trace\\\_id": "trace-dashboard-kpis-001"
}
```

## 13.2. Merchant Dashboard

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/merchant/dashboard/kpis`|KPI merchant|
|GET|`/merchant/dashboard/chart`|Biểu đồ merchant|
|GET|`/merchant/dashboard/recent-activities`|Hoạt động merchant|

\---

# 14\. Reports API

## 14.1. Admin Reports

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/reports/wallet-transactions`|Báo cáo giao dịch ví|
|GET|`/admin/reports/topups`|Báo cáo topup|
|GET|`/admin/reports/transfers`|Báo cáo transfer|
|GET|`/admin/reports/payments`|Báo cáo payment|
|GET|`/admin/reports/refunds`|Báo cáo refund|
|GET|`/admin/reports/merchants`|Báo cáo merchant|
|GET|`/admin/reports/webhooks`|Báo cáo webhook|
|POST|`/admin/reports/ledger-reconciliation`|Đối soát ledger|
|POST|`/admin/reports/{report\\\_code}/export`|Export report|

### GET `/admin/reports/payments`

Query:

```http
GET /admin/reports/payments?from\\\_date=2026-06-01\\\&to\\\_date=2026-06-08\\\&status=PAID\\\&page=1\\\&page\\\_size=20
```

Response `200`:

```json
{
  "success": true,
  "message": "Payment report",
  "data": \\\[
    {
      "payment\\\_no": "PAY000001",
      "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
      "merchant\\\_name": "Coffee Demo Merchant",
      "amount": 320000,
      "currency": "VND",
      "status": "PAID",
      "paid\\\_at": "2026-06-08T09:03:00Z",
      "callback\\\_status": "SUCCESS"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1,
    "summary": {
      "total\\\_paid\\\_amount": 320000,
      "paid\\\_count": 1
    }
  },
  "trace\\\_id": "trace-report-payments-001"
}
```

\---

# 15\. Settings API

## 15.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/settings`|Xem toàn bộ setting|
|GET|`/admin/settings/{group}`|Xem theo group|
|PATCH|`/admin/settings/{group}`|Cập nhật setting|
|GET|`/admin/settings/history`|Lịch sử thay đổi|
|POST|`/admin/settings/{group}/actions/reset-default`|Reset default|

## 15.2. PATCH `/admin/settings/payment`

Request:

```json
{
  "payment\\\_enabled": true,
  "min\\\_payment\\\_amount": 1000,
  "max\\\_payment\\\_amount": 50000000,
  "payment\\\_expiry\\\_minutes": 15,
  "require\\\_merchant\\\_signature": true,
  "signature\\\_timestamp\\\_tolerance\\\_minutes": 5,
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
    "updated\\\_keys": \\\[
      "payment\\\_enabled",
      "max\\\_payment\\\_amount",
      "payment\\\_expiry\\\_minutes"
    ]
  },
  "trace\\\_id": "trace-settings-payment-update-001"
}
```

\---

# 16\. Audit/System Log API

## 16.1. Endpoints

|Method|Endpoint|Mô tả|
|-|-|-|
|GET|`/admin/audit-logs`|Danh sách audit log|
|GET|`/admin/audit-logs/{id}`|Chi tiết audit|
|GET|`/admin/system-logs`|Danh sách system log|
|GET|`/admin/system-logs/{id}`|Chi tiết system log|
|GET|`/admin/security-logs`|Security logs|
|GET|`/admin/traces/{trace\\\_id}`|Trace theo trace\_id|
|GET|`/admin/traces/payment/{payment\\\_no}`|Trace payment|
|POST|`/admin/logs/export`|Export log|

## 16.2. GET `/admin/audit-logs`

Response `200`:

```json
{
  "success": true,
  "message": "Audit logs",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000001001",
      "trace\\\_id": "trace-payment-create-001",
      "actor\\\_type": "MERCHANT",
      "actor\\\_id": "00000000-0000-0000-0000-000000000801",
      "action": "PAYMENT\\\_CREATED",
      "entity\\\_type": "payment\\\_orders",
      "entity\\\_id": "00000000-0000-0000-0000-000000000701",
      "metadata": {
        "payment\\\_no": "PAY000001"
      },
      "ip\\\_address": "127.0.0.1",
      "created\\\_at": "2026-06-08T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1
  },
  "trace\\\_id": "trace-audit-list-001"
}
```

\---

# 17\. Platform API

## 17.1. GET `/health`

Response `200`:

```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "UP",
    "server\\\_time": "2026-06-08T10:00:00Z",
    "database": "UP"
  },
  "trace\\\_id": "trace-health-001"
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
  "trace\\\_id": "trace-status-001"
}
```

\---



# 18\. Endpoint bổ sung để đồng bộ API Overview

> Mục này bổ sung các endpoint đã có trong `API\\\_DESIGN\\\_OVERVIEW\\\_WALLET\\\_PAYMENT.md` nhưng chưa được mô tả đủ trong bản API Detail. Các endpoint dưới đây bám theo cùng convention: `snake\\\_case`, response envelope, phân quyền theo role/permission và pagination cho list API.

\---

## 18.1. Identity \& Access — Roles/Permissions

### Endpoints

|Method|Endpoint|Mô tả|Auth|
|-|-|-|-|
|GET|`/admin/roles`|Admin xem danh sách role|Admin|
|POST|`/admin/roles`|Super Admin tạo role|Super Admin|
|GET|`/admin/roles/{id}`|Xem chi tiết role|Admin|
|PATCH|`/admin/roles/{id}`|Cập nhật role|Super Admin|
|GET|`/admin/permissions`|Xem danh sách permission|Admin|

\---

### GET `/admin/roles`

#### Query

```http
GET /admin/roles?filters=scope==SYSTEM;is\\\_active==true\\\&sorts=code\\\&page=1\\\&page\\\_size=20
```

#### Response `200`

```json
{
  "success": true,
  "message": "Roles",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000000011",
      "code": "ADMIN",
      "name": "Admin",
      "scope": "SYSTEM",
      "description": "Quan tri he thong",
      "is\\\_system": true,
      "is\\\_active": true,
      "created\\\_at": "2026-06-08T07:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1
  },
  "trace\\\_id": "trace-admin-roles-list-001"
}
```

#### Business rules

* Admin/Super Admin được xem danh sách role.
* Role hệ thống `is\\\_system = true` không được xóa vật lý.
* Danh sách hỗ trợ filter theo `scope`, `is\\\_active`, `code`.

\---

### POST `/admin/roles`

#### Request

```json
{
  "code": "FINANCE\\\_ADMIN",
  "name": "Finance Admin",
  "scope": "SYSTEM",
  "description": "Quan ly doi soat va bao cao",
  "permission\\\_codes": \\\[
    "reports.payments.read",
    "reports.ledger.reconcile"
  ]
}
```

#### Response `201`

```json
{
  "success": true,
  "message": "Role created",
  "data": {
    "id": "00000000-0000-0000-0000-000000000012",
    "code": "FINANCE\\\_ADMIN",
    "name": "Finance Admin",
    "scope": "SYSTEM",
    "is\\\_active": true,
    "permission\\\_codes": \\\[
      "reports.payments.read",
      "reports.ledger.reconcile"
    ]
  },
  "trace\\\_id": "trace-admin-role-create-001"
}
```

#### Storage affected

```text
roles
role\\\_permissions
MongoDB audit\\\_logs
```

#### Business rules

* Chỉ Super Admin được tạo role.
* `code` phải unique.
* `permission\\\_codes` phải tồn tại trong `permissions`.
* Tạo/cập nhật role phải ghi audit log.

\---

### GET `/admin/roles/{id}`

#### Response `200`

```json
{
  "success": true,
  "message": "Role detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000011",
    "code": "ADMIN",
    "name": "Admin",
    "scope": "SYSTEM",
    "description": "Quan tri he thong",
    "is\\\_system": true,
    "is\\\_active": true,
    "permissions": \\\[
      {
        "code": "admin.users.manage",
        "name": "Manage users"
      }
    ]
  },
  "trace\\\_id": "trace-admin-role-detail-001"
}
```

\---

### PATCH `/admin/roles/{id}`

#### Request

```json
{
  "name": "Finance Admin Updated",
  "description": "Quan ly bao cao, doi soat va refund",
  "is\\\_active": true,
  "permission\\\_codes": \\\[
    "reports.payments.read",
    "reports.ledger.reconcile",
    "payment.refunds.create"
  ],
  "reason": "Update finance role permissions"
}
```

#### Response `200`

```json
{
  "success": true,
  "message": "Role updated",
  "data": {
    "id": "00000000-0000-0000-0000-000000000012",
    "code": "FINANCE\\\_ADMIN",
    "name": "Finance Admin Updated",
    "is\\\_active": true,
    "permission\\\_codes": \\\[
      "reports.payments.read",
      "reports.ledger.reconcile",
      "payment.refunds.create"
    ]
  },
  "trace\\\_id": "trace-admin-role-update-001"
}
```

#### Business rules

* Chỉ Super Admin được cập nhật role.
* Không cho sửa `code` của role hệ thống nếu `is\\\_system = true`.
* Cập nhật permission phải thay đổi `role\\\_permissions` trong transaction.
* Phải ghi audit log.

\---

### GET `/admin/permissions`

#### Query

```http
GET /admin/permissions?filters=code@=\\\*payment\\\*\\\&sorts=code\\\&page=1\\\&page\\\_size=50
```

#### Response `200`

```json
{
  "success": true,
  "message": "Permissions",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000000021",
      "code": "payment.payment-orders.read",
      "name": "Read payment orders",
      "description": "Xem payment order"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 50,
    "total": 1
  },
  "trace\\\_id": "trace-admin-permissions-list-001"
}
```

#### Business rules

* Permission là danh mục hệ thống, thường được seed sẵn.
* Admin được xem, Super Admin quản lý nếu hệ thống cho phép.
* Không hard-code permission rải rác trong controller.

\---

## 18.2. Admin Wallet — Summary/Ledger

### Endpoints

|Method|Endpoint|Mô tả|Auth|
|-|-|-|-|
|GET|`/admin/wallets/{id}/summary`|Admin xem tổng quan ví|Admin|
|GET|`/admin/wallets/{id}/ledger`|Admin xem ledger của ví|Admin|

\---

### GET `/admin/wallets/{id}/summary`

#### Response `200`

```json
{
  "success": true,
  "message": "Wallet summary",
  "data": {
    "wallet": {
      "id": "00000000-0000-0000-0000-000000000201",
      "wallet\\\_no": "WAL000001",
      "status": "ACTIVE",
      "currency": "VND"
    },
    "owner": {
      "id": "00000000-0000-0000-0000-000000000101",
      "full\\\_name": "Nguyen Van An",
      "phone": "090\\\*\\\*\\\*0001",
      "email": "an@example.com"
    },
    "balance": {
      "available\\\_balance": 1680000,
      "locked\\\_balance": 0,
      "total\\\_balance": 1680000,
      "updated\\\_at": "2026-06-08T09:30:00Z"
    },
    "stats": {
      "topup\\\_success\\\_amount": 2000000,
      "transfer\\\_sent\\\_amount": 150000,
      "transfer\\\_received\\\_amount": 0,
      "payment\\\_amount": 320000,
      "refund\\\_amount": 100000
    }
  },
  "trace\\\_id": "trace-admin-wallet-summary-001"
}
```

#### Business rules

* Admin xem được ví toàn hệ thống.
* Không cho sửa số dư từ endpoint này.
* Dữ liệu số dư lấy từ `wallet\\\_balances`.
* Số liệu biến động lấy từ ledger, không tính ở client.

\---

### GET `/admin/wallets/{id}/ledger`

#### Query

```http
GET /admin/wallets/{id}/ledger?filters=transaction\\\_type==PAYMENT\\\&sorts=-created\\\_at\\\&page=1\\\&page\\\_size=20
```

#### Response `200`

```json
{
  "success": true,
  "message": "Wallet ledger",
  "data": \\\[
    {
      "ledger\\\_entry\\\_id": "00000000-0000-0000-0000-000000000411",
      "transaction\\\_id": "00000000-0000-0000-0000-000000000403",
      "transaction\\\_no": "TXN000003",
      "transaction\\\_type": "PAYMENT",
      "entry\\\_type": "DEBIT",
      "amount": 320000,
      "balance\\\_before": 2000000,
      "balance\\\_after": 1680000,
      "status": "SUCCESS",
      "created\\\_at": "2026-06-08T09:03:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1
  },
  "trace\\\_id": "trace-admin-wallet-ledger-001"
}
```

#### Business rules

* Ledger entries là dữ liệu append-only.
* Admin không được cập nhật/xóa ledger entry.
* Có thể filter theo loại giao dịch, chiều tiền, thời gian, trạng thái.

\---

## 18.3. Admin Merchant — API Keys

### GET `/admin/merchants/{id}/api-keys`

#### Response `200`

```json
{
  "success": true,
  "message": "Merchant API keys",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000000901",
      "merchant\\\_id": "00000000-0000-0000-0000-000000000801",
      "key\\\_name": "Default Sandbox Key",
      "api\\\_key": "pk\\\_sandbox\\\_coffee\\\_demo",
      "environment": "SANDBOX",
      "status": "ACTIVE",
      "last\\\_used\\\_at": "2026-06-08T09:00:00Z",
      "expired\\\_at": null,
      "created\\\_at": "2026-06-08T07:00:00Z",
      "revoked\\\_at": null
    }
  ],
  "trace\\\_id": "trace-admin-merchant-api-keys-001"
}
```

#### Business rules

* Admin xem được API keys của merchant.
* Không trả `api\\\_secret` hoặc `api\\\_secret\\\_hash`.
* API secret chỉ hiển thị một lần khi tạo mới ở endpoint merchant/admin create key.
* Merchant SUSPENDED thì API key không được dùng để tạo payment mới.

\---

## 18.4. Merchant Portal Payment Detail

### GET `/merchant/payment-orders/{id}`

#### Response `200`

```json
{
  "success": true,
  "message": "Merchant payment order detail",
  "data": {
    "id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
    "amount": 320000,
    "currency": "VND",
    "description": "Thanh toan don hang Coffee #001",
    "status": "PAID",
    "refund\\\_status": "PARTIALLY\\\_REFUNDED",
    "refunded\\\_amount": 100000,
    "callback\\\_status": "SUCCESS",
    "created\\\_at": "2026-06-08T09:00:00Z",
    "paid\\\_at": "2026-06-08T09:03:00Z",
    "expired\\\_at": "2026-06-08T09:15:00Z",
    "qr": {
      "qr\\\_token": "qr\\\_000001",
      "status": "USED",
      "used\\\_at": "2026-06-08T09:03:00Z"
    },
    "transaction": {
      "transaction\\\_no": "TXN000003",
      "status": "SUCCESS"
    }
  },
  "trace\\\_id": "trace-merchant-payment-order-detail-001"
}
```

#### Business rules

* Merchant chỉ xem payment order của chính mình.
* Không hiển thị dữ liệu ví user nhạy cảm cho merchant.
* Payment PAID không được cancel.

\---

## 18.5. Admin Payment Flow — Ledger/Callbacks/Timeline

### Endpoints

|Method|Endpoint|Mô tả|Auth|
|-|-|-|-|
|GET|`/admin/payment-orders/{id}/timeline`|Timeline payment flow|Admin|
|GET|`/admin/payment-orders/{id}/ledger`|Ledger của payment|Admin|
|GET|`/admin/payment-orders/{id}/callbacks`|Callback/webhook của payment|Admin|

\---

### GET `/admin/payment-orders/{id}/ledger`

#### Response `200`

```json
{
  "success": true,
  "message": "Payment ledger",
  "data": {
    "payment\\\_order\\\_id": "00000000-0000-0000-0000-000000000701",
    "payment\\\_no": "PAY000001",
    "ledger\\\_transaction": {
      "id": "00000000-0000-0000-0000-000000000403",
      "transaction\\\_no": "TXN000003",
      "transaction\\\_type": "PAYMENT",
      "status": "SUCCESS",
      "amount": 320000,
      "currency": "VND",
      "completed\\\_at": "2026-06-08T09:03:00Z"
    },
    "entries": \\\[
      {
        "entry\\\_type": "DEBIT",
        "account\\\_type": "USER\\\_WALLET",
        "wallet\\\_id": "00000000-0000-0000-0000-000000000201",
        "amount": 320000,
        "balance\\\_before": 2000000,
        "balance\\\_after": 1680000
      },
      {
        "entry\\\_type": "CREDIT",
        "account\\\_type": "MERCHANT\\\_BALANCE",
        "merchant\\\_id": "00000000-0000-0000-0000-000000000801",
        "amount": 320000,
        "balance\\\_before": 0,
        "balance\\\_after": 320000
      }
    ]
  },
  "trace\\\_id": "trace-admin-payment-ledger-001"
}
```

#### Business rules

* Admin xem được ledger payment toàn hệ thống.
* Ledger phải cân bằng tổng DEBIT = tổng CREDIT.
* Ledger entry không cho sửa/xóa.

\---

### GET `/admin/payment-orders/{id}/callbacks`

#### Response `200`

```json
{
  "success": true,
  "message": "Payment callbacks",
  "data": \\\[
    {
      "id": "00000000-0000-0000-0000-000000000731",
      "event\\\_id": "CBK000001",
      "event\\\_type": "PAYMENT\\\_SUCCESS",
      "callback\\\_url": "https://merchant.example.com/webhooks/payment",
      "status": "SUCCESS",
      "http\\\_status": 200,
      "retry\\\_count": 0,
      "sent\\\_at": "2026-06-08T09:03:05Z",
      "last\\\_error": null,
      "created\\\_at": "2026-06-08T09:03:00Z"
    }
  ],
  "trace\\\_id": "trace-admin-payment-callbacks-001"
}
```

#### Business rules

* Admin xem được toàn bộ callback của payment.
* Không hiển thị webhook secret.
* Callback failed có thể link sang endpoint retry webhook.

\---

## 18.6. Admin QR Expire Job Demo

### POST `/admin/qr-payments/jobs/expire`

#### Request

```json
{
  "reason": "Manual expire QR job for demo"
}
```

#### Response `200`

```json
{
  "success": true,
  "message": "QR expire job completed",
  "data": {
    "expired\\\_qr\\\_count": 3,
    "expired\\\_payment\\\_count": 3,
    "executed\\\_at": "2026-06-08T10:00:00Z"
  },
  "trace\\\_id": "trace-admin-qr-expire-job-001"
}
```

#### Storage affected

```text
payment\\\_qr\\\_codes
payment\\\_orders
MongoDB audit\\\_logs
MongoDB system\\\_logs
```

#### Business rules

* Chỉ QR ACTIVE quá `expired\\\_at` mới chuyển EXPIRED.
* Payment PENDING quá `expired\\\_at` có thể chuyển EXPIRED.
* Job không ảnh hưởng payment đã PAID.
* Job demo do Admin trigger, production có thể chạy background schedule.

\---

## 18.7. Merchant Reports

### Endpoints

|Method|Endpoint|Mô tả|Auth|
|-|-|-|-|
|GET|`/merchant/reports/payments`|Báo cáo payment của merchant|Merchant JWT|
|GET|`/merchant/reports/refunds`|Báo cáo refund của merchant|Merchant JWT|
|GET|`/merchant/reports/webhooks`|Báo cáo webhook của merchant|Merchant JWT|

\---

### GET `/merchant/reports/payments`

#### Query

```http
GET /merchant/reports/payments?from\\\_date=2026-06-01\\\&to\\\_date=2026-06-08\\\&status=PAID\\\&page=1\\\&page\\\_size=20
```

#### Response `200`

```json
{
  "success": true,
  "message": "Merchant payment report",
  "data": \\\[
    {
      "payment\\\_no": "PAY000001",
      "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
      "amount": 320000,
      "currency": "VND",
      "status": "PAID",
      "paid\\\_at": "2026-06-08T09:03:00Z",
      "callback\\\_status": "SUCCESS"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1,
    "summary": {
      "total\\\_payment": 1,
      "paid\\\_count": 1,
      "paid\\\_amount": 320000,
      "expired\\\_count": 0,
      "failed\\\_count": 0
    }
  },
  "trace\\\_id": "trace-merchant-report-payments-001"
}
```

#### Business rules

* Merchant chỉ xem dữ liệu của chính mình.
* Tổng doanh số chỉ tính payment PAID.
* Không hiển thị thông tin ví user nhạy cảm.

\---

### GET `/merchant/reports/refunds`

#### Response `200`

```json
{
  "success": true,
  "message": "Merchant refund report",
  "data": \\\[
    {
      "refund\\\_no": "RFD000001",
      "payment\\\_no": "PAY000001",
      "merchant\\\_order\\\_id": "ORDER-COFFEE-001",
      "amount": 100000,
      "currency": "VND",
      "status": "SUCCESS",
      "description": "Khach huy mot phan don hang",
      "refunded\\\_at": "2026-06-08T09:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1,
    "summary": {
      "refund\\\_count": 1,
      "refund\\\_success\\\_amount": 100000
    }
  },
  "trace\\\_id": "trace-merchant-report-refunds-001"
}
```

#### Business rules

* Merchant chỉ xem refund thuộc payment của mình.
* Refund SUCCESS mới tính vào tổng tiền hoàn thành công.

\---

### GET `/merchant/reports/webhooks`

#### Response `200`

```json
{
  "success": true,
  "message": "Merchant webhook report",
  "data": \\\[
    {
      "event\\\_id": "CBK000001",
      "event\\\_type": "PAYMENT\\\_SUCCESS",
      "payment\\\_no": "PAY000001",
      "callback\\\_url": "https://merchant.example.com/webhooks/payment",
      "status": "SUCCESS",
      "http\\\_status": 200,
      "retry\\\_count": 0,
      "sent\\\_at": "2026-06-08T09:03:05Z"
    }
  ],
  "meta": {
    "page": 1,
    "page\\\_size": 20,
    "total": 1,
    "summary": {
      "total\\\_callback": 1,
      "success\\\_count": 1,
      "failed\\\_count": 0,
      "retrying\\\_count": 0,
      "success\\\_rate": 100
    }
  },
  "trace\\\_id": "trace-merchant-report-webhooks-001"
}
```

#### Business rules

* Merchant chỉ xem webhook của chính mình.
* Không hiển thị webhook secret.
* Callback failed phải truy vết được sang webhook detail.

\---

## 18.8. Platform API — Health/Status

### Endpoints

|Method|Endpoint|Mô tả|Auth|
|-|-|-|-|
|GET|`/health`|Health check|Public|
|GET|`/status`|System status|Public/Admin tùy cấu hình|

### GET `/health`

#### Response `200`

```json
{
  "success": true,
  "message": "Healthy",
  "data": {
    "status": "UP",
    "server\\\_time": "2026-06-08T10:00:00Z",
    "database": "UP"
  },
  "trace\\\_id": "trace-health-001"
}
```

### GET `/status`

#### Response `200`

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
  "trace\\\_id": "trace-status-001"
}
```

#### Business rules

* `/health` dùng cho kiểm tra sống/chết của service.
* `/status` có thể trả thêm trạng thái queue/cache/job nếu hệ thống có dùng.
* Health endpoint không yêu cầu JWT.
* Nếu dependency lỗi, trả trạng thái phù hợp, ví dụ HTTP 503.



# 19\. Important Implementation Notes

## 19.1. API không được có

```http
PATCH /wallet-balances/{id}
POST /ledger-entries
DELETE /payment-orders/{id}
DELETE /ledger-transactions/{id}
DELETE /wallet-transfers/{id}
```

Lý do: dữ liệu tiền phải được thay đổi qua nghiệp vụ hợp lệ, không sửa trực tiếp.

## 19.2. API bắt buộc có transaction boundary

|API|Transaction|
|-|-|
|`POST /topups`|Có|
|`POST /transfers`|Có|
|`POST /qr-payments/{qr\\\_token}/confirm`|Có|
|`POST /merchant/refunds`|Có|
|`POST /admin/refunds`|Có|

## 19.3. API bắt buộc có idempotency

|API|Idempotency|
|-|-|
|`POST /topups`|Bắt buộc|
|`POST /transfers`|Bắt buộc|
|`POST /merchant/payments`|Bắt buộc|
|`POST /qr-payments/{qr\\\_token}/confirm`|Bắt buộc|
|`POST /merchant/refunds`|Bắt buộc|

## 19.4. API bắt buộc ghi audit

|Nhóm|Events|
|-|-|
|Auth|login, logout, password change|
|Wallet|create, lock, unlock|
|Topup|created, success, failed|
|Transfer|created, success, failed|
|Payment|created, paid, failed, expired|
|Refund|created, success, failed|
|Merchant|approve, reject, suspend, api key rotate|
|Webhook|retry, success, failed|
|Setting|update|

\---

## 20. Core schema additions

### 20.1. Withdrawal API

```http
POST /api/v1/withdrawals
Authorization: Bearer <access\\\_token>
Idempotency-Key: <unique\\\_key>
```

```json
{
  "linked\\\_bank\\\_id": "00000000-0000-0000-0000-000000000901",
  "amount": 500000,
  "description": "Rut tien ve ngan hang"
}
```

Backend tạo `withdrawal_transactions`, ledger WITHDRAWAL và debit ví trong cùng transaction. Không ghi `bank_code` hoặc `account_number` vào `withdrawal_transactions`; thông tin tài khoản lấy từ `wallet_linked_banks`.

### 20.2. Deferred core resources

`chat_messages`, `group_fundings` và `group_funding_members` đã có trong schema core nhưng chưa công bố endpoint trong API phase hiện tại.


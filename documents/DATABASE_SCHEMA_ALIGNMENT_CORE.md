# Database Schema Alignment — ewallet_core_db

> Nguồn chuẩn: `C:\Users\Admin\Downloads\ewallet_core_db.sql`  
> Mục đích: khóa mapping giữa FRS, API Design và PostgreSQL schema.

## 1. Quyết định kiến trúc

- PostgreSQL lưu dữ liệu nghiệp vụ, số dư, ledger, payment, refund, RBAC và outbox.
- MongoDB lưu `audit_logs`, `system_logs`, `security_logs`, `user_activity_logs`, `api_request_logs` và `webhook_attempt_logs`.
- `outbox_events` là bảng PostgreSQL dùng phát sự kiện webhook/integration.
- Các bảng nghiệp vụ liên kết ledger qua `ledger_transactions.source_type` và `source_id`.
- Chỉ `ledger_entries` lưu trực tiếp `ledger_transaction_id`.
- PostgreSQL core chỉ định nghĩa enum `group_funding_type`; các status/type còn lại là `VARCHAR` và phải được validate tại API/service.
- Không giả định có trigger tự cập nhật `updated_at`; service phải cập nhật rõ ràng.
- `api_secret_hash` và `webhook_secret_hash` chỉ lưu hash/fingerprint. Nếu dùng HMAC, khóa ký thực tế phải nằm trong secret manager/KMS hoặc kho mã hóa ngoài PostgreSQL.

## 2. Danh sách bảng PostgreSQL chuẩn

### Auth và RBAC

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `refresh_tokens`
- `password_resets`
- `otp_tracking`

### Wallet và tiện ích user

- `wallets`
- `wallet_balances`
- `wallet_limits`
- `wallet_linked_banks`
- `user_kyc`
- `user_devices`
- `notifications`
- `chat_messages`

### Ledger và giao dịch

- `ledger_transactions`
- `ledger_entries`
- `deposit_transactions`
- `withdrawal_transactions`
- `wallet_transfers`

### Merchant và payment

- `merchants`
- `merchant_users`
- `merchant_api_keys`
- `merchant_callback_configs`
- `merchant_balances`
- `payment_orders`
- `payment_qr_codes`
- `payment_transactions`
- `refund_transactions`

### System và mở rộng

- `idempotency_keys`
- `app_settings`
- `code_sequences`
- `outbox_events`
- `group_fundings`
- `group_funding_members`

## 3. Mapping bắt buộc

| Nghiệp vụ | Bảng nguồn | Ledger mapping |
|---|---|---|
| Topup | `deposit_transactions` | `source_type = DEPOSIT_TRANSACTION`, `source_id = deposit_transactions.id` |
| Withdrawal | `withdrawal_transactions` | `source_type = WITHDRAWAL_TRANSACTION`, `source_id = withdrawal_transactions.id` |
| Transfer | `wallet_transfers` | `source_type = WALLET_TRANSFER`, `source_id = wallet_transfers.id` |
| Payment | `payment_transactions` | `source_type = PAYMENT_TRANSACTION`, `source_id = payment_transactions.id` |
| Refund | `refund_transactions` | `source_type = REFUND_TRANSACTION`, `source_id = refund_transactions.id` |

## 4. Tên trường chuẩn

| Không dùng | Dùng theo core |
|---|---|
| `deposit_transactions.note` | `deposit_transactions.description` |
| `refund_transactions.reason` | `refund_transactions.description` |
| `payment_orders.order_code` | `payment_orders.payment_no` hoặc `merchant_order_id` theo ý nghĩa |
| `payment_qr_codes.qr_content` | `payment_qr_codes.qr_payload` |
| `ledger_entries.transaction_id` | `ledger_entries.ledger_transaction_id` |
| `ledger_transactions.reference_id` | `ledger_transactions.source_id` |
| `idempotency_keys.response_data` | `idempotency_keys.response_body` |
| `otp_tracking.otp_code` | `otp_tracking.otp_hash` |
| `merchants.default_callback_url` | `merchant_callback_configs.default_callback_url` |
| `merchants.webhook_secret_hash` | `merchant_callback_configs.webhook_secret_hash` |

Không dùng giá trị hash làm khóa HMAC vì không thể khôi phục secret gốc.

`withdrawal_transactions` không có `bank_code` hoặc `account_number`; API phải dùng `linked_bank_id`.

## 5. Thành phần không tồn tại trong PostgreSQL core

- `auth_login_attempts`
- `setting_histories`
- `payment_callbacks`
- `audit_logs`
- `system_logs`
- `security_logs`

Các nhu cầu tương ứng được lưu tại MongoDB hoặc biểu diễn bằng `outbox_events`.

## 6. Quy tắc tài liệu/API

- API có thể trả `transaction_no`, nhưng phải resolve ledger bằng `source_type + source_id`.
- API refund sử dụng trường `description`.
- API topup sử dụng `deposit_method` và `description`.
- Webhook list/detail/retry đọc outbox state kết hợp MongoDB `webhook_attempt_logs`.
- Login attempt đọc/ghi MongoDB `security_logs`.
- Lịch sử thay đổi setting đọc/ghi MongoDB `audit_logs`.
- Các bảng `chat_messages`, `group_fundings`, `group_funding_members` tồn tại trong core nhưng API có thể được đánh dấu ngoài phạm vi phase hiện tại.

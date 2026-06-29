# Admin Module — Trạng thái implement API

> Cập nhật: 24/06/2026 | Tổng: **16/65 routes đã implement** (~25%)

---

## Tổng quan

| Thư mục | Đã implement | Chưa implement | Tỷ lệ |
|---------|:---:|:---:|:---:|
| `users/` | 9 | 5 | 64% |
| `wallets/` | 6 | 0 | **100%** |
| `merchants/` | 0 | 7 | 0% |
| `transactions/` | 0 | 8 | 0% |
| `payments/` | 0 | 8 | 0% |
| `webhooks/` | 0 | 4 | 0% |
| `dashboard/` | 1 | 5 | 17% |
| `reports/` | 0 | 8 | 0% |
| `settings/` | 0 | 3 | 0% |
| `logs/` | 0 | 4 | 0% |
| **Tổng** | **16** | **49** | **25%** |

---

## 1. Users — 9/14 ✅

### ✅ Đã implement (có controller + service + repository)

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/users` | Danh sách user (có filter: q, status, user_type, page, limit) |
| 2a | POST | `/admin/customers` | Tạo khách hàng (tạo kèm ví mặc định) |
| 2b | POST | `/admin/staffs` | Tạo nhân viên nội bộ (gán role RBAC, không ví) |
| 3 | GET | `/admin/users/:id` | Chi tiết user (bao gồm roles, wallet info) |
| 4 | PATCH | `/admin/users/:id` | Cập nhật user (full_name, username, email, phone, is_kyc_verified) |
| 5 | GET | `/admin/users/:id/wallet` | Xem ví của user |
| 6 | POST | `/admin/users/:id/actions/lock` | Khóa user (revoke session, ghi audit log) |
| 7 | POST | `/admin/users/:id/actions/unlock` | Mở khóa user (reset failed attempts, ghi audit log) |
| 8 | POST | `/admin/users/:id/actions/reset-password` | Reset mật khẩu (validate policy, revoke session, ghi audit log) |
| 9 | GET | `/admin/users/:id/audit-logs` | Xem audit log liên quan user |

### ❌ Chưa implement (notImplemented)

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 10 | GET | `/admin/roles` | Danh sách role |
| 11 | POST | `/admin/roles` | Tạo role (Super Admin) |
| 12 | GET | `/admin/roles/:id` | Chi tiết role |
| 13 | PATCH | `/admin/roles/:id` | Cập nhật role (Super Admin) |
| 14 | GET | `/admin/permissions` | Danh sách permission |

---

## 2. Wallets — 6/6 ✅ HOÀN THÀNH

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/wallets` | Danh sách ví (filter: q, status, user_id, page, limit) |
| 2 | GET | `/admin/wallets/:wallet_id` | Chi tiết ví (bao gồm user info, balance) |
| 3 | GET | `/admin/wallets/:wallet_id/summary` | Tổng quan ví |
| 4 | GET | `/admin/wallets/:wallet_id/ledger` | Ledger entries của ví (có phân trang) |
| 5 | POST | `/admin/wallets/:wallet_id/actions/lock` | Khóa ví (bắt buộc reason, ghi audit log) |
| 6 | POST | `/admin/wallets/:wallet_id/actions/unlock` | Mở khóa ví (bắt buộc reason, ghi audit log) |

---

## 3. Merchants — 0/7 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/merchants` | Danh sách merchant |
| 1b | POST | `/admin/merchants` | Tạo merchant (kèm tạo tài khoản owner, API key, webhook config) |
| 2 | GET | `/admin/merchants/:id` | Chi tiết merchant |
| 3 | POST | `/admin/merchants/:id/actions/approve` | Duyệt merchant |
| 4 | POST | `/admin/merchants/:id/actions/reject` | Từ chối merchant |
| 5 | POST | `/admin/merchants/:id/actions/suspend` | Tạm ngưng merchant |
| 6 | POST | `/admin/merchants/:id/actions/activate` | Kích hoạt lại merchant |
| 7 | GET | `/admin/merchants/:id/api-keys` | Xem API keys của merchant |

---

## 4. Transactions — 0/8 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/topups` | Danh sách topup |
| 2 | GET | `/admin/topups/:id` | Chi tiết topup |
| 3 | GET | `/admin/transfers` | Danh sách transfer |
| 4 | GET | `/admin/transfers/:id` | Chi tiết transfer |
| 5 | GET | `/admin/transactions` | Danh sách giao dịch ledger |
| 6 | GET | `/admin/transactions/:id` | Chi tiết giao dịch |
| 7 | GET | `/admin/ledger-entries` | Tra cứu ledger entries |
| 8 | POST | `/admin/transactions/reconcile` | Chạy đối soát ledger |

> **Lưu ý:** Refunds cũng thuộc nhóm này

| 9 | GET | `/admin/refunds` | Danh sách refund |
| 10 | GET | `/admin/refunds/:id` | Chi tiết refund |
| 11 | POST | `/admin/refunds` | Tạo refund (cần Idempotency-Key) |

---

## 5. Payments — 0/8 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/payment-orders` | Danh sách payment orders |
| 2 | GET | `/admin/payment-orders/:id` | Chi tiết payment order |
| 3 | GET | `/admin/payment-orders/:id/timeline` | Timeline payment flow |
| 4 | GET | `/admin/payment-orders/:id/ledger` | Ledger của payment |
| 5 | GET | `/admin/payment-orders/:id/callbacks` | Callback của payment |
| 6 | GET | `/admin/qr-payments` | Tra cứu QR payments |
| 7 | GET | `/admin/qr-payments/:id` | Chi tiết QR payment |
| 8 | POST | `/admin/qr-payments/jobs/expire` | Chạy job expire QR (demo) |

---

## 6. Webhooks — 0/4 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/webhooks` | Danh sách callback/webhook |
| 2 | GET | `/admin/webhooks/:id` | Chi tiết callback |
| 3 | POST | `/admin/webhooks/:id/actions/retry` | Retry callback thất bại |
| 4 | POST | `/admin/webhooks/jobs/retry-due` | Chạy job retry due (demo) |

---

## 7. Dashboard — 1/6 ⚠️

### ✅ Đã implement

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/dashboard/kpis` | KPI tổng quan (total_transactions, total_amount, error_rate, total_users, total_merchants, chart_data 7 ngày, recent_transactions) |

### ❌ Chưa implement

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 2 | GET | `/admin/dashboard/transactions-chart` | Biểu đồ giao dịch theo thời gian |
| 3 | GET | `/admin/dashboard/success-rate` | Tỷ lệ thành công/thất bại |
| 4 | GET | `/admin/dashboard/top-merchants` | Top merchant theo doanh thu |
| 5 | GET | `/admin/dashboard/recent-activities` | Hoạt động gần đây |
| 6 | GET | `/admin/dashboard/alerts` | Cảnh báo hệ thống |

---

## 8. Reports — 0/8 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/reports/topups` | Báo cáo nạp tiền |
| 2 | GET | `/admin/reports/transfers` | Báo cáo chuyển tiền |
| 3 | GET | `/admin/reports/payments` | Báo cáo thanh toán |
| 4 | GET | `/admin/reports/refunds` | Báo cáo hoàn tiền |
| 5 | GET | `/admin/reports/merchants` | Báo cáo merchant |
| 6 | GET | `/admin/reports/webhooks` | Báo cáo webhook |
| 7 | GET | `/admin/reports/ledger` | Báo cáo ledger |
| 8 | GET | `/admin/reports/export` | Export báo cáo |

---

## 9. Settings — 0/3 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/settings` | Xem cấu hình hệ thống |
| 2 | PATCH | `/admin/settings/:key` | Cập nhật setting |
| 3 | GET | `/admin/settings/history` | Lịch sử thay đổi setting |

---

## 10. Logs — 0/4 ❌

| # | Method | Endpoint | Chức năng |
|---|--------|----------|-----------|
| 1 | GET | `/admin/audit-logs` | Danh sách audit log |
| 2 | GET | `/admin/audit-logs/:id` | Chi tiết audit log |
| 3 | GET | `/admin/system-logs` | Danh sách system log |
| 4 | GET | `/admin/payment-traces/:payment_order_id` | Trace payment flow |

---

## Business Logic đã implement

### Users
- ✅ Kiểm tra quyền write (Admin/Super Admin) trước khi tạo/sửa/khóa/mở user
- ✅ Super Admin required khi thao tác trên tài khoản system roles (ADMIN, SUPER_ADMIN, SUPPORT_STAFF)
- ✅ Không cho khóa chính tài khoản đang đăng nhập
- ✅ Bắt buộc nhập lý do khi khóa/mở khóa
- ✅ Kiểm tra conflict username/email/phone khi tạo/cập nhật
- ✅ Password policy (tối thiểu 8 ký tự)
- ✅ Revoke session khi khóa user (token_version + 1)
- ✅ Ghi audit log cho mọi thao tác quản trị
- ✅ Tạo ví tự động khi tạo user mới
- ✅ Gán role mặc định USER

### Wallets
- ✅ Kiểm tra quyền write trước khi khóa/mở ví
- ✅ Bắt buộc nhập reason khi khóa/mở ví
- ✅ Không cho admin sửa số dư trực tiếp
- ✅ Hiển thị thông tin chủ ví (user info) trong chi tiết ví
- ✅ Phân trang ledger entries
- ✅ Ghi audit log khi khóa/mở ví

### Dashboard
- ✅ Tổng giao dịch, tổng tiền thành công
- ✅ Error rate (tỷ lệ giao dịch lỗi)
- ✅ Tổng user, tổng merchant
- ✅ Biểu đồ giao dịch 7 ngày gần nhất
- ✅ 5 giao dịch gần nhất

---

## Middleware đã áp dụng

| Middleware | Mô tả |
|---|---|
| `authenticateJwt` | Xác thực JWT token |
| `requireAdmin` | Kiểm tra user có role admin |
| `requirePermission(...)` | Kiểm tra permission cụ thể (users.manage, wallets.read, wallets.lock, audit_logs.read) |

---

## Ghi chú

- Tất cả UUID được tạo bằng `uuidv7()` (thư viện `uuid`)
- Validate UUID dùng regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Pagination mặc định: page=1, limit=20, max=100
- Response format: `{ success, code, message, data }`
- Audit log lưu PostgreSQL table `audit_logs`

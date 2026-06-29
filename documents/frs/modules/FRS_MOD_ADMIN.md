# FRS Chi tiết — MOD-ADMIN: Quản trị hệ thống

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Admin cung cấp giao diện quản trị hệ thống ví điện tử và cổng thanh toán. Admin có thể quản lý user, ví, merchant, giao dịch, payment order, callback/webhook, audit log và các vấn đề vận hành.

Module này không trực tiếp tạo dòng tiền, nhưng có vai trò giám sát, tra cứu, kiểm soát rủi ro và hỗ trợ xử lý lỗi.

**Phạm vi chính:**

- Quản lý khách hàng (User App)
- Quản lý nhân viên nội bộ (Staff)
- Quản lý ví người dùng
- Quản lý merchant
- Quản lý payment order
- Quản lý giao dịch ví/ledger
- Quản lý topup/transfer/payment
- Quản lý callback/webhook
- Xem audit log/system log
- Retry callback
- Khóa/mở user, ví, merchant
- Xuất file dữ liệu quản trị

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Admin | Quản lý dữ liệu vận hành, tra cứu, khóa/mở user/ví/merchant |
| Super Admin | Toàn quyền cấu hình hệ thống và quản lý admin khác |
| Support Staff | Chỉ xem dữ liệu và hỗ trợ tra cứu, không thao tác nhạy cảm |
| System | Ghi log, cập nhật trạng thái tự động |
| User/Merchant | Không truy cập admin web |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-ADMIN-01: Quản lý khách hàng (User App)

**Mô tả:**  
Admin quản lý tệp khách hàng sử dụng ví điện tử (loại tài khoản USER). Bao gồm xem danh sách, tra cứu thông tin, tạo mới (tự động sinh ví mặc định), trạng thái ví và lịch sử giao dịch.

**Actor:** Admin, Support Staff

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| User ID | ID người dùng |
| Họ tên | full_name |
| Số điện thoại | phone |
| Email | email |
| Trạng thái tài khoản | ACTIVE / LOCKED / BLOCKED |
| Mã ví | wallet_no |
| Số dư ví | available_balance |
| Ngày tạo | created_at |
| Đăng nhập cuối | last_login_at |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Từ khóa | Tên, SĐT, email, mã ví |
| Trạng thái | ACTIVE / LOCKED / BLOCKED |
| Khoảng số dư | Từ — đến |
| Thời gian tạo | Từ ngày — đến |

**Actions:**

- Xem chi tiết user
- Tạo user mới (tự động tạo ví mặc định và gán role)
- Cập nhật thông tin user
- Khóa tài khoản
- Mở khóa tài khoản
- Reset mật khẩu
- Xem ví
- Xem lịch sử giao dịch
- Xem audit log liên quan

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin không được sửa trực tiếp số dư ví |
| BR-02 | Khóa user bắt buộc nhập lý do |
| BR-03 | Reset mật khẩu phải revoke session cũ |
| BR-04 | Không thể khóa chính tài khoản admin đang đăng nhập |
| BR-05 | Mọi thao tác quản trị user phải ghi audit log |
| BR-06 | Khi tạo user (ví điện tử), hệ thống tự động tạo 1 ví mặc định trong cùng transaction. Nếu lỗi ví thì rollback user. |

---

### FN-ADMIN-01B: Quản lý nhân viên nội bộ (Staff)

**Mô tả:**  
Admin cấp cao quản lý danh sách tài khoản nội bộ (ADMIN, SUPER_ADMIN, SUPPORT_STAFF) dùng để đăng nhập vào Admin Web.

**Actor:** Super Admin, Admin (có quyền)

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| User ID | ID nhân viên |
| Họ tên | full_name |
| Tên đăng nhập | username/email |
| Loại tài khoản | ADMIN / SUPPORT_STAFF |
| Role | Vai trò phân quyền (RBAC) |
| Trạng thái | ACTIVE / LOCKED |

**Actions:**

- Xem chi tiết nhân viên
- Tạo nhân viên mới (chỉ định loại tài khoản và Role, KHÔNG tạo ví)
- Cập nhật thông tin và phân quyền
- Khóa / Mở khóa tài khoản
- Reset mật khẩu

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không tạo ví mặc định cho các loại tài khoản nội bộ. |
| BR-02 | Tài khoản nhân viên bắt buộc phải có Role để phần quyền (RBAC). |
| BR-03 | Không thể khóa/xóa chính tài khoản đang đăng nhập. |
| BR-04 | Mọi thao tác quản lý nhân viên phải ghi audit log. |

---

### FN-ADMIN-02: Quản lý ví người dùng

**Mô tả:**  
Admin xem danh sách ví, chi tiết số dư và trạng thái ví. Admin có thể khóa/mở ví nhưng không được sửa số dư trực tiếp.

**Actor:** Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã ví | wallet_no |
| Chủ ví | User sở hữu |
| Số dư khả dụng | available_balance |
| Số dư bị giữ | locked_balance |
| Trạng thái ví | ACTIVE / LOCKED / CLOSED |
| Cập nhật gần nhất | updated_at |

**Actions:**

- Xem chi tiết ví
- Khóa ví
- Mở khóa ví
- Xem biến động số dư
- Xem ledger entries
- Xuất file

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho admin cập nhật số dư thủ công |
| BR-02 | Khóa ví không làm thay đổi số dư |
| BR-03 | Ví LOCKED không được topup, transfer, payment |
| BR-04 | Khóa/mở ví bắt buộc ghi lý do |
| BR-05 | Mọi thao tác ví phải ghi audit log |

---

### FN-ADMIN-03: Quản lý merchant

**Mô tả:**  
Admin quản lý merchant tích hợp cổng thanh toán, bao gồm duyệt, từ chối, tạm ngưng, kích hoạt lại và xem payment của merchant.

**Actor:** Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã merchant | merchant_code |
| Tên merchant | merchant_name |
| Email | email |
| Số điện thoại | phone |
| Trạng thái | PENDING_REVIEW / ACTIVE / SUSPENDED / REJECTED |
| Tổng payment | Số payment đã tạo |
| Tổng tiền đã thanh toán | Tổng payment PAID |
| Ngày tạo | created_at |

**Actions:**

- Xem chi tiết merchant
- Duyệt merchant
- Từ chối merchant
- Tạm ngưng merchant
- Kích hoạt lại merchant
- Xem API keys
- Xem payment orders
- Xem callback logs

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chưa ACTIVE không được tạo payment |
| BR-02 | Từ chối/tạm ngưng merchant bắt buộc nhập lý do |
| BR-03 | Không hiển thị API secret plain text |
| BR-04 | Admin có thể revoke API key của merchant |
| BR-05 | Mọi thao tác merchant phải ghi audit log |

---

### FN-ADMIN-04: Quản lý payment order

**Mô tả:**  
Admin tra cứu payment order do merchant tạo, xem trạng thái thanh toán, giao dịch liên quan, QR, callback và log xử lý.

**Actor:** Admin, Support Staff

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã payment | payment_no |
| Mã đơn merchant | merchant_order_id |
| Merchant | merchant_name |
| Số tiền | amount |
| Trạng thái | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| Callback status | SUCCESS / FAILED / RETRYING |
| Ngày tạo | created_at |
| Thanh toán lúc | paid_at |

**Actions:**

- Xem chi tiết payment flow
- Xem QR
- Xem payment transaction
- Xem ledger
- Xem callback
- Retry callback
- Xuất file

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Admin không được sửa payment PAID thủ công |
| BR-02 | Payment PAID không thể hủy |
| BR-03 | Retry callback không tạo giao dịch tiền mới |
| BR-04 | Payment detail phải truy vết đủ merchant, user, wallet, ledger, webhook |
| BR-05 | Dữ liệu mặc định sắp xếp mới nhất trước |

---

### FN-ADMIN-05: Quản lý giao dịch & ledger

**Mô tả:**  
Admin xem toàn bộ giao dịch ledger, các entries debit/credit và kiểm tra tính cân bằng của giao dịch.

**Actor:** Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã giao dịch | transaction_no |
| Loại | TOPUP / TRANSFER / PAYMENT / REFUND |
| Số tiền | amount |
| Trạng thái | PENDING / SUCCESS / FAILED / CANCELED |
| Nghiệp vụ gốc | source_type/source_id |
| Thời gian | created_at |

**Actions:**

- Xem chi tiết transaction
- Xem ledger entries
- Xem balance snapshot
- Xem nghiệp vụ gốc
- Chạy đối soát
- Xuất file

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Giao dịch SUCCESS không cho sửa/xóa |
| BR-02 | Admin không được tạo adjustment trong MVP |
| BR-03 | Ledger entry không cho sửa/xóa |
| BR-04 | Đối soát chỉ đọc và báo cáo sai lệch, không tự sửa |
| BR-05 | Sai lệch ledger phải ghi system log mức CRITICAL |

---

### FN-ADMIN-06: Quản lý callback/webhook

**Mô tả:**  
Admin xem danh sách callback/webhook gửi về merchant, kiểm tra lỗi và retry thủ công.

**Actor:** Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Event ID | event_id |
| Merchant | merchant_name |
| Payment | payment_no |
| Event type | PAYMENT_SUCCESS / PAYMENT_FAILED / PAYMENT_EXPIRED |
| Callback URL | URL nhận |
| Trạng thái | PENDING / SUCCESS / FAILED / RETRYING |
| HTTP status | response_status |
| Retry count | retry_count |
| Lỗi gần nhất | last_error |
| Thời gian tạo | created_at |

**Actions:**

- Xem chi tiết callback
- Xem request body
- Xem response body
- Retry callback
- Lọc lỗi 4xx/5xx/timeout
- Xuất file

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Retry callback chỉ áp dụng với callback FAILED/RETRYING |
| BR-02 | Retry callback không rollback hoặc tạo lại payment |
| BR-03 | Không hiển thị webhook secret |
| BR-04 | Request/response body có thể mask dữ liệu nhạy cảm |
| BR-05 | Retry thủ công phải ghi audit log |

---

### FN-ADMIN-07: Audit log

**Mô tả:**  
Admin xem lịch sử thao tác quan trọng trên hệ thống.

**Actor:** Admin, Super Admin

**Events ghi nhận:**

| Nhóm | Event |
|---|---|
| Auth | login, logout, failed_login, password_change |
| User | user.lock, user.unlock, user.reset_password |
| Wallet | wallet.create, wallet.lock, wallet.unlock |
| Merchant | merchant.approve, merchant.reject, merchant.suspend |
| API Key | api_key.create, api_key.revoke, api_key.rotate |
| Payment | payment.create, payment.paid, payment.expired, payment.cancel |
| Webhook | webhook.retry |
| Setting | setting.update |

**Data fields:**

| Cột | Mô tả |
|---|---|
| Thời gian | created_at |
| Actor | Người thực hiện |
| Action | Hành động |
| Entity | Đối tượng |
| IP | ip_address |
| User Agent | user_agent |
| Trace ID | trace_id |
| Chi tiết | old_values/new_values |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Audit log chỉ ghi, không sửa/xóa |
| BR-02 | Chỉ Admin/Super Admin được xem |
| BR-03 | Dữ liệu nhạy cảm phải được mask |
| BR-04 | Có filter theo thời gian, actor, action, entity |
| BR-05 | Retention audit log theo cấu hình |

---

### FN-ADMIN-08: System log

**Mô tả:**  
Admin kỹ thuật xem log lỗi hệ thống: lỗi payment flow, lỗi webhook, lỗi signature, lỗi ledger, lỗi background job.

**Actor:** Admin, Super Admin

**Log level:**

| Level | Mô tả |
|---|---|
| INFO | Thông tin vận hành |
| WARN | Cảnh báo |
| ERROR | Lỗi cần xử lý |
| CRITICAL | Lỗi nghiêm trọng như sai lệch ledger |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không log password, token, API secret |
| BR-02 | Log cần có trace_id để truy vết |
| BR-03 | Log lỗi ledger phải đánh dấu CRITICAL |
| BR-04 | Có filter theo level, module, thời gian |
| BR-05 | System log có thể cleanup theo retention |

---

## 4. API đề xuất

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/users` | Danh sách user |
| POST | `/api/v1/admin/customers` | Tạo khách hàng (tự động cấp ví) |
| POST | `/api/v1/admin/staffs` | Tạo nhân viên nội bộ (gán Role RBAC) |
| GET | `/api/v1/admin/users/{id}` | Chi tiết user |
| PATCH | `/api/v1/admin/users/{id}` | Cập nhật thông tin user |
| POST | `/api/v1/admin/users/{id}/actions/lock` | Khóa user |
| POST | `/api/v1/admin/users/{id}/actions/unlock` | Mở khóa user |
| GET | `/api/v1/admin/wallets` | Danh sách ví |
| GET | `/api/v1/admin/wallets/{id}` | Chi tiết ví |
| POST | `/api/v1/admin/wallets/{id}/actions/lock` | Khóa ví |
| POST | `/api/v1/admin/wallets/{id}/actions/unlock` | Mở khóa ví |
| GET | `/api/v1/admin/merchants` | Danh sách merchant |
| POST | `/api/v1/admin/merchants` | Tạo merchant (kèm owner, API key, webhook) |
| GET | `/api/v1/admin/payment-orders` | Danh sách payment |
| GET | `/api/v1/admin/transactions` | Danh sách giao dịch |
| POST | `/api/v1/admin/transactions/reconcile` | Đối soát ledger |
| GET | `/api/v1/admin/webhooks` | Danh sách webhook |
| POST | `/api/v1/admin/webhooks/{id}/retry` | Retry callback |
| GET | `/api/v1/admin/audit-logs` | Audit log |
| GET | `/api/v1/admin/system-logs` | System log |

---

## 5. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `users` | Quản lý user/admin/merchant account |
| `wallets`, `wallet_balances` | Quản lý ví |
| `merchants` | Quản lý merchant |
| `merchant_api_keys` | Quản lý API key |
| `payment_orders` | Tra cứu payment |
| `payment_transactions` | Giao dịch payment |
| `ledger_transactions`, `ledger_entries` | Ledger |
| `outbox_events` | Sự kiện callback chờ xử lý |
| MongoDB `webhook_attempt_logs` | Callback và lịch sử retry |
| MongoDB `audit_logs` | Audit |
| MongoDB `system_logs` | Log kỹ thuật |

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Admin xem được danh sách user |
| AC-01b | Admin tạo được KHÁCH HÀNG mới thành công (hệ thống tự động cấp ví và role USER) |
| AC-01c | Admin tạo được NHÂN VIÊN mới thành công (hệ thống gán role RBAC, không cấp ví) |
| AC-01d | Admin tạo được MERCHANT mới thành công (kèm Merchant Owner, API Key, Webhook) |
| AC-01e | Admin cập nhật được thông tin user cơ bản |
| AC-02 | Admin khóa/mở user và ghi audit log |
| AC-03 | Admin xem được danh sách ví nhưng không sửa được số dư |
| AC-04 | Admin khóa/mở ví và ghi lý do |
| AC-05 | Admin duyệt/tạm ngưng merchant |
| AC-06 | Admin xem được payment flow đầy đủ |
| AC-07 | Admin xem được ledger transaction và entries |
| AC-08 | Đối soát ledger không tự sửa dữ liệu |
| AC-09 | Admin retry callback thất bại |
| AC-10 | Audit log không cho sửa/xóa |
| AC-11 | System log không chứa secret/password/token |
| AC-12 | Support Staff chỉ xem, không thao tác nhạy cảm |

---

## 7. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Có cần phân quyền chi tiết cho support không? | Đề xuất: Có | Admin vs Support Staff |
| O-02 | Có cho admin tạo adjustment không? | Không trong MVP | Tránh rủi ro sửa tiền |
| O-03 | Có export Excel mọi danh sách không? | Có | Hữu ích cho đồ án |
| O-04 | Retention audit/system log bao lâu? | Mở | Đưa vào Setting |
| O-05 | Có cần dashboard realtime không? | Có mức đơn giản | Dùng Dashboard module |

---

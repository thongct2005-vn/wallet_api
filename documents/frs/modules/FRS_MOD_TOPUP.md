# FRS Chi tiết — MOD-TOPUP: Nạp tiền giả lập

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Nạp tiền giả lập cho phép user nạp tiền vào ví điện tử trong môi trường demo/sandbox. Vì đề tài không tích hợp ngân hàng thật, hệ thống sẽ giả lập kết quả nạp tiền thành công hoặc thất bại để phục vụ flow sử dụng ví.

Module này liên kết trực tiếp với:

- MOD-WALLET: Cộng tiền vào ví user
- MOD-TRANSACTION: Ghi ledger transaction TOPUP
- MOD-AUDIT: Ghi audit log
- MOD-ADMIN: Quản trị và tra cứu giao dịch nạp tiền
- MOD-SETTING: Cấu hình hạn mức nạp tiền

**Phạm vi chính:**

- User tạo yêu cầu nạp tiền giả lập
- Kiểm tra ví và hạn mức
- Xử lý giao dịch nạp tiền
- Cộng tiền vào số dư ví
- Ghi ledger credit vào ví user
- Chống double topup bằng idempotency key
- Xem lịch sử nạp tiền

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| User | Tạo giao dịch nạp tiền, xem lịch sử nạp của bản thân |
| Admin | Xem toàn bộ giao dịch nạp tiền, tra cứu chi tiết |
| System | Xử lý giao dịch, cập nhật balance, ghi ledger |
| Merchant | Không có quyền với module này |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-TOPUP-01: Tạo yêu cầu nạp tiền giả lập

**Mô tả:**  
User tạo yêu cầu nạp tiền vào ví với số tiền mong muốn. Hệ thống xử lý giả lập và cộng tiền vào ví nếu hợp lệ.

**Actor:** User

**Điều kiện tiên quyết:**

- User đã đăng nhập
- User có ví mặc định
- Ví đang ACTIVE
- Số tiền nạp hợp lệ
- Có idempotency key

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User chọn chức năng “Nạp tiền” |
| 2 | Nhập số tiền cần nạp |
| 3 | Chọn phương thức giả lập, ví dụ SANDBOX_BANK |
| 4 | User xác nhận |
| 5 | App gửi request kèm idempotency key |
| 6 | Hệ thống kiểm tra ví |
| 7 | Hệ thống kiểm tra hạn mức nạp |
| 8 | Tạo deposit transaction trạng thái PENDING |
| 9 | Giả lập kết quả nạp tiền |
| 10 | Nếu thành công, tạo ledger transaction TOPUP |
| 11 | Cộng tiền vào ví user |
| 12 | Cập nhật deposit transaction = SUCCESS |
| 13 | Ghi audit log |
| 14 | Trả kết quả cho app |

**Input fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| amount | BIGINT | Có | Số tiền nạp |
| deposit_method | String(50) | Có | SANDBOX_BANK / SANDBOX_CARD |
| description | Text | Không | Nội dung giao dịch |
| idempotency_key | String(100) | Có | Chống request trùng |

**Output fields:**

| Trường | Mô tả |
|---|---|
| deposit_id | ID giao dịch nạp |
| deposit_no | Mã giao dịch nạp |
| amount | Số tiền nạp |
| status | PENDING / SUCCESS / FAILED |
| wallet_balance | Số dư ví sau giao dịch nếu thành công |
| transaction_no | Mã ledger transaction |
| created_at | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ user có ví ACTIVE mới được nạp tiền |
| BR-02 | Amount phải > 0 |
| BR-03 | Amount phải nằm trong hạn mức cấu hình |
| BR-04 | Request phải có idempotency key |
| BR-05 | Nếu cùng idempotency key và cùng payload, trả lại kết quả cũ |
| BR-06 | Không tạo giao dịch nạp mới nếu request bị trùng |
| BR-07 | Cộng tiền ví và ghi ledger phải nằm trong cùng DB transaction |
| BR-08 | Nếu ledger lỗi, deposit không được SUCCESS |

---

### FN-TOPUP-02: Xử lý kết quả nạp tiền giả lập

**Mô tả:**  
Hệ thống xử lý kết quả nạp tiền theo chế độ giả lập. Trong MVP, có thể mặc định thành công hoặc cho phép chọn mô phỏng thất bại để test.

**Actor:** System

**Luồng thành công:**

| Bước | Hành động |
|---|---|
| 1 | Deposit transaction ở trạng thái PENDING |
| 2 | Hệ thống giả lập kết quả SUCCESS |
| 3 | Tạo ledger transaction TOPUP |
| 4 | Ghi ledger entry CREDIT cho ví user |
| 5 | Có thể ghi entry DEBIT cho system topup account nếu thiết kế ledger cân bằng |
| 6 | Cập nhật wallet_balances.available_balance |
| 7 | Cập nhật deposit transaction = SUCCESS |
| 8 | Ghi audit log |

**Luồng thất bại:**

| Bước | Hành động |
|---|---|
| 1 | Deposit transaction ở trạng thái PENDING |
| 2 | Hệ thống giả lập kết quả FAILED |
| 3 | Không cập nhật số dư ví |
| 4 | Không tạo ledger SUCCESS |
| 5 | Cập nhật deposit transaction = FAILED |
| 6 | Ghi failure_reason |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ deposit PENDING mới được xử lý |
| BR-02 | Deposit SUCCESS không được xử lý lại |
| BR-03 | Deposit FAILED không được tự chuyển SUCCESS nếu không tạo yêu cầu mới |
| BR-04 | Không cộng tiền nếu không ghi được ledger |
| BR-05 | Nếu lỗi kỹ thuật, transaction phải rollback |
| BR-06 | Cần ghi system log nếu xử lý nạp tiền lỗi |

---

### FN-TOPUP-03: Ghi ledger cho giao dịch nạp tiền

**Mô tả:**  
Mỗi giao dịch nạp tiền thành công phải được ghi vào ledger để đảm bảo truy vết.

**Actor:** System

**Ledger entries đề xuất:**

| Account | Entry type | Amount |
|---|---|---:|
| SYSTEM_TOPUP_ACCOUNT | DEBIT | Số tiền nạp |
| USER_WALLET | CREDIT | Số tiền nạp |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Deposit SUCCESS bắt buộc có ledger transaction TOPUP |
| BR-02 | Ledger transaction phải liên kết với deposit transaction |
| BR-03 | Nếu dùng system account, tổng debit phải bằng tổng credit |
| BR-04 | Balance snapshot phải lưu trước/sau giao dịch |
| BR-05 | Ledger entries không cho sửa/xóa |

---

### FN-TOPUP-04: Xem lịch sử nạp tiền

**Mô tả:**  
User xem danh sách giao dịch nạp tiền của bản thân. Admin xem toàn bộ giao dịch nạp tiền.

**Actor:** User, Admin

**Luồng User:**

| Bước | Hành động |
|---|---|
| 1 | User mở màn hình lịch sử nạp tiền |
| 2 | Hệ thống lấy deposit transactions của user |
| 3 | User lọc theo thời gian/trạng thái |
| 4 | Hệ thống trả danh sách |

**Luồng Admin:**

| Bước | Hành động |
|---|---|
| 1 | Admin mở quản lý giao dịch nạp tiền |
| 2 | Hệ thống hiển thị toàn bộ deposit transactions |
| 3 | Admin tìm kiếm theo user, mã giao dịch, trạng thái |
| 4 | Admin xem chi tiết giao dịch |

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã nạp tiền | deposit_no |
| Người dùng | User nạp tiền |
| Ví | wallet_no |
| Số tiền | amount |
| Phương thức | method |
| Trạng thái | PENDING / SUCCESS / FAILED |
| Mã ledger | transaction_no |
| Thời gian | created_at |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ xem được giao dịch nạp của mình |
| BR-02 | Admin xem được toàn bộ |
| BR-03 | Không cho sửa/xóa lịch sử nạp tiền |
| BR-04 | Danh sách mặc định sắp xếp mới nhất trước |

---

### FN-TOPUP-05: Hạn mức nạp tiền

**Mô tả:**  
Hệ thống kiểm tra hạn mức nạp tiền theo cấu hình để tránh giao dịch bất thường trong demo.

**Actor:** System, Admin

**Cấu hình đề xuất:**

| Setting | Mô tả | Default đề xuất |
|---|---|---|
| min_topup_amount | Số tiền nạp tối thiểu | 10.000 VND |
| max_topup_amount | Số tiền nạp tối đa/lần | 10.000.000 VND |
| daily_topup_limit | Tổng nạp tối đa/ngày | 50.000.000 VND |
| monthly_topup_limit | Tổng nạp tối đa/tháng | 200.000.000 VND |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Amount nhỏ hơn min_topup_amount thì từ chối |
| BR-02 | Amount lớn hơn max_topup_amount thì từ chối |
| BR-03 | Nếu vượt daily/monthly limit thì từ chối |
| BR-04 | Hạn mức tính theo user hoặc wallet |
| BR-05 | Lỗi vượt hạn mức phải trả mã LIMIT_EXCEEDED |

---

## 4. Data Model đề xuất

### 4.1. deposit_transactions

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| deposit_no | String(30) | Có | Mã giao dịch nạp |
| user_id | UUID FK | Có | User nạp tiền |
| wallet_id | UUID FK | Có | Ví nhận tiền |
| amount | BIGINT | Có | Số tiền nạp |
| currency | String(10) | Có | VND |
| deposit_method | String(50) | Có | SANDBOX_BANK / SANDBOX_CARD |
| status | String(50) | Có | PENDING / SUCCESS / FAILED / CANCELED |
| idempotency_key | String(100) | Có | Key chống trùng |
| failure_reason | Text | Không | Lý do thất bại |
| description | Text | Không | Nội dung giao dịch |
| created_at | Timestamp | Có | Thời gian tạo |
| updated_at | Timestamp | Có | Thời gian cập nhật |
| completed_at | Timestamp | Không | Thời gian hoàn tất |

Ledger liên kết gián tiếp bằng `ledger_transactions.source_type = 'DEPOSIT_TRANSACTION'` và `source_id = deposit_transactions.id`.

---

## 5. Validation Rules

| Trường | Rule |
|---|---|
| amount | Required, > 0, trong hạn mức |
| deposit_method | SANDBOX_BANK / SANDBOX_CARD |
| status | PENDING / SUCCESS / FAILED / CANCELED |
| idempotency_key | Required |
| wallet_id | Ví phải tồn tại và ACTIVE |
| currency | VND |

---

## 6. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| POST | `/api/v1/topups` | Tạo giao dịch nạp tiền | User |
| GET | `/api/v1/topups/me` | User xem lịch sử nạp tiền | User |
| GET | `/api/v1/topups/me/{id}` | User xem chi tiết nạp tiền | User |
| GET | `/api/v1/admin/topups` | Admin xem toàn bộ nạp tiền | Admin |
| GET | `/api/v1/admin/topups/{id}` | Admin xem chi tiết nạp tiền | Admin |
| POST | `/api/v1/admin/topups/{id}/actions/simulate-success` | Admin giả lập thành công nếu cần test | Admin |
| POST | `/api/v1/admin/topups/{id}/actions/simulate-failed` | Admin giả lập thất bại nếu cần test | Admin |

---

## 7. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `deposit_transactions` | Giao dịch nạp tiền |
| `wallets` | Ví nhận tiền |
| `wallet_balances` | Số dư ví |
| `ledger_transactions` | Transaction TOPUP |
| `ledger_entries` | Entry CREDIT user wallet |
| `idempotency_keys` | Chống request trùng |
| `app_settings` | Cấu hình hạn mức |
| `wallet_limits` | Hạn mức nạp theo ví |
| MongoDB `audit_logs` | Audit nghiệp vụ |
| MongoDB `system_logs` | Ghi lỗi xử lý |

---

## 8. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-WALLET | Cộng số dư ví |
| MOD-TRANSACTION | Ghi ledger TOPUP |
| MOD-AUTH | User xác thực trước khi topup |
| MOD-SETTING | Cấu hình hạn mức topup |
| MOD-ADMIN | Tra cứu giao dịch nạp |
| MOD-AUDIT | Ghi audit log |

---

## 9. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | User tạo giao dịch nạp tiền thành công |
| AC-02 | Ví ACTIVE mới được nạp tiền |
| AC-03 | Amount phải lớn hơn 0 |
| AC-04 | Không cho nạp vượt hạn mức |
| AC-05 | Nạp thành công phải cộng số dư ví |
| AC-06 | Nạp thành công phải có ledger transaction |
| AC-07 | Request trùng idempotency key không cộng tiền lần hai |
| AC-08 | User chỉ xem được lịch sử nạp của mình |
| AC-09 | Admin xem được toàn bộ giao dịch nạp |
| AC-10 | Deposit SUCCESS không cho sửa/xóa |
| AC-11 | Nếu ledger lỗi thì không cập nhật số dư |
| AC-12 | Giao dịch thất bại không làm thay đổi số dư ví |

---

## 10. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Nạp tiền có cần OTP/PIN không? | Đề xuất: Không trong MVP | Vì là giả lập |
| O-02 | Có cần system topup account không? | Đề xuất: Có | Giúp ledger cân bằng |
| O-03 | Có cho admin tạo topup hộ user không? | Mở | Nên hạn chế |
| O-04 | Có mô phỏng callback ngân hàng không? | Phase sau | Không bắt buộc |
| O-05 | Hạn mức topup cấu hình ở đâu? | Setting | Dùng app_settings |

---

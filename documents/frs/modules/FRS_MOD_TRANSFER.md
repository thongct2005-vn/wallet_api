# FRS Chi tiết — MOD-TRANSFER: Chuyển tiền giữa ví

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Chuyển tiền cho phép user chuyển tiền từ ví của mình sang ví của user khác trong hệ thống. Đây là một trong các nghiệp vụ quan trọng nhất của ví điện tử vì liên quan trực tiếp đến việc trừ tiền, cộng tiền và đảm bảo không mất tiền.

Module này liên kết với:

- MOD-WALLET: Kiểm tra ví, số dư và trạng thái ví
- MOD-TRANSACTION: Ghi ledger debit/credit
- MOD-AUTH: Xác thực user
- MOD-AUDIT: Ghi audit log
- MOD-SETTING: Cấu hình hạn mức chuyển tiền
- MOD-ADMIN: Tra cứu và xử lý khiếu nại

**Phạm vi chính:**

- Chuyển tiền từ user này sang user khác
- Tìm người nhận theo số điện thoại/mã ví
- Kiểm tra số dư
- Xác nhận chuyển tiền bằng PIN/OTP giả lập nếu có
- Trừ tiền ví gửi, cộng tiền ví nhận
- Ghi transaction và ledger entries
- Chống double transfer bằng idempotency key
- Xem lịch sử chuyển tiền

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| User | Tạo giao dịch chuyển tiền, xem lịch sử chuyển tiền của mình |
| Admin | Xem toàn bộ giao dịch chuyển tiền, tra cứu chi tiết |
| System | Kiểm tra điều kiện, cập nhật balance, ghi ledger |
| Merchant | Không có quyền với module này |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-TRANSFER-01: Tìm người nhận

**Mô tả:**  
User tìm người nhận trước khi chuyển tiền bằng số điện thoại hoặc mã ví.

**Actor:** User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User mở màn hình chuyển tiền |
| 2 | Nhập số điện thoại hoặc mã ví người nhận |
| 3 | Hệ thống tìm user/wallet tương ứng |
| 4 | Hệ thống trả thông tin người nhận đã che một phần |
| 5 | User xác nhận đúng người nhận |

**Thông tin hiển thị:**

| Trường | Mô tả |
|---|---|
| receiver_name | Tên người nhận, có thể che bớt |
| receiver_phone_masked | SĐT đã mask |
| wallet_no_masked | Mã ví đã mask |
| status | Trạng thái có thể nhận tiền hay không |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho chuyển tiền cho chính mình |
| BR-02 | Không hiển thị đầy đủ thông tin nhạy cảm người nhận |
| BR-03 | Chỉ ví ACTIVE mới được nhận tiền |
| BR-04 | Nếu không tìm thấy thì trả RECEIVER_NOT_FOUND |
| BR-05 | Nếu ví nhận bị khóa thì trả RECEIVER_WALLET_NOT_ACTIVE |

---

### FN-TRANSFER-02: Tạo giao dịch chuyển tiền

**Mô tả:**  
User tạo giao dịch chuyển tiền đến ví người nhận. Hệ thống kiểm tra số dư, hạn mức, idempotency và thực hiện debit/credit.

**Actor:** User

**Điều kiện tiên quyết:**

- User đã đăng nhập
- Ví gửi ACTIVE
- Ví nhận ACTIVE
- Số dư ví gửi đủ
- Không vượt hạn mức
- Có idempotency key

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User nhập người nhận |
| 2 | User nhập số tiền |
| 3 | User nhập nội dung chuyển tiền |
| 4 | Hệ thống hiển thị màn hình xác nhận |
| 5 | User xác nhận bằng PIN/OTP nếu có |
| 6 | App gửi request kèm idempotency key |
| 7 | Hệ thống kiểm tra ví gửi và ví nhận |
| 8 | Hệ thống kiểm tra số dư và hạn mức |
| 9 | Tạo wallet transfer trạng thái PENDING |
| 10 | Tạo ledger transaction TRANSFER |
| 11 | Ghi DEBIT ví gửi |
| 12 | Ghi CREDIT ví nhận |
| 13 | Cập nhật số dư 2 ví |
| 14 | Cập nhật transfer = SUCCESS |
| 15 | Ghi audit log |
| 16 | Trả kết quả cho app |

**Input fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| receiver_identifier | String | Có | SĐT hoặc mã ví |
| amount | BIGINT | Có | Số tiền chuyển |
| description | String(255) | Không | Nội dung chuyển tiền |
| pin_or_otp | String | Tùy cấu hình | PIN/OTP xác nhận |
| idempotency_key | String(100) | Có | Chống request trùng |

**Output fields:**

| Trường | Mô tả |
|---|---|
| transfer_id | ID giao dịch chuyển tiền |
| transfer_no | Mã chuyển tiền |
| amount | Số tiền |
| status | SUCCESS / FAILED |
| sender_balance | Số dư ví gửi sau giao dịch |
| receiver_name | Tên người nhận |
| transaction_no | Mã ledger transaction |
| created_at | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho chuyển tiền cho chính mình |
| BR-02 | Amount phải > 0 |
| BR-03 | Ví gửi phải ACTIVE |
| BR-04 | Ví nhận phải ACTIVE |
| BR-05 | Số dư khả dụng của ví gửi phải >= amount |
| BR-06 | Không cho available_balance âm |
| BR-07 | Chuyển tiền phải có đủ DEBIT ví gửi và CREDIT ví nhận |
| BR-08 | Debit và Credit phải trong cùng DB transaction |
| BR-09 | Request trùng idempotency key không được trừ tiền lần hai |
| BR-10 | Nếu bất kỳ bước nào lỗi thì rollback toàn bộ giao dịch |

---

### FN-TRANSFER-03: Xác nhận chuyển tiền bằng PIN/OTP

**Mô tả:**  
Để tăng tính bảo mật, hệ thống có thể yêu cầu user nhập PIN hoặc OTP giả lập trước khi chuyển tiền.

**Actor:** User, System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User click xác nhận chuyển tiền |
| 2 | Hệ thống yêu cầu nhập PIN/OTP |
| 3 | User nhập PIN/OTP |
| 4 | Hệ thống verify PIN/OTP |
| 5 | Nếu đúng, tiếp tục xử lý transfer |
| 6 | Nếu sai, trả lỗi AUTH_CONFIRM_FAILED |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Có thể bật/tắt PIN/OTP trong settings |
| BR-02 | Giao dịch vượt hạn mức nhỏ có thể bắt buộc OTP |
| BR-03 | Sai PIN/OTP quá số lần thì tạm khóa giao dịch |
| BR-04 | Không log PIN/OTP |
| BR-05 | OTP trong đồ án có thể giả lập cố định hoặc sinh random |

---

### FN-TRANSFER-04: Ghi ledger cho chuyển tiền

**Mô tả:**  
Mỗi giao dịch chuyển tiền thành công phải ghi ledger debit/credit đầy đủ.

**Actor:** System

**Ledger entries:**

| Wallet | Entry type | Amount |
|---|---|---:|
| Sender wallet | DEBIT | Số tiền chuyển |
| Receiver wallet | CREDIT | Số tiền chuyển |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Transfer SUCCESS bắt buộc có ledger transaction TRANSFER |
| BR-02 | Ledger transaction phải liên kết với wallet transfer |
| BR-03 | Tổng DEBIT phải bằng tổng CREDIT |
| BR-04 | Balance snapshot của cả 2 ví phải được lưu |
| BR-05 | Ledger entries không cho sửa/xóa |
| BR-06 | Nếu ledger lỗi thì transfer không được SUCCESS |

---

### FN-TRANSFER-05: Xem lịch sử chuyển tiền

**Mô tả:**  
User xem các giao dịch chuyển tiền đã gửi và đã nhận. Admin xem toàn bộ giao dịch chuyển tiền.

**Actor:** User, Admin

**Luồng User:**

| Bước | Hành động |
|---|---|
| 1 | User mở lịch sử chuyển tiền |
| 2 | Hệ thống lấy giao dịch mà user là người gửi hoặc người nhận |
| 3 | User lọc theo thời gian, chiều tiền, trạng thái |
| 4 | Hệ thống trả danh sách giao dịch |

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã chuyển tiền | transfer_no |
| Thời gian | created_at |
| Chiều tiền | Gửi đi / Nhận vào |
| Đối tác | Người gửi hoặc người nhận |
| Số tiền | amount |
| Nội dung | description |
| Trạng thái | PENDING / SUCCESS / FAILED |
| Mã ledger | transaction_no |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Hôm nay / 7 ngày / 30 ngày / Tùy chỉnh |
| Chiều tiền | Tất cả / Gửi đi / Nhận vào |
| Trạng thái | SUCCESS / FAILED |
| Số tiền | Từ — đến |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User xem được giao dịch mình gửi hoặc nhận |
| BR-02 | User không xem được giao dịch của người khác |
| BR-03 | Admin xem được toàn bộ |
| BR-04 | Không cho sửa/xóa lịch sử chuyển tiền |
| BR-05 | Danh sách mặc định mới nhất trước |

---

### FN-TRANSFER-06: Chi tiết chuyển tiền

**Mô tả:**  
Hiển thị chi tiết một giao dịch chuyển tiền.

**Actor:** User, Admin

**Thông tin hiển thị:**

| Section | Nội dung |
|---|---|
| Thông tin giao dịch | Mã giao dịch, trạng thái, số tiền, thời gian |
| Người gửi | Tên, mã ví, số điện thoại masked |
| Người nhận | Tên, mã ví, số điện thoại masked |
| Nội dung | Ghi chú chuyển tiền |
| Ledger | Mã ledger transaction, debit/credit entries |
| Audit | Các event liên quan |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ xem chi tiết nếu là sender hoặc receiver |
| BR-02 | Admin xem toàn bộ chi tiết |
| BR-03 | Không hiển thị thông tin nhạy cảm không cần thiết |
| BR-04 | Chi tiết phải thể hiện rõ giao dịch đã trừ/cộng ví nào |

---

### FN-TRANSFER-07: Hạn mức chuyển tiền

**Mô tả:**  
Hệ thống kiểm tra hạn mức chuyển tiền theo cấu hình.

**Cấu hình đề xuất:**

| Setting | Mô tả | Default đề xuất |
|---|---|---|
| min_transfer_amount | Số tiền chuyển tối thiểu | 1.000 VND |
| max_transfer_amount | Số tiền chuyển tối đa/lần | 10.000.000 VND |
| daily_transfer_limit | Tổng chuyển tối đa/ngày | 50.000.000 VND |
| monthly_transfer_limit | Tổng chuyển tối đa/tháng | 200.000.000 VND |
| require_otp_threshold | Số tiền từ mức này cần OTP | 2.000.000 VND |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Amount nhỏ hơn min thì từ chối |
| BR-02 | Amount lớn hơn max/lần thì từ chối |
| BR-03 | Vượt hạn mức ngày/tháng thì từ chối |
| BR-04 | Vượt ngưỡng OTP thì bắt buộc xác thực bổ sung |
| BR-05 | Hạn mức tính theo ví gửi |

---

## 4. Data Model đề xuất

### 4.1. wallet_transfers

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| transfer_no | String(30) | Có | Mã chuyển tiền |
| sender_user_id | UUID FK | Có | User gửi |
| sender_wallet_id | UUID FK | Có | Ví gửi |
| receiver_user_id | UUID FK | Có | User nhận |
| receiver_wallet_id | UUID FK | Có | Ví nhận |
| amount | BIGINT | Có | Số tiền |
| currency | String(10) | Có | VND |
| description | String(255) | Không | Nội dung |
| status | String(50) | Có | PENDING / SUCCESS / FAILED / CANCELED |
| idempotency_key | String(100) | Có | Chống trùng request |
| failure_reason | Text | Không | Lý do thất bại |
| created_at | Timestamp | Có | Thời gian tạo |
| updated_at | Timestamp | Có | Thời gian cập nhật |
| completed_at | Timestamp | Không | Thời gian hoàn tất |

Ledger liên kết gián tiếp bằng `ledger_transactions.source_type = 'WALLET_TRANSFER'` và `source_id = wallet_transfers.id`.

---

## 5. Validation Rules

| Trường | Rule |
|---|---|
| receiver_identifier | Required |
| amount | Required, > 0, trong hạn mức |
| description | Max 255 ký tự |
| idempotency_key | Required |
| sender_wallet_id | Ví ACTIVE |
| receiver_wallet_id | Ví ACTIVE |
| status | PENDING / SUCCESS / FAILED / CANCELED |

---

## 6. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| GET | `/api/v1/transfers/receivers/lookup` | Tìm người nhận theo SĐT/mã ví | User |
| POST | `/api/v1/transfers` | Tạo giao dịch chuyển tiền | User |
| GET | `/api/v1/transfers/me` | User xem lịch sử chuyển tiền | User |
| GET | `/api/v1/transfers/me/{id}` | User xem chi tiết chuyển tiền | User |
| GET | `/api/v1/admin/transfers` | Admin xem toàn bộ chuyển tiền | Admin |
| GET | `/api/v1/admin/transfers/{id}` | Admin xem chi tiết chuyển tiền | Admin |

---

## 7. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `wallet_transfers` | Giao dịch chuyển tiền |
| `wallets` | Ví gửi và ví nhận |
| `wallet_balances` | Số dư ví |
| `ledger_transactions` | Transaction TRANSFER |
| `ledger_entries` | DEBIT/CREDIT |
| `idempotency_keys` | Chống request trùng |
| `app_settings` | Hạn mức chuyển tiền |
| `wallet_limits` | Hạn mức giao dịch theo ví |
| MongoDB `audit_logs` | Ghi audit nghiệp vụ |
| MongoDB `system_logs` | Ghi lỗi kỹ thuật |

---

## 8. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-WALLET | Kiểm tra ví, cập nhật số dư |
| MOD-TRANSACTION | Ghi ledger TRANSFER |
| MOD-AUTH | User xác thực trước khi chuyển |
| MOD-SETTING | Hạn mức và OTP threshold |
| MOD-ADMIN | Tra cứu chuyển tiền |
| MOD-AUDIT | Ghi audit log |

---

## 9. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | User tìm được người nhận theo SĐT hoặc mã ví |
| AC-02 | Không cho chuyển tiền cho chính mình |
| AC-03 | Không cho chuyển nếu ví gửi hoặc ví nhận bị khóa |
| AC-04 | Không cho chuyển nếu số dư không đủ |
| AC-05 | Không cho chuyển vượt hạn mức |
| AC-06 | Chuyển thành công phải trừ ví gửi và cộng ví nhận |
| AC-07 | Chuyển thành công phải có ledger debit/credit |
| AC-08 | Tổng debit bằng tổng credit |
| AC-09 | Request trùng idempotency key không trừ tiền lần hai |
| AC-10 | User xem được lịch sử gửi/nhận của mình |
| AC-11 | Admin xem được toàn bộ giao dịch chuyển tiền |
| AC-12 | Nếu lỗi bất kỳ bước nào thì rollback toàn bộ |

---

## 10. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Có thu phí chuyển tiền không? | Đề xuất: Không trong MVP | Phase sau có thể thêm fee |
| O-02 | Có cần OTP không? | Đề xuất: Có giả lập | Tăng tính bảo mật |
| O-03 | Có chuyển tiền qua QR cá nhân không? | Phase sau | Không bắt buộc MVP |
| O-04 | Có cho hủy giao dịch chuyển tiền không? | Không | Transfer success không hủy |
| O-05 | Có hoàn tiền transfer không? | Mở | Có thể xử lý bằng giao dịch ngược |

---

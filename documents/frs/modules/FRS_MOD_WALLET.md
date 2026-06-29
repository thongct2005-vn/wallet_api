# FRS Chi tiết — MOD-WALLET: Ví điện tử

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Ví điện tử quản lý ví của người dùng trong hệ thống, bao gồm việc tạo ví, xem thông tin ví, theo dõi số dư realtime, khóa/mở ví, truy vấn biến động số dư và đảm bảo tính toàn vẹn dữ liệu tiền.

Đây là module lõi của hệ thống ví điện tử, được sử dụng trực tiếp bởi các module:

- MOD-TOPUP: Nạp tiền giả lập
- MOD-TRANSFER: Chuyển tiền giữa các ví
- MOD-PAYMENT: Thanh toán cho merchant
- MOD-QR: Thanh toán QR Code
- MOD-TRANSACTION: Ghi nhận ledger debit/credit
- MOD-ADMIN: Quản trị ví người dùng
- MOD-AUDIT: Truy vết thay đổi và giao dịch

**Phạm vi chính:**

- Mỗi user có 1 ví chính duy nhất
- Quản lý số dư khả dụng và số dư bị giữ
- Theo dõi số dư realtime
- Khóa/mở ví theo trạng thái
- Không cho sửa/xóa số dư thủ công
- Mọi thay đổi số dư phải đi qua transaction ledger
- Đảm bảo không mất tiền, không double payment

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| User | Xem ví của bản thân, xem số dư, xem lịch sử biến động |
| Admin | Xem danh sách ví, xem chi tiết ví, khóa/mở ví |
| System | Tự động tạo ví, cập nhật số dư thông qua giao dịch hợp lệ |
| Merchant | Không truy cập trực tiếp ví người dùng |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-WALLET-01: Tạo ví cho người dùng

**Mô tả:**  
Hệ thống tự động tạo ví điện tử cho user sau khi user đăng ký tài khoản thành công hoặc sau khi tài khoản được admin tạo.

**Actor:** System

**Điều kiện tiên quyết:**

- User đã được tạo thành công
- User chưa có ví nào trong hệ thống

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User đăng ký tài khoản hoặc admin tạo user |
| 2 | Hệ thống kiểm tra user đã có ví hay chưa |
| 3 | Nếu chưa có ví, hệ thống tạo ví mặc định |
| 4 | Hệ thống tạo bản ghi số dư ban đầu = 0 |
| 5 | Ghi audit log sự kiện tạo ví |

**Data fields — wallets:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| user_id | UUID FK | Có | User sở hữu ví |
| wallet_no | String(30) | Có | Mã ví tự sinh |
| wallet_type | String(50) | Có | PERSONAL |
| status | String(50) | Có | ACTIVE / LOCKED / CLOSED |
| currency | String(10) | Có | Mặc định VND |
| created_at | Timestamp | Có | Thời gian tạo |
| updated_at | Timestamp | Có | Thời gian cập nhật |

**Data fields — wallet_balances:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| wallet_id | UUID FK | Có | Ví liên kết |
| available_balance | BIGINT | Có | Số dư khả dụng |
| locked_balance | BIGINT | Có | Số dư đang bị giữ |
| updated_at | Timestamp | Có | Thời gian cập nhật số dư |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi user chỉ có 1 ví chính duy nhất |
| BR-02 | Khi tạo ví, `available_balance = 0`, `locked_balance = 0` |
| BR-03 | `wallet_no` phải unique toàn hệ thống |
| BR-04 | Không cho tạo ví thủ công từ phía user |
| BR-05 | Không cho xóa vật lý ví |
| BR-06 | Ví chỉ được tạo nếu user ở trạng thái ACTIVE |
| BR-07 | Ghi audit log khi tạo ví |

---

### FN-WALLET-02: Xem thông tin ví và số dư

**Mô tả:**  
User xem thông tin ví của bản thân, bao gồm mã ví, trạng thái ví, số dư khả dụng, số dư đang bị giữ và đơn vị tiền tệ.

**Actor:** User

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User đăng nhập mobile app |
| 2 | User truy cập màn hình “Ví của tôi” |
| 3 | Hệ thống lấy thông tin ví theo user đang đăng nhập |
| 4 | Hệ thống trả về thông tin ví và số dư hiện tại |
| 5 | Mobile app hiển thị thông tin ví |

**Data response:**

| Trường | Mô tả |
|---|---|
| wallet_id | ID ví |
| wallet_no | Mã ví |
| status | Trạng thái ví |
| currency | Đơn vị tiền tệ |
| available_balance | Số dư khả dụng |
| locked_balance | Số dư bị giữ |
| total_balance | `available_balance + locked_balance` |
| updated_at | Thời điểm cập nhật gần nhất |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ được xem ví của chính mình |
| BR-02 | Admin có quyền xem ví của tất cả user |
| BR-03 | Không trả về dữ liệu ví của user khác |
| BR-04 | Số dư phải được lấy từ `wallet_balances`, không tính trực tiếp từ client |
| BR-05 | Số dư hiển thị realtime theo dữ liệu mới nhất trong database |

---

### FN-WALLET-03: Khóa / mở khóa ví

**Mô tả:**  
Admin có thể khóa ví người dùng khi phát hiện rủi ro, gian lận, tài khoản bị khóa hoặc theo yêu cầu vận hành. Ví bị khóa không được nạp tiền, chuyển tiền hoặc thanh toán.

**Actor:** Admin

**Luồng khóa ví:**

| Bước | Hành động |
|---|---|
| 1 | Admin truy cập chi tiết ví |
| 2 | Click “Khóa ví” |
| 3 | Nhập lý do khóa ví |
| 4 | Hệ thống xác nhận thao tác |
| 5 | Cập nhật trạng thái ví = LOCKED |
| 6 | Revoke hoặc chặn các giao dịch mới của ví |
| 7 | Ghi audit log |

**Luồng mở khóa ví:**

| Bước | Hành động |
|---|---|
| 1 | Admin truy cập ví đang bị khóa |
| 2 | Click “Mở khóa ví” |
| 3 | Nhập ghi chú xử lý |
| 4 | Hệ thống cập nhật trạng thái ví = ACTIVE |
| 5 | Ghi audit log |

**Data fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| status | String(50) | Có | ACTIVE / LOCKED / CLOSED |
| lock_reason | Text | Có khi khóa | Lý do khóa ví |
| locked_at | Timestamp | Không | Thời gian khóa |
| locked_by | UUID FK | Không | Admin khóa ví |
| unlocked_at | Timestamp | Không | Thời gian mở khóa |
| unlocked_by | UUID FK | Không | Admin mở khóa |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ Admin được khóa/mở khóa ví |
| BR-02 | Ví LOCKED không được thực hiện topup, transfer, payment |
| BR-03 | Ví LOCKED vẫn được xem lịch sử giao dịch |
| BR-04 | Ví CLOSED không được mở lại nếu đã đóng vĩnh viễn |
| BR-05 | Mọi thay đổi trạng thái ví phải ghi audit log |
| BR-06 | Không tự động thay đổi số dư khi khóa/mở khóa ví |

---

### FN-WALLET-04: Theo dõi biến động số dư

**Mô tả:**  
User và Admin có thể xem lịch sử biến động số dư ví. Dữ liệu được lấy từ ledger, không lấy từ bảng balance trực tiếp.

**Actor:** User, Admin

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User mở màn hình lịch sử ví |
| 2 | Hệ thống truy vấn ledger entries theo wallet_id |
| 3 | User lọc theo thời gian, loại giao dịch, trạng thái |
| 4 | Hệ thống trả về danh sách biến động |
| 5 | User xem chi tiết từng giao dịch |

**Bộ lọc:**

| Bộ lọc | Kiểu | Options |
|---|---|---|
| Thời gian | DatePicker | Từ ngày — đến ngày |
| Loại giao dịch | Select | TOPUP / TRANSFER / PAYMENT / REFUND |
| Chiều tiền | Select | Tiền vào / Tiền ra |
| Trạng thái | Select | PENDING / SUCCESS / FAILED / CANCELED |

**Data fields hiển thị:**

| Cột | Mô tả |
|---|---|
| Thời gian | Thời gian phát sinh |
| Mã giao dịch | Mã transaction |
| Loại giao dịch | Nạp tiền / Chuyển tiền / Thanh toán / Hoàn tiền |
| Chiều tiền | Debit / Credit |
| Số tiền | Số tiền giao dịch |
| Số dư sau giao dịch | Balance snapshot sau khi ghi ledger |
| Nội dung | Diễn giải giao dịch |
| Trạng thái | Trạng thái giao dịch |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Lịch sử biến động không cho sửa/xóa |
| BR-02 | User chỉ xem được biến động ví của mình |
| BR-03 | Admin xem được biến động của tất cả ví |
| BR-04 | Dữ liệu lịch sử phải lấy từ ledger transaction/ledger entries |
| BR-05 | Mỗi biến động phải liên kết được với nghiệp vụ gốc: topup, transfer, payment hoặc refund |

---

### FN-WALLET-05: Quản lý số dư an toàn

**Mô tả:**  
Hệ thống phải đảm bảo mọi thay đổi số dư ví chỉ diễn ra thông qua giao dịch hợp lệ và được bảo vệ bằng database transaction.

**Actor:** System

**Nguyên tắc xử lý:**

| Nguyên tắc | Mô tả |
|---|---|
| Atomicity | Debit và Credit phải cùng thành công hoặc cùng rollback |
| Consistency | Tổng tiền ledger phải khớp với biến động balance |
| Isolation | Giao dịch đồng thời không làm sai số dư |
| Durability | Giao dịch thành công phải được lưu bền vững |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không cho cập nhật số dư trực tiếp từ API client |
| BR-02 | Mọi thay đổi số dư phải chạy trong database transaction |
| BR-03 | Khi trừ tiền phải lock row `wallet_balances` bằng `FOR UPDATE` hoặc cơ chế tương đương |
| BR-04 | Không cho `available_balance < 0` |
| BR-05 | Không cho `locked_balance < 0` |
| BR-06 | Ledger transaction thành công phải có ít nhất 2 ledger entries nếu là giao dịch chuyển tiền/thanh toán |
| BR-07 | Tổng Debit phải bằng tổng Credit trong cùng một ledger transaction |
| BR-08 | Nếu bất kỳ bước nào lỗi, toàn bộ transaction phải rollback |
| BR-09 | Cần sử dụng idempotency key cho các nghiệp vụ nhạy cảm: topup, transfer, payment |

---

### FN-WALLET-06: Kiểm tra điều kiện sử dụng ví

**Mô tả:**  
Trước khi thực hiện các nghiệp vụ topup, transfer hoặc payment, hệ thống phải kiểm tra trạng thái ví và số dư.

**Actor:** System

**Điều kiện kiểm tra:**

| Điều kiện | Áp dụng cho | Xử lý nếu không đạt |
|---|---|---|
| Ví tồn tại | Tất cả giao dịch | Trả lỗi WALLET_NOT_FOUND |
| Ví ACTIVE | Topup, Transfer, Payment | Trả lỗi WALLET_NOT_ACTIVE |
| Số dư đủ | Transfer, Payment | Trả lỗi INSUFFICIENT_BALANCE |
| Không vượt hạn mức | Transfer, Payment | Trả lỗi LIMIT_EXCEEDED |
| Request không trùng | Topup, Transfer, Payment | Trả kết quả cũ theo idempotency key |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Không xử lý giao dịch nếu ví không ACTIVE |
| BR-02 | Không xử lý thanh toán nếu số dư khả dụng không đủ |
| BR-03 | Cần validate idempotency key trước khi tạo giao dịch mới |
| BR-04 | Các lỗi kiểm tra điều kiện phải được ghi system log hoặc audit log tùy mức độ |
| BR-05 | Không tiết lộ thông tin ví của người khác trong thông báo lỗi |

---

### FN-WALLET-07: Admin xem danh sách ví

**Mô tả:**  
Admin Web cung cấp màn hình quản lý danh sách ví người dùng, hỗ trợ tìm kiếm, lọc, xem chi tiết và khóa/mở khóa ví.

**Actor:** Admin

**Data fields bảng danh sách:**

| Cột | Mô tả |
|---|---|
| Mã ví | wallet_no |
| Người dùng | Họ tên / SĐT / Email |
| Số dư khả dụng | available_balance |
| Số dư bị giữ | locked_balance |
| Trạng thái | ACTIVE / LOCKED / CLOSED |
| Ngày tạo | created_at |
| Cập nhật gần nhất | updated_at |

**Bộ lọc:**

| Bộ lọc | Kiểu | Options |
|---|---|---|
| Từ khóa | Search | Mã ví, tên user, email, SĐT |
| Trạng thái ví | Select | Tất cả / ACTIVE / LOCKED / CLOSED |
| Khoảng số dư | Number range | Từ — đến |
| Thời gian tạo | DatePicker | Từ ngày — đến ngày |

**Actions:**

- Xem chi tiết ví
- Khóa ví
- Mở khóa ví
- Xem lịch sử giao dịch
- Xuất file danh sách ví

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ Admin được xem danh sách ví toàn hệ thống |
| BR-02 | Không cho Admin sửa trực tiếp số dư ví |
| BR-03 | Các thao tác khóa/mở khóa phải có lý do |
| BR-04 | Xuất file theo bộ lọc hiện tại |
| BR-05 | Mọi thao tác quản trị ví phải ghi audit log |

---

## 4. Validation Rules

| Trường | Rule |
|---|---|
| wallet_no | Required, unique, max 30 ký tự |
| currency | Required, default VND |
| available_balance | Required, >= 0 |
| locked_balance | Required, >= 0 |
| status | ACTIVE / LOCKED / CLOSED |
| lock_reason | Required khi khóa ví |
| amount | Số nguyên dương, đơn vị VND |

---

## 5. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| GET | `/api/v1/wallets/me` | Xem ví của user hiện tại | User |
| GET | `/api/v1/wallets/me/balance` | Xem số dư ví hiện tại | User |
| GET | `/api/v1/wallets/me/statement` | Xem biến động số dư ví | User |
| GET | `/api/v1/admin/wallets` | Admin xem danh sách ví | Admin |
| GET | `/api/v1/admin/wallets/{id}` | Admin xem chi tiết ví | Admin |
| POST | `/api/v1/admin/wallets/{id}/actions/lock` | Khóa ví | Admin |
| POST | `/api/v1/admin/wallets/{id}/actions/unlock` | Mở khóa ví | Admin |

---

## 6. Mapping Database đề xuất

| Nghiệp vụ | Bảng chính | Ghi chú |
|---|---|---|
| Thông tin ví | `wallets` | Lưu ví của user |
| Số dư ví | `wallet_balances` | Không cập nhật trực tiếp từ client |
| Biến động số dư | `ledger_transactions`, `ledger_entries` | Nguồn dữ liệu chính để truy vết |
| Chống double request | `idempotency_keys` | Dùng cho topup, transfer, payment |
| Audit | MongoDB `audit_logs` | Ghi thao tác tạo, khóa, mở khóa ví |

---

## 7. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-AUTH | User đăng ký thành công → tạo ví |
| MOD-TOPUP | Nạp tiền → tăng số dư ví |
| MOD-TRANSFER | Chuyển tiền → trừ ví nguồn, cộng ví nhận |
| MOD-PAYMENT | Thanh toán merchant → trừ ví user |
| MOD-TRANSACTION | Ghi ledger debit/credit |
| MOD-ADMIN | Admin quản lý ví |
| MOD-AUDIT | Ghi audit log thao tác ví |

---

## 8. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | User đăng ký thành công thì có ví mặc định |
| AC-02 | Mỗi user chỉ có 1 ví chính |
| AC-03 | User xem được số dư ví của chính mình |
| AC-04 | User không xem được ví của user khác |
| AC-05 | Admin xem được danh sách ví |
| AC-06 | Admin khóa/mở khóa ví thành công và bắt buộc nhập lý do |
| AC-07 | Ví bị khóa không thể chuyển tiền hoặc thanh toán |
| AC-08 | Không thể cập nhật số dư trực tiếp từ API client |
| AC-09 | Số dư không được âm |
| AC-10 | Mọi biến động số dư phải có ledger tương ứng |
| AC-11 | Mọi thao tác tạo/khóa/mở ví phải có audit log |
| AC-12 | Các giao dịch nhạy cảm phải hỗ trợ idempotency key |

---

## 9. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Có hỗ trợ nhiều ví trên 1 user không? | Đề xuất: Không trong MVP | Mỗi user 1 ví duy nhất |
| O-02 | Có hỗ trợ nhiều loại tiền tệ không? | Đề xuất: Không trong MVP | Chỉ VND |
| O-03 | Có cho phép ví âm không? | Đề xuất: Không | Payment wallet không nên âm |
| O-04 | Có dùng locked balance khi thanh toán không? | Mở | MVP có thể trừ trực tiếp; bản nâng cao dùng hold/confirm |
| O-05 | Có đóng ví vĩnh viễn không? | Mở | Nếu có, cần rule xử lý số dư còn lại |

---

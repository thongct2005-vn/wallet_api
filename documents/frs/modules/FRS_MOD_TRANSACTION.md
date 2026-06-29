# FRS Chi tiết — MOD-TRANSACTION: Giao dịch & Ledger

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Giao dịch & Ledger quản lý toàn bộ giao dịch phát sinh trong hệ thống ví điện tử và cổng thanh toán. Đây là module lõi đảm bảo tính đúng đắn của tiền thông qua mô hình ledger debit/credit.

Module này không đại diện cho một màn hình đơn lẻ, mà là tầng nghiệp vụ nền dùng chung bởi:

- MOD-WALLET: Cập nhật và truy vết số dư ví
- MOD-TOPUP: Nạp tiền giả lập
- MOD-TRANSFER: Chuyển tiền giữa các ví
- MOD-PAYMENT-GATEWAY: Thanh toán cho merchant
- MOD-QR-PAYMENT: Thanh toán qua QR Code
- MOD-REFUND: Hoàn tiền
- MOD-ADMIN: Tra cứu và đối soát giao dịch
- MOD-AUDIT: Ghi nhận log nghiệp vụ quan trọng

**Phạm vi chính:**

- Quản lý giao dịch ledger tổng
- Ghi nhận các bút toán debit/credit
- Đảm bảo tổng debit = tổng credit
- Lưu số dư sau giao dịch
- Không cho sửa/xóa giao dịch đã thành công
- Chống double transaction bằng idempotency key
- Hỗ trợ truy vết toàn bộ dòng tiền

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| User | Xem lịch sử giao dịch ví của bản thân |
| Admin | Xem toàn bộ giao dịch, tra cứu chi tiết, đối soát |
| System | Tạo transaction, ghi ledger entries, rollback khi lỗi |
| Merchant | Xem trạng thái giao dịch liên quan đến payment của mình |

---

## 3. Khái niệm nghiệp vụ

### 3.1. Ledger Transaction

Ledger transaction là bản ghi đại diện cho một giao dịch tiền ở cấp nghiệp vụ, ví dụ:

- Nạp tiền vào ví
- Chuyển tiền giữa 2 user
- Thanh toán đơn hàng merchant
- Hoàn tiền thanh toán
- Điều chỉnh kỹ thuật nếu có sai lệch

Một ledger transaction có thể có nhiều ledger entries.

### 3.2. Ledger Entry

Ledger entry là dòng bút toán chi tiết thể hiện tiền vào hoặc tiền ra của một ví/tài khoản.

| Entry type | Ý nghĩa |
|---|---|
| DEBIT | Tiền đi ra khỏi ví/tài khoản |
| CREDIT | Tiền đi vào ví/tài khoản |

### 3.3. Nguyên tắc cân bằng

Với các giao dịch thực tế như chuyển tiền hoặc thanh toán, tổng tiền debit phải bằng tổng tiền credit trong cùng một ledger transaction.

Ví dụ chuyển tiền 100.000đ từ user A sang user B:

| Ví | Entry type | Amount |
|---|---|---:|
| Ví user A | DEBIT | 100.000 |
| Ví user B | CREDIT | 100.000 |

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-TXN-01: Tạo ledger transaction

**Mô tả:**  
Hệ thống tạo transaction tổng cho mỗi nghiệp vụ phát sinh tiền: topup, transfer, payment, refund hoặc adjustment.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Module nghiệp vụ gửi yêu cầu tạo giao dịch |
| 2 | Hệ thống kiểm tra idempotency key |
| 3 | Hệ thống tạo ledger transaction ở trạng thái PENDING |
| 4 | Hệ thống ghi các ledger entries liên quan |
| 5 | Hệ thống kiểm tra cân bằng debit/credit |
| 6 | Nếu hợp lệ, cập nhật số dư ví/tài khoản |
| 7 | Cập nhật transaction status = SUCCESS |
| 8 | Ghi audit log và trả kết quả cho module gọi |

**Data fields — ledger_transactions:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| transaction_no | String(30) | Có | Mã giao dịch tự sinh |
| transaction_type | String(50) | Có | TOPUP / TRANSFER / PAYMENT / REFUND / WITHDRAWAL / ADJUSTMENT |
| status | String(50) | Có | PENDING / SUCCESS / FAILED / CANCELED |
| amount | BIGINT | Có | Tổng số tiền giao dịch |
| currency | String(10) | Có | Mặc định VND |
| source_type | String(50) | Có | Loại nghiệp vụ gốc |
| source_id | UUID | Có | ID nghiệp vụ gốc |
| idempotency_key | String(100) | Không | Key chống xử lý trùng |
| description | Text | Không | Nội dung giao dịch |
| created_by | UUID FK | Không | User/System tạo |
| created_at | Timestamp | Có | Thời gian tạo |
| completed_at | Timestamp | Không | Thời gian hoàn tất |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi nghiệp vụ phát sinh tiền phải có ledger transaction |
| BR-02 | `transaction_no` phải unique toàn hệ thống |
| BR-03 | Giao dịch mới luôn bắt đầu với trạng thái PENDING |
| BR-04 | Chỉ chuyển sang SUCCESS sau khi ghi ledger entries và cập nhật balance thành công |
| BR-05 | Nếu lỗi ở bất kỳ bước nào, toàn bộ DB transaction phải rollback |
| BR-06 | Không cho sửa/xóa transaction đã SUCCESS |
| BR-07 | Mọi giao dịch nhạy cảm phải có idempotency key |

---

### FN-TXN-02: Ghi ledger entries

**Mô tả:**  
Hệ thống ghi các dòng debit/credit tương ứng với transaction tổng.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Nhận danh sách entry từ nghiệp vụ gọi |
| 2 | Kiểm tra ví/tài khoản liên quan có tồn tại |
| 3 | Kiểm tra entry type hợp lệ |
| 4 | Kiểm tra amount > 0 |
| 5 | Ghi ledger entries |
| 6 | Lưu balance snapshot sau giao dịch |

**Data fields — ledger_entries:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| ledger_transaction_id | UUID FK | Có | Giao dịch tổng |
| wallet_id | UUID FK | Không | Ví user nếu entry thuộc ví |
| merchant_id | UUID FK | Không | Merchant nếu entry thuộc merchant |
| account_type | String(50) | Có | USER_WALLET / MERCHANT_BALANCE / SYSTEM_ACCOUNT |
| entry_type | String(50) | Có | DEBIT / CREDIT |
| amount | BIGINT | Có | Số tiền |
| balance_before | BIGINT | Có | Số dư trước giao dịch |
| balance_after | BIGINT | Có | Số dư sau giao dịch |
| description | Text | Không | Nội dung entry |
| created_at | Timestamp | Có | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Mỗi entry phải thuộc về một wallet, merchant balance hoặc system account |
| BR-02 | `amount` phải > 0 |
| BR-03 | `entry_type` chỉ nhận DEBIT hoặc CREDIT |
| BR-04 | Không cho sửa/xóa ledger entry |
| BR-05 | Balance snapshot phải được lưu tại thời điểm giao dịch |
| BR-06 | Nếu là DEBIT từ ví user, số dư khả dụng phải đủ |
| BR-07 | Cần lock balance row trước khi cập nhật số dư |

---

### FN-TXN-03: Kiểm tra cân bằng debit/credit

**Mô tả:**  
Hệ thống kiểm tra tổng debit và tổng credit trong cùng một ledger transaction trước khi xác nhận giao dịch thành công.

**Actor:** System

**Công thức:**

```text
SUM(DEBIT.amount) = SUM(CREDIT.amount)
```

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Sau khi chuẩn bị ledger entries, hệ thống tính tổng DEBIT |
| 2 | Hệ thống tính tổng CREDIT |
| 3 | So sánh tổng DEBIT và tổng CREDIT |
| 4 | Nếu bằng nhau, tiếp tục cập nhật balance |
| 5 | Nếu không bằng nhau, rollback transaction và ghi system log |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Giao dịch TRANSFER, PAYMENT, REFUND bắt buộc phải cân bằng debit/credit |
| BR-02 | Giao dịch TOPUP giả lập có thể dùng SYSTEM_ACCOUNT làm entry đối ứng |
| BR-03 | Không cho SUCCESS nếu tổng debit khác tổng credit |
| BR-04 | Sai lệch ledger là lỗi nghiêm trọng, phải ghi system log mức ERROR |
| BR-05 | Admin có thể chạy đối soát để phát hiện transaction mất cân bằng |

---

### FN-TXN-04: Cập nhật số dư ví/tài khoản

**Mô tả:**  
Hệ thống cập nhật số dư ví hoặc số dư merchant dựa trên ledger entries.

**Actor:** System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Lock dòng balance cần cập nhật |
| 2 | Với entry DEBIT: giảm available_balance |
| 3 | Với entry CREDIT: tăng available_balance |
| 4 | Kiểm tra balance không âm |
| 5 | Lưu balance mới |
| 6 | Lưu balance_before và balance_after vào ledger entry |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Cập nhật balance phải nằm trong cùng DB transaction với ledger |
| BR-02 | Không cho `available_balance < 0` |
| BR-03 | Không cho `locked_balance < 0` |
| BR-04 | Balance chỉ được cập nhật bởi service nghiệp vụ nội bộ |
| BR-05 | API client không được truyền `balance_after` |
| BR-06 | Nếu cập nhật balance lỗi thì rollback toàn bộ giao dịch |

---

### FN-TXN-05: Xem lịch sử giao dịch

**Mô tả:**  
User xem lịch sử giao dịch ví của bản thân. Admin xem toàn bộ giao dịch trong hệ thống.

**Actor:** User, Admin

**Luồng User:**

| Bước | Hành động |
|---|---|
| 1 | User vào màn hình “Lịch sử giao dịch” |
| 2 | Hệ thống lấy ledger entries liên quan đến ví của user |
| 3 | User lọc theo thời gian, loại giao dịch, trạng thái |
| 4 | Hệ thống trả về danh sách giao dịch |

**Luồng Admin:**

| Bước | Hành động |
|---|---|
| 1 | Admin vào màn hình quản lý giao dịch |
| 2 | Hệ thống hiển thị toàn bộ ledger transactions |
| 3 | Admin tìm kiếm theo mã giao dịch, user, merchant, payment order |
| 4 | Admin xem chi tiết transaction và ledger entries |

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã giao dịch | transaction_no |
| Thời gian | created_at |
| Loại | transaction_type |
| Chiều tiền | Debit/Credit theo ví đang xem |
| Số tiền | amount |
| Nội dung | description |
| Trạng thái | status |
| Đối tượng liên quan | User/Merchant/Payment order |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Hôm nay / 7 ngày / 30 ngày / Tùy chỉnh |
| Loại giao dịch | TOPUP / TRANSFER / PAYMENT / REFUND |
| Trạng thái | PENDING / SUCCESS / FAILED / CANCELED |
| Số tiền | Từ — đến |
| Đối tượng | User / Merchant / Wallet / Payment order |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ xem được giao dịch liên quan đến ví của mình |
| BR-02 | Admin xem được toàn bộ giao dịch |
| BR-03 | Merchant chỉ xem được payment transaction liên quan đến merchant của mình |
| BR-04 | Không cho sửa/xóa lịch sử giao dịch |
| BR-05 | Danh sách mặc định sắp xếp mới nhất trước |

---

### FN-TXN-06: Chi tiết giao dịch

**Mô tả:**  
Hiển thị đầy đủ thông tin một giao dịch, bao gồm transaction tổng, ledger entries và nghiệp vụ gốc.

**Actor:** User, Admin, Merchant

**Thông tin hiển thị:**

| Section | Nội dung |
|---|---|
| Thông tin giao dịch | Mã giao dịch, loại, trạng thái, số tiền, thời gian |
| Nghiệp vụ gốc | Topup / Transfer / Payment / Refund |
| Ledger entries | Danh sách debit/credit |
| Balance snapshot | Số dư trước/sau |
| Audit trail | Các sự kiện liên quan |
| Technical metadata | Idempotency key, trace_id, request_id |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ xem chi tiết nếu giao dịch liên quan ví của mình |
| BR-02 | Merchant chỉ xem chi tiết nếu giao dịch thuộc payment của merchant |
| BR-03 | Admin xem được toàn bộ chi tiết |
| BR-04 | Không hiển thị thông tin nhạy cảm như API secret, token |
| BR-05 | Chi tiết giao dịch phải truy vết được đến nghiệp vụ gốc |

---

### FN-TXN-07: Idempotency cho giao dịch

**Mô tả:**  
Hệ thống chống xử lý trùng với các request nhạy cảm như nạp tiền, chuyển tiền, thanh toán.

**Actor:** System

**Các nghiệp vụ bắt buộc dùng idempotency key:**

| Nghiệp vụ | Endpoint ví dụ |
|---|---|
| Topup | `POST /api/v1/topups` |
| Transfer | `POST /api/v1/transfers` |
| Payment confirm | `POST /api/v1/payments/{id}/confirm` |
| Refund | `POST /api/v1/refunds` |
| Merchant create payment | `POST /api/v1/merchant/payments` |

**Data fields — idempotency_keys:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| actor_type | String(50) | Có | USER / MERCHANT / ADMIN / SYSTEM |
| actor_id | UUID | Có | ID actor |
| idempotency_key | String(100) | Có | Key client gửi |
| request_hash | String(255) | Có | Hash payload request |
| request_path | String(255) | Có | API path |
| resource_type | String(50) | Không | Loại resource được tạo |
| resource_id | UUID | Không | ID resource |
| response_status_code | INT | Không | HTTP status trả về |
| response_body | JSONB | Không | Response đã trả |
| status | String(50) | Có | PROCESSING / COMPLETED / FAILED |
| expired_at | Timestamp | Có | Thời điểm hết hạn |
| created_at | Timestamp | Có | Thời gian tạo |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Idempotency key unique theo actor |
| BR-02 | Nếu cùng key và cùng request_hash → trả lại response cũ |
| BR-03 | Nếu cùng key nhưng request_hash khác → trả lỗi IDEMPOTENCY_CONFLICT |
| BR-04 | Key đang PROCESSING thì request sau phải chờ hoặc trả lỗi REQUEST_PROCESSING |
| BR-05 | Idempotency key nên hết hạn sau 24 giờ hoặc theo cấu hình |
| BR-06 | Không được tạo giao dịch mới nếu idempotency key đã COMPLETED |

---

### FN-TXN-08: Đối soát ledger

**Mô tả:**  
Admin có thể chạy kiểm tra đối soát để phát hiện sai lệch giữa balance hiện tại và ledger entries.

**Actor:** Admin, System

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Admin vào màn hình đối soát giao dịch |
| 2 | Chọn khoảng thời gian hoặc ví cần kiểm tra |
| 3 | Hệ thống tính lại số dư dựa trên ledger |
| 4 | So sánh với `wallet_balances` |
| 5 | Hiển thị danh sách sai lệch nếu có |
| 6 | Ghi audit log kết quả đối soát |

**Các kiểm tra:**

| Kiểm tra | Mô tả |
|---|---|
| Debit/Credit balance | Tổng debit = tổng credit |
| Wallet balance consistency | Số dư hiện tại khớp với ledger |
| Duplicate success payment | Một payment order không có nhiều giao dịch SUCCESS |
| Negative balance | Không có ví âm |
| Orphan entries | Không có ledger entry thiếu transaction cha |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Đối soát không tự động sửa dữ liệu |
| BR-02 | Nếu phát hiện sai lệch, ghi system log mức CRITICAL |
| BR-03 | Chỉ Admin được xem kết quả đối soát |
| BR-04 | Không cho chạy đối soát quá thường xuyên nếu ảnh hưởng hiệu năng |
| BR-05 | Có thể chạy job đối soát định kỳ theo ngày |

---

## 5. Validation Rules

| Trường | Rule |
|---|---|
| transaction_no | Required, unique |
| transaction_type | TOPUP / TRANSFER / PAYMENT / REFUND / ADJUSTMENT |
| status | PENDING / SUCCESS / FAILED / CANCELED |
| amount | Required, > 0 |
| currency | Required, default VND |
| entry_type | DEBIT / CREDIT |
| balance_before | Required, >= 0 |
| balance_after | Required, >= 0 |
| idempotency_key | Required với nghiệp vụ nhạy cảm |

---

## 6. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| GET | `/api/v1/transactions/me` | User xem lịch sử giao dịch của mình | User |
| GET | `/api/v1/transactions/me/{id}` | User xem chi tiết giao dịch của mình | User |
| GET | `/api/v1/admin/transactions` | Admin xem toàn bộ giao dịch | Admin |
| GET | `/api/v1/admin/transactions/{id}` | Admin xem chi tiết giao dịch | Admin |
| GET | `/api/v1/admin/ledger-entries` | Admin tra cứu ledger entries | Admin |
| POST | `/api/v1/admin/transactions/reconcile` | Chạy đối soát ledger | Admin |
| GET | `/api/v1/merchant/transactions` | Merchant xem giao dịch payment của mình | Merchant |

---

## 7. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `ledger_transactions` | Giao dịch tổng |
| `ledger_entries` | Dòng debit/credit chi tiết |
| `wallet_balances` | Số dư ví hiện tại |
| `merchant_balances` | Số dư merchant nếu có |
| `idempotency_keys` | Chống request trùng |
| MongoDB `audit_logs` | Ghi thao tác nghiệp vụ |
| MongoDB `system_logs` | Ghi lỗi kỹ thuật, sai lệch ledger |
| `code_sequences` | Sinh mã giao dịch |

Các bảng nghiệp vụ không lưu `ledger_transaction_id`. Liên kết từ ledger về nghiệp vụ sử dụng `ledger_transactions.source_type` và `source_id`; riêng `ledger_entries.ledger_transaction_id` vẫn là khóa ngoại bắt buộc tới ledger transaction.

---

## 8. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-WALLET | Cập nhật số dư ví dựa trên ledger |
| MOD-TOPUP | Tạo transaction TOPUP |
| MOD-TRANSFER | Tạo transaction TRANSFER |
| MOD-PAYMENT-GATEWAY | Tạo transaction PAYMENT |
| MOD-REFUND | Tạo transaction REFUND |
| MOD-AUDIT | Ghi audit log |
| MOD-ADMIN | Tra cứu, đối soát giao dịch |

---

## 9. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Mọi giao dịch tiền đều có ledger transaction |
| AC-02 | Giao dịch chuyển tiền/thanh toán có đủ debit và credit |
| AC-03 | Tổng debit bằng tổng credit trong cùng transaction |
| AC-04 | Không thể tạo giao dịch thành công nếu số dư không đủ |
| AC-05 | Không có ví âm sau giao dịch |
| AC-06 | Request trùng idempotency key không tạo giao dịch mới |
| AC-07 | User chỉ xem được giao dịch của chính mình |
| AC-08 | Admin xem được toàn bộ giao dịch |
| AC-09 | Giao dịch SUCCESS không cho sửa/xóa |
| AC-10 | Có thể truy vết giao dịch đến nghiệp vụ gốc |
| AC-11 | Đối soát phát hiện được giao dịch mất cân bằng |
| AC-12 | Lỗi trong quá trình xử lý phải rollback toàn bộ transaction |

---

## 10. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | TOPUP giả lập có cần system account đối ứng không? | Đề xuất: Có | Giúp ledger cân bằng |
| O-02 | Có cần locked balance/hold tiền không? | Mở | Bản nâng cao nên có |
| O-03 | Có cần adjustment thủ công không? | Đề xuất: Không trong MVP | Tránh rủi ro sửa tiền |
| O-04 | Thời hạn idempotency key bao lâu? | Đề xuất: 24h | Có thể đưa vào settings |
| O-05 | Có cần settlement cho merchant không? | Mở | Nếu làm sâu payment gateway |

---

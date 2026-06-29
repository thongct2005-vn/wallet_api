# FRS Chi tiết — MOD-REFUND: Hoàn tiền

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Refund quản lý nghiệp vụ hoàn tiền cho các giao dịch thanh toán merchant đã thành công. Refund được sử dụng khi merchant cần hoàn lại tiền cho user do hủy đơn, giao hàng lỗi, sai số tiền hoặc các tình huống chăm sóc khách hàng.

Trong MVP, refund có thể được thực hiện bởi Merchant hoặc Admin tùy quyền. Refund phải đảm bảo an toàn số dư, không hoàn vượt số tiền đã thanh toán và phải ghi ledger debit/credit rõ ràng.

**Phạm vi chính:**

- Tạo yêu cầu hoàn tiền từ payment đã PAID
- Hoàn tiền toàn phần hoặc một phần
- Kiểm tra số tiền đã hoàn trước đó
- Trừ merchant balance hoặc system holding account
- Cộng tiền lại ví user
- Ghi ledger transaction REFUND
- Cập nhật trạng thái refund
- Gửi webhook REFUND_SUCCESS/REFUND_FAILED cho merchant nếu cần
- Tra cứu lịch sử refund

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Merchant Owner | Tạo refund cho payment của merchant mình |
| Merchant Staff | Xem refund, tạo refund nếu được cấp quyền |
| Admin | Tạo refund, duyệt refund, xem toàn bộ refund |
| User | Xem refund liên quan đến ví của mình |
| System | Kiểm tra điều kiện, cập nhật balance, ghi ledger, gửi webhook |

---

## 3. Khái niệm nghiệp vụ

### 3.1. Full Refund

Hoàn lại toàn bộ số tiền của payment đã thanh toán.

### 3.2. Partial Refund

Hoàn lại một phần số tiền của payment. Một payment có thể được hoàn nhiều lần, nhưng tổng tiền hoàn không được vượt số tiền đã thanh toán.

### 3.3. Refund Ledger

Refund là giao dịch ngược với payment:

| Account | Entry type | Amount |
|---|---|---:|
| Merchant balance / System account | DEBIT | Số tiền hoàn |
| User wallet | CREDIT | Số tiền hoàn |

---

## 4. Yêu cầu chức năng chi tiết

---

### FN-REFUND-01: Tạo yêu cầu hoàn tiền

**Mô tả:**  
Merchant hoặc Admin tạo yêu cầu hoàn tiền cho một payment order đã thanh toán thành công.

**Actor:** Merchant Owner, Admin

**Điều kiện tiên quyết:**

- Payment order tồn tại
- Payment order thuộc merchant đang thao tác, nếu actor là Merchant
- Payment order có status = PAID
- Số tiền refund hợp lệ
- Tổng số tiền refund không vượt số tiền payment
- Có idempotency key

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Actor mở chi tiết payment đã PAID |
| 2 | Click “Hoàn tiền” |
| 3 | Nhập số tiền hoàn và lý do |
| 4 | Hệ thống kiểm tra số tiền đã hoàn trước đó |
| 5 | Hệ thống kiểm tra số tiền còn có thể hoàn |
| 6 | Hệ thống kiểm tra merchant balance/system account |
| 7 | Tạo refund transaction trạng thái PENDING |
| 8 | Tạo ledger transaction REFUND |
| 9 | Trừ merchant balance/system account |
| 10 | Cộng tiền lại ví user |
| 11 | Cập nhật refund = SUCCESS |
| 12 | Cập nhật payment refund status |
| 13 | Tạo webhook REFUND_SUCCESS nếu cấu hình |
| 14 | Ghi audit log |
| 15 | Trả kết quả |

**Input fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| payment_order_id | UUID | Có | Payment cần hoàn |
| amount | BIGINT | Có | Số tiền hoàn |
| description | String(500) | Có | Lý do/nội dung hoàn tiền |
| idempotency_key | String(100) | Có | Chống request trùng |

**Output fields:**

| Trường | Mô tả |
|---|---|
| refund_id | ID refund |
| refund_no | Mã refund |
| payment_no | Mã payment gốc |
| amount | Số tiền hoàn |
| status | PENDING / SUCCESS / FAILED |
| transaction_no | Mã ledger transaction |
| refunded_at | Thời điểm hoàn tiền |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ payment PAID mới được refund |
| BR-02 | Không refund payment EXPIRED/CANCELED/FAILED |
| BR-03 | Amount refund phải > 0 |
| BR-04 | Tổng refund amount của payment không vượt payment amount |
| BR-05 | Refund phải dùng idempotency key |
| BR-06 | Request trùng idempotency key không được hoàn tiền lần hai |
| BR-07 | Refund SUCCESS không cho sửa/xóa |
| BR-08 | Refund phải ghi ledger REFUND |
| BR-09 | Nếu ledger lỗi thì refund không được SUCCESS |
| BR-10 | Refund thành công phải cập nhật ví user trong cùng DB transaction |

---

### FN-REFUND-02: Kiểm tra số tiền còn có thể hoàn

**Mô tả:**  
Hệ thống tính số tiền còn có thể hoàn của một payment.

**Actor:** System

**Công thức:**

```text
refundable_amount = payment_amount - SUM(success_refund_amount)
```

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ tính refund status SUCCESS vào tổng đã hoàn |
| BR-02 | Refund PENDING có thể được giữ riêng tùy thiết kế |
| BR-03 | Nếu refundable_amount = 0 thì không cho tạo refund mới |
| BR-04 | Partial refund cho phép nhiều lần |
| BR-05 | Full refund sau khi hoàn đủ thì payment refund_status = FULLY_REFUNDED |

---

### FN-REFUND-03: Xử lý full refund

**Mô tả:**  
Hoàn toàn bộ số tiền còn lại của payment.

**Actor:** Merchant Owner, Admin

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | Actor chọn “Hoàn toàn bộ” |
| 2 | Hệ thống tự điền amount = refundable_amount |
| 3 | Actor nhập lý do |
| 4 | Hệ thống xử lý refund |
| 5 | Payment refund_status = FULLY_REFUNDED |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Full refund chỉ hợp lệ khi amount = refundable_amount |
| BR-02 | Sau full refund, không cho tạo refund thêm |
| BR-03 | Payment vẫn giữ status PAID nhưng refund_status = FULLY_REFUNDED |
| BR-04 | Full refund phải tạo webhook nếu merchant cấu hình nhận refund event |

---

### FN-REFUND-04: Xử lý partial refund

**Mô tả:**  
Hoàn một phần số tiền của payment.

**Actor:** Merchant Owner, Admin

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Partial refund amount < refundable_amount |
| BR-02 | Payment refund_status = PARTIALLY_REFUNDED |
| BR-03 | Cho phép nhiều partial refund cho cùng payment |
| BR-04 | Tổng partial refund không vượt payment amount |
| BR-05 | Mỗi partial refund phải có lý do riêng |

---

### FN-REFUND-05: Ghi ledger refund

**Mô tả:**  
Refund thành công phải ghi ledger để thể hiện tiền đi ngược từ merchant/system về user.

**Actor:** System

**Ledger entries đề xuất:**

| Account | Entry type | Amount |
|---|---|---:|
| Merchant balance / System holding account | DEBIT | Số tiền hoàn |
| User wallet | CREDIT | Số tiền hoàn |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Refund SUCCESS bắt buộc có ledger transaction REFUND |
| BR-02 | Tổng DEBIT phải bằng tổng CREDIT |
| BR-03 | Balance snapshot phải lưu trước/sau giao dịch |
| BR-04 | Không cho merchant balance âm nếu dùng merchant balance |
| BR-05 | Nếu dùng system holding account, phải ghi rõ source account |
| BR-06 | Ledger entries không cho sửa/xóa |

---

### FN-REFUND-06: Xem lịch sử refund

**Mô tả:**  
Merchant, Admin và User xem lịch sử hoàn tiền theo phạm vi quyền.

**Actor:** Merchant, Admin, User

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã refund | refund_no |
| Mã payment | payment_no |
| Merchant | merchant_name |
| User nhận hoàn | user masked |
| Số tiền | amount |
| Trạng thái | PENDING / SUCCESS / FAILED |
| Lý do | description |
| Thời gian | created_at |
| Hoàn tất lúc | refunded_at |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | User chỉ xem refund liên quan ví của mình |
| BR-02 | Merchant chỉ xem refund của payment thuộc merchant mình |
| BR-03 | Admin xem toàn bộ refund |
| BR-04 | Refund history không cho sửa/xóa |
| BR-05 | Danh sách mặc định mới nhất trước |

---

### FN-REFUND-07: Webhook refund

**Mô tả:**  
Hệ thống gửi webhook cho merchant khi refund thành công/thất bại nếu merchant có cấu hình nhận refund event.

**Actor:** System, Merchant

**Event đề xuất:**

| Event | Khi nào gửi |
|---|---|
| REFUND_SUCCESS | Refund thành công |
| REFUND_FAILED | Refund thất bại cuối cùng |

**Payload chính:**

| Trường | Mô tả |
|---|---|
| event_type | REFUND_SUCCESS |
| refund_id | ID refund |
| refund_no | Mã refund |
| payment_order_id | Payment gốc |
| merchant_order_id | Mã đơn merchant |
| amount | Số tiền hoàn |
| status | SUCCESS |
| refunded_at | Thời điểm hoàn |
| transaction_no | Ledger transaction |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Webhook refund phải ký signature |
| BR-02 | Webhook lỗi không rollback refund |
| BR-03 | Lưu request/response callback |
| BR-04 | Có retry theo cấu hình webhook |
| BR-05 | Merchant xử lý webhook refund idempotent theo event_id |

---

## 5. Data Model đề xuất

### 5.1. refund_transactions

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| refund_no | String(30) | Có | Mã refund |
| payment_order_id | UUID FK | Có | Payment gốc |
| payment_transaction_id | UUID FK | Không | Payment transaction gốc |
| merchant_id | UUID FK | Có | Merchant liên quan |
| user_id | UUID FK | Có | User nhận tiền hoàn |
| wallet_id | UUID FK | Có | Ví nhận tiền hoàn |
| amount | BIGINT | Có | Số tiền hoàn |
| currency | String(10) | Có | VND |
| description | String(500) | Có | Lý do/nội dung hoàn |
| status | String(50) | Có | PENDING / SUCCESS / FAILED / CANCELED |
| idempotency_key | String(100) | Có | Chống trùng |
| failure_reason | Text | Không | Lý do thất bại |
| created_by | UUID FK | Có | Người tạo |
| created_at | Timestamp | Có | Thời gian tạo |
| updated_at | Timestamp | Có | Thời gian cập nhật |
| refunded_at | Timestamp | Không | Thời gian thành công |

Ledger liên kết gián tiếp bằng `ledger_transactions.source_type = 'REFUND_TRANSACTION'` và `source_id = refund_transactions.id`.

### 5.2. payment_orders bổ sung

| Trường | Kiểu dữ liệu | Mô tả |
|---|---|---|
| refund_status | String(50) | NONE / PARTIALLY_REFUNDED / FULLY_REFUNDED |
| refunded_amount | BIGINT | Tổng tiền đã hoàn |

---

## 6. Validation Rules

| Trường | Rule |
|---|---|
| payment_order_id | Required, payment phải PAID |
| amount | Required, > 0, <= refundable_amount |
| description | Required, max 500 |
| idempotency_key | Required |
| status | PENDING / SUCCESS / FAILED / CANCELED |
| currency | VND |

---

## 7. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| POST | `/api/v1/merchant/refunds` | Merchant tạo refund | Merchant |
| GET | `/api/v1/merchant/refunds` | Merchant xem danh sách refund | Merchant |
| GET | `/api/v1/merchant/refunds/{id}` | Merchant xem chi tiết refund | Merchant |
| GET | `/api/v1/refunds/me` | User xem refund của mình | User |
| GET | `/api/v1/admin/refunds` | Admin xem toàn bộ refund | Admin |
| GET | `/api/v1/admin/refunds/{id}` | Admin xem chi tiết refund | Admin |
| POST | `/api/v1/admin/refunds` | Admin tạo refund | Admin |

---

## 8. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `refund_transactions` | Giao dịch hoàn tiền |
| `payment_orders` | Payment gốc |
| `payment_transactions` | Transaction payment gốc |
| `wallets`, `wallet_balances` | Ví user nhận hoàn |
| `merchant_balances` | Nguồn tiền merchant nếu có |
| `ledger_transactions` | Ledger REFUND |
| `ledger_entries` | Debit merchant/system, credit user |
| `idempotency_keys` | Chống double refund |
| `outbox_events` | Sự kiện webhook refund chờ xử lý |
| MongoDB `webhook_attempt_logs` | Lịch sử gửi/retry webhook |
| MongoDB `audit_logs` | Audit |
| MongoDB `system_logs` | Lỗi xử lý refund |

---

## 9. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-PAYMENT-GATEWAY | Refund dựa trên payment PAID |
| MOD-WALLET | Cộng tiền lại ví user |
| MOD-TRANSACTION | Ghi ledger REFUND |
| MOD-MERCHANT | Merchant tạo refund |
| MOD-WEBHOOK | Gửi webhook refund |
| MOD-ADMIN | Admin tra cứu/tạo refund |
| MOD-AUDIT | Ghi audit log |

---

## 10. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Chỉ payment PAID mới refund được |
| AC-02 | Không refund vượt số tiền payment |
| AC-03 | Cho phép partial refund nhiều lần |
| AC-04 | Full refund cập nhật refund_status = FULLY_REFUNDED |
| AC-05 | Refund thành công cộng tiền lại ví user |
| AC-06 | Refund thành công có ledger REFUND |
| AC-07 | Tổng debit bằng tổng credit |
| AC-08 | Request trùng idempotency key không hoàn tiền lần hai |
| AC-09 | Merchant chỉ refund payment của mình |
| AC-10 | Admin xem được toàn bộ refund |
| AC-11 | Webhook refund lỗi không rollback refund |
| AC-12 | Refund SUCCESS không cho sửa/xóa |

---

## 11. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Refund có cần Admin duyệt không? | Mở | MVP có thể không cần |
| O-02 | Nguồn tiền refund lấy từ merchant balance hay system account? | Mở | Nên thống nhất DB |
| O-03 | Có refund fee không? | Không trong MVP | Phase sau |
| O-04 | Có deadline refund không? | Mở | Ví dụ chỉ refund trong 30 ngày |
| O-05 | Có cho user yêu cầu refund không? | Phase sau | MVP merchant/admin tạo |

---

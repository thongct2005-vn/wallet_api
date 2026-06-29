# FRS Chi tiết — MOD-REPORT: Báo cáo & Đối soát

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Report cung cấp các báo cáo tổng hợp và chi tiết phục vụ quản trị hệ thống ví điện tử/cổng thanh toán, merchant portal và đối soát giao dịch. Khác với Dashboard tập trung hiển thị nhanh, Report tập trung vào dữ liệu chi tiết, có bộ lọc, có xuất file và phục vụ kiểm tra nghiệp vụ.

**Phạm vi chính:**

- Báo cáo giao dịch ví
- Báo cáo topup
- Báo cáo transfer
- Báo cáo payment merchant
- Báo cáo refund
- Báo cáo merchant
- Báo cáo callback/webhook
- Báo cáo ledger/đối soát
- Báo cáo lỗi hệ thống
- Xuất Excel/PDF nếu cần

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Admin | Xem và xuất toàn bộ báo cáo |
| Super Admin | Xem toàn bộ báo cáo, chạy đối soát nâng cao |
| Merchant Owner | Xem báo cáo payment/refund/callback của merchant mình |
| Merchant Staff | Xem báo cáo theo quyền |
| Support Staff | Xem báo cáo read-only nếu được cấp quyền |
| User | Không truy cập module báo cáo admin/merchant |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-RPT-01: Báo cáo giao dịch ví tổng hợp

**Mô tả:**  
Tổng hợp toàn bộ giao dịch tiền trong hệ thống theo loại: TOPUP, TRANSFER, PAYMENT, REFUND.

**Actor:** Admin

**Data fields:**

| Cột | Mô tả |
|---|---|
| Ngày | Ngày thống kê |
| Tổng giao dịch | COUNT ledger_transactions |
| Topup thành công | COUNT/SUM TOPUP SUCCESS |
| Transfer thành công | COUNT/SUM TRANSFER SUCCESS |
| Payment thành công | COUNT/SUM PAYMENT SUCCESS |
| Refund thành công | COUNT/SUM REFUND SUCCESS |
| Giao dịch thất bại | COUNT FAILED |
| Tổng giá trị | SUM amount SUCCESS |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Từ ngày — đến ngày |
| Loại giao dịch | TOPUP / TRANSFER / PAYMENT / REFUND |
| Trạng thái | SUCCESS / FAILED / PENDING |
| Group by | Ngày / Tuần / Tháng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ giao dịch SUCCESS được tính vào tổng giá trị thành công |
| BR-02 | FAILED/PENDING tính riêng |
| BR-03 | Báo cáo phải lấy dữ liệu từ ledger_transactions |
| BR-04 | Cho phép xuất file theo bộ lọc |
| BR-05 | Dữ liệu mặc định sắp xếp theo ngày mới nhất |

---

### FN-RPT-02: Báo cáo nạp tiền

**Mô tả:**  
Thống kê giao dịch nạp tiền giả lập của user.

**Actor:** Admin

**Data fields:**

| Cột | Mô tả |
|---|---|
| Mã nạp tiền | deposit_no |
| User | Người nạp |
| Ví | wallet_no |
| Số tiền | amount |
| Phương thức | method |
| Trạng thái | SUCCESS / FAILED / PENDING |
| Mã ledger | transaction_no |
| Thời gian | created_at |

**Summary:**

| Chỉ số | Mô tả |
|---|---|
| Tổng số giao dịch | COUNT |
| Tổng tiền nạp thành công | SUM SUCCESS |
| Số giao dịch thất bại | COUNT FAILED |
| Tỷ lệ thành công | SUCCESS / tổng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ topup SUCCESS cộng vào tổng tiền nạp |
| BR-02 | Admin xem toàn bộ |
| BR-03 | Có thể lọc theo user, ví, trạng thái, thời gian |
| BR-04 | Xuất file theo bộ lọc hiện tại |

---

### FN-RPT-03: Báo cáo chuyển tiền

**Mô tả:**  
Thống kê các giao dịch chuyển tiền giữa user.

**Actor:** Admin

**Data fields:**

| Cột | Mô tả |
|---|---|
| Mã chuyển tiền | transfer_no |
| Người gửi | sender_user |
| Ví gửi | sender_wallet |
| Người nhận | receiver_user |
| Ví nhận | receiver_wallet |
| Số tiền | amount |
| Trạng thái | SUCCESS / FAILED |
| Thời gian | created_at |

**Summary:**

| Chỉ số | Mô tả |
|---|---|
| Tổng số transfer | COUNT |
| Tổng tiền chuyển thành công | SUM SUCCESS |
| Số transfer lỗi | COUNT FAILED |
| User gửi nhiều nhất | Top sender |
| User nhận nhiều nhất | Top receiver |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ transfer SUCCESS tính vào tổng tiền |
| BR-02 | Không hiển thị đầy đủ dữ liệu nhạy cảm nếu export cho support |
| BR-03 | Có thể lọc theo sender, receiver, số tiền, trạng thái |
| BR-04 | Báo cáo phải truy vết được ledger transaction |

---

### FN-RPT-04: Báo cáo payment merchant

**Mô tả:**  
Thống kê các payment order và doanh số merchant.

**Actor:** Admin, Merchant Owner

**Data fields:**

| Cột | Mô tả |
|---|---|
| Mã payment | payment_no |
| Merchant | merchant_name |
| Mã đơn merchant | merchant_order_id |
| Số tiền | amount |
| Trạng thái | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| User thanh toán | masked user |
| Thời gian tạo | created_at |
| Thời gian thanh toán | paid_at |
| Callback status | SUCCESS / FAILED / RETRYING |

**Summary:**

| Chỉ số | Mô tả |
|---|---|
| Tổng payment | COUNT |
| Tổng payment PAID | COUNT PAID |
| Tổng doanh số | SUM amount PAID |
| Payment expired | COUNT EXPIRED |
| Payment failed | COUNT FAILED |
| Success rate | PAID / tổng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem payment của mình |
| BR-02 | Admin xem toàn bộ merchant |
| BR-03 | Tổng doanh số chỉ tính PAID |
| BR-04 | Không hiển thị thông tin ví user nhạy cảm cho merchant |
| BR-05 | Có export file theo bộ lọc |

---

### FN-RPT-05: Báo cáo refund

**Mô tả:**  
Thống kê các giao dịch hoàn tiền.

**Actor:** Admin, Merchant Owner

**Data fields:**

| Cột | Mô tả |
|---|---|
| Mã refund | refund_no |
| Payment gốc | payment_no |
| Merchant | merchant_name |
| User nhận hoàn | masked user |
| Số tiền hoàn | amount |
| Trạng thái | SUCCESS / FAILED / PENDING |
| Lý do | description |
| Thời gian | created_at |
| Hoàn tất lúc | refunded_at |

**Summary:**

| Chỉ số | Mô tả |
|---|---|
| Tổng refund | COUNT |
| Tổng tiền hoàn thành công | SUM SUCCESS |
| Refund failed | COUNT FAILED |
| Refund rate | Tổng refund / tổng payment paid |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem refund của merchant mình |
| BR-02 | Refund SUCCESS mới tính vào tổng tiền hoàn |
| BR-03 | Có lọc theo payment, merchant, status, thời gian |
| BR-04 | Có export file |

---

### FN-RPT-06: Báo cáo merchant

**Mô tả:**  
Thống kê hiệu quả và tình trạng tích hợp của merchant.

**Actor:** Admin

**Data fields:**

| Cột | Mô tả |
|---|---|
| Mã merchant | merchant_code |
| Tên merchant | merchant_name |
| Trạng thái | ACTIVE / SUSPENDED |
| Số payment | COUNT payment |
| Payment PAID | COUNT PAID |
| Tổng doanh số | SUM PAID amount |
| Refund amount | SUM refund SUCCESS |
| Callback failed | COUNT callback FAILED |
| Success rate | PAID / tổng |
| Ngày tạo | created_at |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant bị suspend vẫn hiển thị trong báo cáo lịch sử |
| BR-02 | Tổng doanh số = payment PAID - refund SUCCESS nếu xem net revenue |
| BR-03 | Cho phép sort theo doanh số, success rate, callback failed |
| BR-04 | Click merchant mở chi tiết merchant |

---

### FN-RPT-07: Báo cáo callback/webhook

**Mô tả:**  
Thống kê tình trạng gửi callback về merchant.

**Actor:** Admin, Merchant Owner

**Data fields:**

| Cột | Mô tả |
|---|---|
| Event ID | event_id |
| Merchant | merchant_name |
| Payment | payment_no |
| Event type | PAYMENT_SUCCESS / REFUND_SUCCESS / PAYMENT_EXPIRED |
| Callback URL | callback_url |
| Trạng thái | SUCCESS / FAILED / RETRYING |
| Retry count | retry_count |
| HTTP status | response_status |
| Last error | last_error |
| Thời gian gửi | sent_at |

**Summary:**

| Chỉ số | Mô tả |
|---|---|
| Tổng callback | COUNT |
| Callback success | COUNT SUCCESS |
| Callback failed | COUNT FAILED |
| Callback retrying | COUNT RETRYING |
| Callback success rate | SUCCESS / tổng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem callback của mình |
| BR-02 | Admin xem toàn bộ |
| BR-03 | Callback failed cần link sang màn retry |
| BR-04 | Không hiển thị webhook secret |
| BR-05 | Có export file |

---

### FN-RPT-08: Báo cáo ledger & đối soát

**Mô tả:**  
Báo cáo phục vụ đối soát tính đúng đắn của ledger, số dư ví và payment.

**Actor:** Admin, Super Admin

**Các kiểm tra:**

| Kiểm tra | Mô tả |
|---|---|
| Debit/Credit balance | Tổng DEBIT = tổng CREDIT |
| Wallet balance consistency | Balance hiện tại khớp ledger |
| Duplicate payment success | Một payment không có nhiều SUCCESS |
| Negative balance | Không có ví âm |
| Orphan ledger entries | Không có entry mất transaction cha |
| Missing ledger | Payment/transfer/refund SUCCESS phải có ledger |

**Data fields kết quả:**

| Cột | Mô tả |
|---|---|
| Check type | Loại kiểm tra |
| Entity | Đối tượng lỗi |
| Severity | WARNING / ERROR / CRITICAL |
| Description | Mô tả lỗi |
| Detected at | Thời điểm phát hiện |
| Status | Open / Reviewed |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Báo cáo đối soát không tự sửa dữ liệu |
| BR-02 | Sai lệch debit/credit là CRITICAL |
| BR-03 | Có thể chạy đối soát theo khoảng thời gian |
| BR-04 | Kết quả đối soát phải ghi system log |
| BR-05 | Chỉ Admin/Super Admin được chạy đối soát |

---

### FN-RPT-09: Xuất file báo cáo

**Mô tả:**  
Tất cả báo cáo hỗ trợ xuất file theo bộ lọc hiện tại.

**Format đề xuất:**

- Excel `.xlsx`
- PDF nếu cần trình bày báo cáo tổng hợp

**File name:**

```text
[ReportName]_[FromDate]_[ToDate].xlsx
```

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Xuất file theo bộ lọc hiện tại |
| BR-02 | File lớn cần xử lý async/job nếu vượt giới hạn |
| BR-03 | Export phải ghi audit log |
| BR-04 | Không export secret/token/API secret |
| BR-05 | Dữ liệu nhạy cảm cần mask nếu role không đủ quyền |

---

## 4. API đề xuất

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/reports/wallet-transactions` | Báo cáo giao dịch ví |
| GET | `/api/v1/admin/reports/topups` | Báo cáo nạp tiền |
| GET | `/api/v1/admin/reports/transfers` | Báo cáo chuyển tiền |
| GET | `/api/v1/admin/reports/payments` | Báo cáo payment |
| GET | `/api/v1/admin/reports/refunds` | Báo cáo refund |
| GET | `/api/v1/admin/reports/merchants` | Báo cáo merchant |
| GET | `/api/v1/admin/reports/webhooks` | Báo cáo webhook |
| POST | `/api/v1/admin/reports/ledger-reconciliation` | Chạy đối soát ledger |
| GET | `/api/v1/merchant/reports/payments` | Merchant xem payment report |
| GET | `/api/v1/merchant/reports/refunds` | Merchant xem refund report |
| GET | `/api/v1/merchant/reports/webhooks` | Merchant xem webhook report |
| POST | `/api/v1/admin/reports/{report_code}/export` | Export báo cáo |

---

## 5. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `ledger_transactions` | Báo cáo giao dịch tổng |
| `ledger_entries` | Đối soát debit/credit |
| `deposit_transactions` | Báo cáo topup |
| `wallet_transfers` | Báo cáo transfer |
| `payment_orders` | Báo cáo payment |
| `payment_transactions` | Payment transaction |
| `refund_transactions` | Báo cáo refund |
| `merchants` | Báo cáo merchant |
| `outbox_events` | Báo cáo backlog sự kiện webhook |
| MongoDB `webhook_attempt_logs` | Báo cáo kết quả gửi/retry webhook |
| `wallet_balances` | Đối soát số dư |
| MongoDB `audit_logs` | Audit export/chạy đối soát |
| MongoDB `system_logs` | Lỗi đối soát |

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Admin xem được báo cáo giao dịch ví |
| AC-02 | Admin xem được báo cáo topup/transfer/payment/refund |
| AC-03 | Merchant chỉ xem được báo cáo của mình |
| AC-04 | Tổng doanh số payment chỉ tính payment PAID |
| AC-05 | Tổng refund chỉ tính refund SUCCESS |
| AC-06 | Báo cáo callback hiển thị callback failed/retrying |
| AC-07 | Đối soát phát hiện ledger mất cân bằng |
| AC-08 | Export file theo đúng bộ lọc hiện tại |
| AC-09 | Export không chứa secret/token/API secret |
| AC-10 | Chạy đối soát ghi system log/audit log |
| AC-11 | Dữ liệu báo cáo có phân trang |
| AC-12 | Bộ lọc thời gian hoạt động đúng |

---

## 7. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Report có cần realtime không? | Không | Dashboard xử lý realtime |
| O-02 | Export PDF có cần không? | Mở | Excel đủ cho MVP |
| O-03 | Đối soát có lưu lịch sử kết quả không? | Đề xuất: Có | Có thể thêm reconciliation_runs |
| O-04 | Có report settlement merchant không? | Phase sau | Nếu làm settlement |
| O-05 | Có phân quyền export theo role không? | Đề xuất: Có | Support có thể bị mask dữ liệu |

---

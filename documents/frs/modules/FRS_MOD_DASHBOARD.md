# FRS Chi tiết — MOD-DASHBOARD: Dashboard hệ thống

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Dashboard cung cấp màn hình tổng quan cho Admin và Merchant để theo dõi tình hình giao dịch, thanh toán, ví, lỗi hệ thống và hiệu suất callback. Dashboard chỉ đọc dữ liệu tổng hợp, không trực tiếp tạo hay thay đổi giao dịch tiền.

**Phạm vi chính:**

- Dashboard hệ thống cho Admin
- Dashboard merchant
- KPI giao dịch
- Biểu đồ giao dịch theo thời gian
- Tỷ lệ thành công/thất bại
- Error rate
- Tổng tiền giao dịch
- Top merchant
- Callback/webhook status
- Hoạt động gần đây

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Admin | Xem dashboard toàn hệ thống |
| Super Admin | Xem dashboard toàn hệ thống và cấu hình chỉ số |
| Merchant Owner | Xem dashboard merchant của mình |
| Merchant Staff | Xem dashboard merchant theo quyền |
| User | Không truy cập dashboard admin/merchant |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-DASH-01: KPI tổng quan hệ thống

**Mô tả:**  
Admin xem các chỉ số chính của toàn hệ thống trong ngày hoặc theo khoảng thời gian lọc.

**KPI cards:**

| KPI | Cách tính |
|---|---|
| Tổng số user | COUNT(users WHERE role = USER) |
| Tổng số ví active | COUNT(wallets WHERE status = ACTIVE) |
| Tổng số merchant | COUNT(merchants) |
| Payment thành công | COUNT(payment_orders WHERE status = PAID) |
| Tổng tiền payment | SUM(payment_orders.amount WHERE status = PAID) |
| Transfer thành công | COUNT(wallet_transfers WHERE status = SUCCESS) |
| Tổng tiền transfer | SUM(wallet_transfers.amount WHERE status = SUCCESS) |
| Topup thành công | SUM(deposit_transactions.amount WHERE status = SUCCESS) |
| Error rate | Số giao dịch lỗi / tổng giao dịch |
| Callback failed | COUNT MongoDB webhook_attempt_logs WHERE status = FAILED |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Hôm nay / Hôm qua / 7 ngày / 30 ngày / Tháng này / Tùy chỉnh |
| Merchant | Tất cả / chọn merchant |
| Loại giao dịch | Topup / Transfer / Payment |
| Trạng thái | SUCCESS / FAILED / PENDING |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Dashboard admin hiển thị dữ liệu toàn hệ thống |
| BR-02 | Dữ liệu mặc định là hôm nay |
| BR-03 | Số liệu phải tính từ DB/server, không tính ở client |
| BR-04 | Không hiển thị thông tin nhạy cảm như API secret |
| BR-05 | KPI có thể cache ngắn hạn để tối ưu hiệu năng |

---

### FN-DASH-02: Biểu đồ giao dịch theo thời gian

**Mô tả:**  
Hiển thị xu hướng số lượng và giá trị giao dịch theo thời gian.

**Loại biểu đồ:**

- Line chart số lượng giao dịch
- Bar chart tổng giá trị giao dịch
- Stacked chart theo loại giao dịch

**Dữ liệu:**

| Series | Mô tả |
|---|---|
| Topup | Nạp tiền thành công |
| Transfer | Chuyển tiền thành công |
| Payment | Thanh toán merchant thành công |
| Failed | Giao dịch lỗi |

**Group by:**

| Option | Mô tả |
|---|---|
| Hour | Theo giờ, dùng cho ngày hiện tại |
| Day | Theo ngày |
| Week | Theo tuần |
| Month | Theo tháng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Biểu đồ mặc định hiển thị 30 ngày gần nhất |
| BR-02 | Chỉ tính giao dịch SUCCESS vào tổng tiền thành công |
| BR-03 | Failed transaction được tính riêng |
| BR-04 | Click điểm biểu đồ có thể mở danh sách giao dịch tương ứng |
| BR-05 | Dữ liệu biểu đồ hỗ trợ export nếu cần |

---

### FN-DASH-03: Tỷ lệ thành công/thất bại

**Mô tả:**  
Admin xem tỷ lệ thành công và thất bại của các giao dịch quan trọng.

**Chỉ số:**

| Chỉ số | Công thức |
|---|---|
| Payment success rate | PAID payment / tổng payment |
| Transfer success rate | SUCCESS transfer / tổng transfer |
| Topup success rate | SUCCESS topup / tổng topup |
| Callback success rate | SUCCESS callback / tổng callback |
| Error rate | FAILED transaction / tổng transaction |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Tỷ lệ phải hiển thị theo % |
| BR-02 | Cho phép lọc theo thời gian |
| BR-03 | Error rate cao cần cảnh báo màu nổi bật |
| BR-04 | Callback failed phải link sang danh sách webhook lỗi |
| BR-05 | Không tính PENDING quá mới vào failed rate nếu chưa timeout |

---

### FN-DASH-04: Top merchant theo doanh số

**Mô tả:**  
Admin xem danh sách merchant có tổng giá trị thanh toán cao nhất.

**Data fields:**

| Cột | Mô tả |
|---|---|
| Rank | Thứ hạng |
| Merchant | Tên merchant |
| Số payment | COUNT payment PAID |
| Tổng doanh số | SUM amount PAID |
| Callback failed | Số callback lỗi |
| Tỷ lệ thành công | Payment success rate |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | 7 ngày / 30 ngày / Tháng này / Tùy chỉnh |
| Trạng thái merchant | ACTIVE / SUSPENDED |
| Top N | 5 / 10 / 20 |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ tính payment PAID vào tổng doanh số |
| BR-02 | Merchant bị suspend vẫn có thể hiển thị trong lịch sử |
| BR-03 | Click merchant mở chi tiết merchant |
| BR-04 | Mặc định hiển thị top 10 |

---

### FN-DASH-05: Dashboard merchant

**Mô tả:**  
Merchant Owner xem dashboard riêng của merchant mình, gồm doanh số, số payment, payment pending, callback lỗi và trạng thái tích hợp.

**KPI merchant:**

| KPI | Cách tính |
|---|---|
| Tổng payment hôm nay | COUNT payment của merchant |
| Payment thành công | COUNT status PAID |
| Tổng doanh số | SUM amount status PAID |
| Payment pending | COUNT status PENDING |
| Payment expired | COUNT status EXPIRED |
| Callback failed | COUNT callback FAILED |
| Success rate | PAID / tổng payment |
| API key active | COUNT API key ACTIVE |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem dữ liệu của chính mình |
| BR-02 | Merchant không xem được dữ liệu merchant khác |
| BR-03 | Không hiển thị dữ liệu ví user nhạy cảm |
| BR-04 | Callback failed link sang webhook log của merchant |
| BR-05 | Dashboard merchant hỗ trợ filter thời gian |

---

### FN-DASH-06: Hoạt động gần đây

**Mô tả:**  
Hiển thị timeline các hoạt động mới nhất trên hệ thống.

**Loại hoạt động:**

| Loại | Mô tả |
|---|---|
| User register | User mới đăng ký |
| Wallet created | Ví mới được tạo |
| Topup success | Nạp tiền thành công |
| Transfer success | Chuyển tiền thành công |
| Payment success | Thanh toán thành công |
| Merchant created | Merchant mới đăng ký |
| Merchant approved | Merchant được duyệt |
| Webhook failed | Callback lỗi |
| API key created | Merchant tạo API key |
| Wallet locked | Ví bị khóa |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Timeline lấy từ MongoDB `audit_logs` hoặc aggregate event |
| BR-02 | Admin xem toàn hệ thống |
| BR-03 | Merchant chỉ xem hoạt động liên quan merchant mình |
| BR-04 | Không hiển thị dữ liệu nhạy cảm |
| BR-05 | Mặc định hiển thị 20 hoạt động gần nhất |

---

### FN-DASH-07: Cảnh báo hệ thống

**Mô tả:**  
Hiển thị các cảnh báo vận hành cần xử lý.

**Cảnh báo đề xuất:**

| Cảnh báo | Điều kiện |
|---|---|
| Callback failed nhiều | Callback FAILED > ngưỡng |
| Payment pending quá hạn | PENDING quá expired_at |
| Ledger lệch | Đối soát phát hiện debit != credit |
| Error rate cao | Error rate vượt ngưỡng |
| Merchant suspended | Merchant vừa bị tạm ngưng |
| API signature failed nhiều | Merchant có nhiều request sai signature |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Cảnh báo nghiêm trọng hiển thị nổi bật |
| BR-02 | Click cảnh báo mở màn hình chi tiết |
| BR-03 | Ledger lệch là cảnh báo CRITICAL |
| BR-04 | Có thể cấu hình ngưỡng cảnh báo trong Setting |
| BR-05 | Cảnh báo đã xử lý có thể đánh dấu read/resolved nếu có module notification |

---

## 4. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard/kpis` | KPI tổng quan admin | Admin |
| GET | `/api/v1/admin/dashboard/transactions-chart` | Biểu đồ giao dịch | Admin |
| GET | `/api/v1/admin/dashboard/success-rate` | Tỷ lệ thành công/thất bại | Admin |
| GET | `/api/v1/admin/dashboard/top-merchants` | Top merchant | Admin |
| GET | `/api/v1/admin/dashboard/recent-activities` | Hoạt động gần đây | Admin |
| GET | `/api/v1/admin/dashboard/alerts` | Cảnh báo hệ thống | Admin |
| GET | `/api/v1/merchant/dashboard/kpis` | KPI merchant | Merchant |
| GET | `/api/v1/merchant/dashboard/chart` | Biểu đồ merchant | Merchant |
| GET | `/api/v1/merchant/dashboard/recent-activities` | Hoạt động merchant | Merchant |

---

## 5. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `users` | Tổng user |
| `wallets`, `wallet_balances` | Tổng ví/số dư |
| `deposit_transactions` | KPI topup |
| `wallet_transfers` | KPI transfer |
| `payment_orders` | KPI payment |
| `payment_transactions` | Tỷ lệ thanh toán |
| `merchants` | Merchant stats |
| `outbox_events` | Sự kiện callback đang chờ xử lý |
| MongoDB `webhook_attempt_logs` | Callback stats |
| `ledger_transactions` | Thống kê giao dịch |
| MongoDB `audit_logs` | Hoạt động gần đây |
| MongoDB `system_logs` | Cảnh báo lỗi |

---

## 6. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Admin xem được KPI tổng quan |
| AC-02 | Dashboard mặc định hiển thị dữ liệu hôm nay |
| AC-03 | Biểu đồ giao dịch lọc được theo thời gian |
| AC-04 | Payment success rate tính đúng |
| AC-05 | Callback failed link sang webhook log |
| AC-06 | Top merchant chỉ tính payment PAID |
| AC-07 | Merchant chỉ xem được dashboard của chính mình |
| AC-08 | Recent activities không hiển thị dữ liệu nhạy cảm |
| AC-09 | Cảnh báo ledger lệch hiển thị CRITICAL |
| AC-10 | Dashboard không làm thay đổi dữ liệu nghiệp vụ |

---

## 7. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Dashboard có realtime WebSocket không? | Phase sau | MVP có thể refresh định kỳ |
| O-02 | Có cache KPI không? | Đề xuất: Có | Cache ngắn 30-60s |
| O-03 | Có xuất báo cáo từ dashboard không? | Mở | Có thể để Report module |
| O-04 | Cảnh báo có cần notification riêng không? | Phase sau | MVP hiển thị trên dashboard |
| O-05 | Có phân quyền Support Staff xem dashboard không? | Mở | Có thể chỉ read-only |

---

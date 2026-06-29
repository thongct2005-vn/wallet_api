# FRS Chi tiết — MOD-MERCHANT: Quản lý Merchant

> Phiên bản: 1.0 | Ngày: 08/06/2026 | Thuộc: FRS — Xây dựng Ví điện tử và Cổng thanh toán

---

## 1. Tổng quan module

Module Merchant quản lý các đơn vị bán hàng/doanh nghiệp tích hợp cổng thanh toán vào hệ thống ví điện tử. Merchant có thể được admin tạo hoặc tự đăng ký tùy phạm vi triển khai. Sau khi được duyệt, merchant được cấp API Key/Secret để gọi API tạo thanh toán, nhận QR/payment URL và nhận callback/webhook kết quả giao dịch.

Module này là nền tảng cho Payment Gateway, QR Payment và Webhook.

**Phạm vi chính:**

- Đăng ký merchant
- Duyệt/kích hoạt merchant
- Quản lý thông tin merchant
- Cấp API Key/Secret
- Rotate/revoke API Key
- Cấu hình callback URL
- Cấu hình redirect URL
- Quản lý trạng thái merchant
- Xem số dư merchant nếu có merchant balance
- Xem lịch sử payment của merchant

---

## 2. Actor & Quyền

| Actor | Quyền |
|---|---|
| Merchant Owner | Xem/cập nhật thông tin merchant, quản lý API key, xem payment |
| Merchant Staff | Xem payment, tra cứu trạng thái giao dịch theo quyền được cấp |
| Admin | Tạo, duyệt, khóa/mở merchant, cấp/revoke API key |
| System | Xác thực API key, ghi audit, cập nhật trạng thái |
| User | Không truy cập module merchant |

---

## 3. Yêu cầu chức năng chi tiết

---

### FN-MER-01: Đăng ký merchant

**Mô tả:**  
Merchant đăng ký tài khoản để tích hợp cổng thanh toán. Trong MVP, có thể để admin tạo merchant trực tiếp hoặc merchant gửi form đăng ký rồi admin duyệt.

**Actor:** Merchant Owner, Admin

**Luồng merchant tự đăng ký:**

| Bước | Hành động |
|---|---|
| 1 | Merchant truy cập trang đăng ký |
| 2 | Nhập thông tin doanh nghiệp/cửa hàng |
| 3 | Nhập thông tin người đại diện |
| 4 | Nhập email/số điện thoại đăng nhập |
| 5 | Hệ thống validate dữ liệu |
| 6 | Tạo merchant trạng thái PENDING_REVIEW |
| 7 | Tạo merchant owner account |
| 8 | Ghi audit log |
| 9 | Thông báo chờ admin duyệt |

**Luồng admin tạo merchant:**

| Bước | Hành động |
|---|---|
| 1 | Admin vào màn hình quản lý merchant |
| 2 | Click “Tạo merchant” |
| 3 | Nhập thông tin merchant |
| 4 | Tạo merchant trạng thái ACTIVE hoặc PENDING_REVIEW |
| 5 | Tạo merchant owner account nếu cần |
| 6 | Ghi audit log |

**Data fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| merchant_code | String(30) | Auto | Mã merchant tự sinh |
| merchant_name | String(255) | Có | Tên merchant |
| business_type | String(50) | Không | ONLINE / OFFLINE / BOTH |
| tax_code | String(50) | Không | Mã số thuế |
| representative_name | String(255) | Có | Người đại diện |
| phone | String(20) | Có | SĐT liên hệ |
| email | String(255) | Có | Email liên hệ |
| address | String(500) | Không | Địa chỉ |
| status | String(50) | Có | PENDING_REVIEW / ACTIVE / SUSPENDED / REJECTED |
| risk_note | Text | Không | Ghi chú rủi ro/duyệt |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | `merchant_code` phải unique toàn hệ thống |
| BR-02 | Email merchant owner phải unique trong hệ thống user |
| BR-03 | Merchant mới đăng ký mặc định PENDING_REVIEW |
| BR-04 | Merchant chưa ACTIVE không được gọi API tạo payment |
| BR-05 | Admin có thể tạo merchant ACTIVE ngay nếu là demo |
| BR-06 | Mọi thao tác tạo merchant phải ghi audit log |

---

### FN-MER-02: Duyệt / từ chối merchant

**Mô tả:**  
Admin duyệt hoặc từ chối merchant đăng ký. Merchant chỉ được tích hợp thanh toán sau khi được ACTIVE.

**Actor:** Admin

**Luồng duyệt:**

| Bước | Hành động |
|---|---|
| 1 | Admin mở danh sách merchant chờ duyệt |
| 2 | Xem chi tiết thông tin merchant |
| 3 | Click “Duyệt merchant” |
| 4 | Nhập ghi chú nếu cần |
| 5 | Hệ thống cập nhật status = ACTIVE |
| 6 | Có thể tự động tạo API key mặc định |
| 7 | Ghi audit log |
| 8 | Thông báo merchant đã được kích hoạt |

**Luồng từ chối:**

| Bước | Hành động |
|---|---|
| 1 | Admin mở chi tiết merchant |
| 2 | Click “Từ chối” |
| 3 | Nhập lý do từ chối |
| 4 | Hệ thống cập nhật status = REJECTED |
| 5 | Ghi audit log |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Chỉ Admin được duyệt/từ chối merchant |
| BR-02 | Merchant REJECTED không được tạo payment |
| BR-03 | Merchant ACTIVE mới được cấp API key sử dụng |
| BR-04 | Lý do từ chối là bắt buộc |
| BR-05 | Duyệt/từ chối merchant phải ghi audit log |

---

### FN-MER-03: Quản lý thông tin merchant

**Mô tả:**  
Merchant Owner hoặc Admin có thể xem và cập nhật thông tin merchant.

**Actor:** Merchant Owner, Admin

**Data fields có thể chỉnh sửa:**

| Trường | Merchant Owner | Admin |
|---|---:|---:|
| merchant_name | Có | Có |
| phone | Có | Có |
| email | Có | Có |
| address | Có | Có |
| callback_url | Có | Có |
| redirect_url | Có | Có |
| logo_file_id | Có | Có |
| status | Không | Có |
| risk_note | Không | Có |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant Owner chỉ sửa merchant của mình |
| BR-02 | Admin sửa được tất cả merchant |
| BR-03 | Callback URL phải là URL hợp lệ |
| BR-04 | Redirect URL phải là URL hợp lệ nếu có |
| BR-05 | Thay đổi callback/redirect URL phải ghi audit log |
| BR-06 | Không cho merchant tự đổi trạng thái của mình |

---

### FN-MER-04: Cấp API Key / Secret

**Mô tả:**  
Admin hoặc Merchant Owner có quyền tạo API Key/Secret để merchant tích hợp API payment gateway.

**Actor:** Admin, Merchant Owner

**Luồng chính:**

| Bước | Hành động |
|---|---|
| 1 | User vào tab API Keys của merchant |
| 2 | Click “Tạo API Key” |
| 3 | Nhập tên key/môi trường sử dụng |
| 4 | Hệ thống sinh API Key và API Secret |
| 5 | API Secret chỉ hiển thị một lần |
| 6 | Lưu API Secret dạng hash/encrypted |
| 7 | Ghi audit log |
| 8 | Merchant copy key/secret để tích hợp |

**Data fields — merchant_api_keys:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| id | UUID | Có | Khóa chính |
| merchant_id | UUID FK | Có | Merchant sở hữu key |
| key_name | String(100) | Có | Tên key |
| api_key | String(100) | Có | Public API key |
| api_secret_hash | Text | Có | Secret hash/encrypted |
| environment | String(50) | Có | SANDBOX / LIVE |
| status | String(50) | Có | ACTIVE / REVOKED / EXPIRED |
| last_used_at | Timestamp | Không | Lần dùng gần nhất |
| expired_at | Timestamp | Không | Hết hạn nếu có |
| created_at | Timestamp | Có | Thời gian tạo |
| revoked_at | Timestamp | Không | Thời gian revoke |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | API Key phải unique toàn hệ thống |
| BR-02 | API Secret không lưu plain text |
| BR-03 | API Secret chỉ hiển thị một lần khi tạo |
| BR-04 | Key REVOKED/EXPIRED không được gọi API |
| BR-05 | Merchant bị SUSPENDED thì mọi API key không được sử dụng |
| BR-06 | Tạo/revoke API key phải ghi audit log |
| BR-07 | Hỗ trợ phân biệt SANDBOX và LIVE |

---

### FN-MER-05: Rotate / revoke API Key

**Mô tả:**  
Merchant hoặc Admin có thể rotate/revoke API Key khi nghi ngờ lộ key hoặc cần thay đổi bảo mật.

**Actor:** Admin, Merchant Owner

**Luồng rotate:**

| Bước | Hành động |
|---|---|
| 1 | User chọn API key đang ACTIVE |
| 2 | Click “Rotate Secret” |
| 3 | Hệ thống sinh secret mới |
| 4 | Secret cũ hết hiệu lực |
| 5 | Hiển thị secret mới một lần |
| 6 | Ghi audit log |

**Luồng revoke:**

| Bước | Hành động |
|---|---|
| 1 | User chọn API key |
| 2 | Click “Revoke” |
| 3 | Nhập lý do |
| 4 | Hệ thống cập nhật status = REVOKED |
| 5 | Ghi audit log |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Revoke API key không ảnh hưởng payment đã tạo trước đó |
| BR-02 | API key bị revoke không thể tạo payment mới |
| BR-03 | Rotate secret làm secret cũ không còn hợp lệ |
| BR-04 | Revoke bắt buộc nhập lý do |
| BR-05 | Không cho xóa vật lý API key |

---

### FN-MER-06: Cấu hình callback và redirect

**Mô tả:**  
Merchant cấu hình callback URL để nhận webhook kết quả thanh toán và redirect URL để điều hướng user sau thanh toán web/redirect flow.

**Actor:** Merchant Owner, Admin

**Data fields:**

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---|---|---|---|
| default_callback_url | String(500) | Có | URL nhận callback mặc định |
| default_redirect_url | String(500) | Không | URL redirect mặc định |
| webhook_secret | Text | Có | Secret trả một lần khi tạo; bản dùng ký được lưu trong secret manager/KMS, DB chỉ lưu hash |
| callback_status | Enum | Có | ACTIVE / DISABLED |
| retry_enabled | Boolean | Có | Có retry callback hay không |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Callback URL phải là HTTPS trong môi trường LIVE |
| BR-02 | SANDBOX có thể cho phép HTTP localhost để demo |
| BR-03 | Merchant có thể truyền callback_url riêng khi tạo payment |
| BR-04 | Nếu request tạo payment không có callback_url thì dùng default_callback_url |
| BR-05 | Webhook secret không hiển thị plain text sau khi tạo |
| BR-06 | Thay đổi callback config phải ghi audit log |

---

### FN-MER-07: Xem payment của merchant

**Mô tả:**  
Merchant xem danh sách payment order và giao dịch thanh toán liên quan đến merchant của mình.

**Actor:** Merchant Owner, Merchant Staff, Admin

**Data fields danh sách:**

| Cột | Mô tả |
|---|---|
| Mã payment | payment_no |
| Mã đơn merchant | merchant_order_id |
| Số tiền | amount |
| Trạng thái | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| Callback status | SUCCESS / FAILED / RETRYING |
| Thời gian tạo | created_at |
| Thời gian thanh toán | paid_at |

**Bộ lọc:**

| Bộ lọc | Options |
|---|---|
| Thời gian | Hôm nay / 7 ngày / 30 ngày / Tùy chỉnh |
| Trạng thái payment | PENDING / PAID / EXPIRED / CANCELED / FAILED |
| Mã đơn merchant | Search |
| Số tiền | Từ — đến |
| Callback status | SUCCESS / FAILED / RETRYING |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant chỉ xem payment của chính mình |
| BR-02 | Merchant Staff xem theo quyền được cấp |
| BR-03 | Admin xem toàn bộ payment của mọi merchant |
| BR-04 | Không hiển thị thông tin ví user nhạy cảm |
| BR-05 | Danh sách mặc định mới nhất trước |

---

### FN-MER-08: Quản lý trạng thái merchant

**Mô tả:**  
Admin có thể khóa/tạm ngưng merchant khi phát hiện rủi ro, gian lận hoặc vi phạm chính sách.

**Actor:** Admin

**Trạng thái merchant:**

| Status | Mô tả |
|---|---|
| PENDING_REVIEW | Chờ duyệt |
| ACTIVE | Đang hoạt động |
| SUSPENDED | Tạm ngưng |
| REJECTED | Bị từ chối |
| CLOSED | Đã đóng |

**Business rules:**

| # | Rule |
|---|---|
| BR-01 | Merchant SUSPENDED không được tạo payment mới |
| BR-02 | Merchant SUSPENDED vẫn xem được lịch sử payment |
| BR-03 | Payment PENDING của merchant bị suspend có thể tiếp tục hoặc bị cancel tùy cấu hình |
| BR-04 | Chỉ Admin được đổi trạng thái merchant |
| BR-05 | Đổi trạng thái phải nhập lý do và ghi audit log |

---

## 4. Validation Rules

| Trường | Rule |
|---|---|
| merchant_name | Required, 2-255 ký tự |
| merchant_code | Unique |
| email | Required, valid email |
| phone | Required, valid phone |
| callback_url | Required, valid URL |
| api_key | Unique, không rỗng |
| api_secret | Không lưu plain text |
| status | PENDING_REVIEW / ACTIVE / SUSPENDED / REJECTED / CLOSED |
| environment | SANDBOX / LIVE |

---

## 5. API đề xuất

| Method | Endpoint | Mô tả | Actor |
|---|---|---|---|
| POST | `/api/v1/merchants/register` | Merchant tự đăng ký | Guest |
| GET | `/api/v1/merchant/profile` | Merchant xem profile | Merchant |
| PATCH | `/api/v1/merchant/profile` | Merchant cập nhật profile | Merchant Owner |
| GET | `/api/v1/merchant/api-keys` | Danh sách API keys | Merchant Owner |
| POST | `/api/v1/merchant/api-keys` | Tạo API key | Merchant Owner |
| POST | `/api/v1/merchant/api-keys/{id}/rotate` | Rotate secret | Merchant Owner |
| POST | `/api/v1/merchant/api-keys/{id}/revoke` | Revoke API key | Merchant Owner |
| GET | `/api/v1/merchant/payments` | Merchant xem payment | Merchant |
| GET | `/api/v1/admin/merchants` | Admin xem danh sách merchant | Admin |
| GET | `/api/v1/admin/merchants/{id}` | Admin xem chi tiết merchant | Admin |
| POST | `/api/v1/admin/merchants/{id}/actions/approve` | Duyệt merchant | Admin |
| POST | `/api/v1/admin/merchants/{id}/actions/reject` | Từ chối merchant | Admin |
| POST | `/api/v1/admin/merchants/{id}/actions/suspend` | Tạm ngưng merchant | Admin |
| POST | `/api/v1/admin/merchants/{id}/actions/activate` | Kích hoạt lại merchant | Admin |

---

## 6. Mapping Database đề xuất

| Bảng | Vai trò |
|---|---|
| `merchants` | Thông tin merchant |
| `merchant_users` hoặc `users` | Tài khoản merchant owner/staff |
| `merchant_api_keys` | API key/secret |
| `merchant_callback_configs` | Cấu hình callback/redirect |
| `merchant_balances` | Số dư merchant nếu có |
| `payment_orders` | Payment do merchant tạo |
| `outbox_events` | Sự kiện callback gửi về merchant |
| MongoDB `webhook_attempt_logs` | Lịch sử gửi/retry callback |
| MongoDB `audit_logs` | Ghi thao tác merchant |
| MongoDB `system_logs` | Ghi lỗi kỹ thuật/security |

---

## 7. Liên kết module

| Module liên quan | Quan hệ |
|---|---|
| MOD-AUTH | Merchant user đăng nhập portal |
| MOD-PAYMENT-GATEWAY | Merchant tạo payment |
| MOD-WEBHOOK | Callback về merchant |
| MOD-TRANSACTION | Payment thành công ghi ledger |
| MOD-ADMIN | Admin duyệt/quản lý merchant |
| MOD-AUDIT | Ghi audit merchant/API key |

---

## 8. Tiêu chí nghiệm thu

| # | Tiêu chí |
|---|---|
| AC-01 | Merchant đăng ký thành công ở trạng thái PENDING_REVIEW |
| AC-02 | Admin duyệt merchant thành ACTIVE |
| AC-03 | Merchant ACTIVE tạo được API key |
| AC-04 | API Secret chỉ hiển thị một lần |
| AC-05 | API key bị revoke không gọi được API payment |
| AC-06 | Merchant SUSPENDED không tạo được payment mới |
| AC-07 | Merchant chỉ xem được payment của mình |
| AC-08 | Callback URL phải validate đúng format |
| AC-09 | Thay đổi callback config ghi audit log |
| AC-10 | Admin xem và lọc được danh sách merchant |
| AC-11 | Không lưu API secret plain text |
| AC-12 | Revoke/rotate API key ghi audit log |

---

## 9. Vấn đề mở

| # | Vấn đề | Trạng thái | Ghi chú |
|---|---|---|---|
| O-01 | Merchant tự đăng ký hay admin tạo? | Mở | MVP có thể admin tạo |
| O-02 | Có merchant balance không? | Đề xuất: Có | Dễ thể hiện tiền merchant nhận |
| O-03 | Có settlement/rút tiền merchant không? | Phase sau | Không bắt buộc MVP |
| O-04 | Có SANDBOX/LIVE mode không? | Đề xuất: Có | Rất hợp payment gateway |
| O-05 | Có nhiều user trong một merchant không? | Mở | MVP có thể 1 owner |

---

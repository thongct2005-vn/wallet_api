# Hướng dẫn Khởi tạo Database chuẩn cho ewallet_core_db

Để khởi tạo lại toàn bộ Database trên máy mới mà không bị lỗi lặt vặt, bạn cần chạy lần lượt các bước sau:

**1. Lệnh tạo Database mới**
(Chạy trực tiếp câu lệnh để xóa DB cũ nếu có và tạo lại mới)
```sql
DROP DATABASE IF EXISTS ewallet_core_db;
CREATE DATABASE ewallet_core_db;
```

**2. Khởi tạo ENUM chuẩn**
Chạy file `setup_enums.sql` để khởi tạo tất cả các kiểu dữ liệu ENUM chuẩn cho database (ví dụ: `user_type`, `status`, `ledger_entry_type`,...).

**3. Khởi tạo Schema**
Chạy file `db/ewallet_core_db.sql` (File dump chính để tạo toàn bộ bảng cấu trúc core của hệ thống Ví).

**4. Import dữ liệu mẫu**
Chạy file `ewallet_core_seed_demo_generic_ascii.sql` để đưa các dữ liệu test (user, quyền, tài khoản, merchant,...) vào.

**5. Chạy các bản cập nhật mới nhất (Updates)**
Chạy file `apply_updates.sql`. File này tổng hợp các lệnh bổ sung như tạo bảng `fee_configs`, `user_linked_services`, `user_wealth_bags`, bổ sung thêm các cột bị thiếu (`loyalty_points`, `metadata`...) và cấp quyền mới cho `SUPER_ADMIN`.

**6. Fix lỗi định dạng VARCHAR (Lỗi 500)**
Chạy file `ewallet_core_convert_varchar_to_enum.sql`. Lệnh này ép kiểu (cast) các cột bị sai định dạng `VARCHAR` (do tool dump sinh ra) về lại đúng kiểu ENUM gốc của PostgreSQL, giúp code Node.js query không còn bị lỗi type.

**7. Fix thủ công 2 lỗi Invalid Input Value cho ENUM (Bổ sung giá trị mới)**
Do quá trình dump/restore hoặc dữ liệu mẫu có thêm các trạng thái mới, cần chạy trực tiếp 2 lệnh sau:

*Lệnh 1: Fix lỗi cập nhật đơn thanh toán*
```sql
ALTER TYPE payment_order_status ADD VALUE IF NOT EXISTS 'SUCCESS';
```
*(Giải thích: Hỗ trợ các dòng code cũ/hiện tại cập nhật trạng thái thành 'SUCCESS' thay vì chỉ có 'PAID', tránh lỗi enum)*

*Lệnh 2: Fix lỗi thanh toán QR của Merchant*
```sql
ALTER TYPE ledger_account_type ADD VALUE IF NOT EXISTS 'MERCHANT';
```
*(Giải thích: Khi thanh toán bằng QR, sổ cái ghi nhận biến động số dư cho 'MERCHANT', ENUM gốc thiếu giá trị này nên cần bổ sung).*

---
**Lưu ý:** Chạy đúng thứ tự trên sẽ đảm bảo Database được build hoàn chỉnh 100% không sót chi tiết nào.

**GV: TRẦN THANH TUẤN** 

## **ĐỀ TÀI:** 

## **Xây dựng ví điện tử và cổng thanh toán** 

## **1. MÔ TẢ YÊU CẦU KỸ THUẬT** 

Hệ thống cho phép người dùng lưu trữ tiền trong ví điện tử và thực hiện thanh toán cho các dịch vụ thông qua cổng thanh toán. 

Hệ thống có khả năng: 

- Quản lý ví điện tử người dùng 

- Chuyển tiền giữa các ví 

- Thanh toán bằng QR Code 

- Cung cấp API cho merchant tích hợp thanh toán 

## **Yêu cầu kỹ thuật** 

- Quản lý ví điện tử 

   - Mỗi user có 1 ví duy nhất 

   - Theo dõi số dư realtime 

   - Hỗ trợ nạp tiền (giả lập) 

- 

   - Xử lý giao dịch 

      - Debit / Credit chính xác 

      - Đảm bảo ACID transaction 

- 

   - Không xảy ra: 

      - Mất tiền 

      - Double payment 

- 

- Cổng thanh toán (Payment Gateway) 

   - Cung cấp API cho merchant: 

      - § Tạo payment 

      - § Nhận callback 

   - Hỗ trợ: 

      - § QR Code thanh toán 

      - § Redirect flow 

- 

- Thanh toán QR Code 

   - Sinh QR động (dynamic QR) cho từng đơn hàng 

**GV: TRẦN THANH TUẤN** 

   - Quét QR bằng mobile app 

   - Xác nhận thanh toán 

- 

   - Bảo mật 

      - JWT (user) 

      - API Key (merchant) 

      - Signature (ký request) 

      - Idempotency key 

- Logging & Audit 

      - Lưu toàn bộ transaction 

      - Không cho sửa/xoá 

      - Truy vết đầy đủ 

## **Công nghệ đề xuất** 

- Backend: Go / Node.js / Python (FastAPI) 

- Database: PostgreSQL / MySQL 

- Cache: Redis / DragonflyDB 

- Message Queue: Kafka / RabbitMQ 

- Frontend: 

   - Mobile: Flutter / React Native / Kotlin 

   - Admin Web: ReactJS / Next.js 

## **2. DANH SÁCH CHỨC NĂNG** 

## **Chức năng người dùng (Mobile App)** 

- Quản lý ví 

   - Đăng ký / đăng nhập 

   - Xem số dư 

   - Xem thông tin tài khoản 

- 

   - Nạp tiền 

      - Nạp tiền giả lập 

      - Cập nhật số dư 

- 

- Chuyển tiền 

   - Chuyển tiền giữa user 

   - Kiểm tra số dư 

   - Ghi transaction 

**GV: TRẦN THANH TUẤN** 

- Thanh toán qua QR Code 

`o` Quét QR từ merchant 

`o` Hiển thị thông tin: 

§ Số tiền 

- § Nội dung thanh toán 

`o` Xác nhận thanh toán 

`o` Trừ tiền ví 

`o` Ghi transaction 

- Lịch sử giao dịch 

`o` Xem: 

§ Nạp tiền 

§ Chuyển tiền 

§ Thanh toán 

`o` Filter theo thời gian 

- Bảo mật 

`o` JWT authentication 

`o` (Nâng cao) PIN / OTP khi thanh toán 

## **Chức năng Merchant (Cổng thanh toán)** 

- Tạo thanh toán 

`o` API: 

§ amount 

§ order_id 

§ callback_url 

`o` Trả về: 

§ QR Code / payment URL 

- Xử lý thanh toán 

`o` Nhận request từ mobile app 

`o` Kiểm tra: 

§ Số dư 

§ Trạng thái order 

`o` Thực hiện giao dịch 

- Callback / Webhook 

`o` Gửi kết quả về merchant: success / fail 

**GV: TRẦN THANH TUẤN** 

   - Ký signature đảm bảo an toàn 

- 

- Kiểm tra trạng thái giao dịch 

   - API query: 

      - § Transaction status 

      - § Payment status 

## **Chức năng quản trị (Admin Web)** 

- Quản lý người dùng 

   - Tạo / khoá user 

   - Xem thông tin ví 

- 

   - Quản lý merchant 

      - Đăng ký merchant 

      - Cấp API Key 

      - Cấu hình callback 

- 

- Quản lý giao dịch 

`o` Xem toàn bộ transaction 

- Tra cứu chi tiết 

`o` Không cho sửa/xoá 

- 

- Dashboard hệ thống 

`o` Tổng số giao dịch 

`o` Tổng số tiền 

`o` Error rate 

`o` Biểu đồ realtime 

- Logging & audit 

`o` Log: 

§ API 

§ Payment flow 

`o` Truy vết lỗi 

## **NOTE: Luồng thanh toán QR** 

- Merchant tạo đơn hàng 

- Gateway sinh QR Code 

- → 

- User mở app quét QR 

**GV: TRẦN THANH TUẤN** 

- App gửi request thanh toán 

- Backend: 

- Kiểm tra số dư 

- Trừ tiền 

- Ghi transaction 

- Gateway gửi callback về merchant 

- Merchant cập nhật trạng thái đơn 


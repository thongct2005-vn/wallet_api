# Web Admin Node.js/Express Rules

Những quy tắc này được áp dụng nghiêm ngặt cho phân hệ Web Admin Node.js/Express.

## 1. Giới hạn phạm vi (Core Constraints)
* Không rewrite toàn dự án.
* Không sửa DB schema nếu chưa được yêu cầu.
* Không đổi endpoint, response format, permission hiện tại.
* Refactor từng module nhỏ, test xong mới cleanup file cũ.

## 2. Ranh giới kiến trúc (Architecture & Layers)
* Admin code theo chuẩn: routes → validator → controller → service → repository → mapper nếu cần.
* `routes`: chỉ khai báo API/middleware/permission.
* `validator`: kiểm tra params/query/body.
* `controller`: chỉ nhận request và trả response.
* `service`: xử lý nghiệp vụ, audit log, transaction.
* `repository`: chỉ query DB bằng parameterized SQL.

## 3. Quy chuẩn Code (Coding Standards)
* Không log password/token/API secret.
* List API phải có pagination.
* Action API phải validate UUID.
* Logic dùng chung đưa vào `_shared`, không duplicate code.

## 4. Quy tắc Comment (Commenting Rules)
* Viết bằng tiếng Việt, ngắn gọn, dễ hiểu.
* Chỉ comment để giải thích WHY (lý do nghiệp vụ, rủi ro, bảo mật, transaction...).
* Không comment những thứ code đã tự nói rõ (WHAT/HOW).
* Không viết comment kiểu lịch sử (đã fix, copy từ, refactor, code cũ).
* Ưu tiên đặt tên hàm, tên biến rõ ràng thay vì viết comment mô tả.

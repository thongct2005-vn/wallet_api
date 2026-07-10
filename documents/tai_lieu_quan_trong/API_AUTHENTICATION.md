## Authentication

Để tích hợp với hệ thống, Quý đối tác sẽ được cấp một cặp khóa xác thực gồm:

- API Key (Public Key): Dùng để định danh ứng dụng khi gửi yêu cầu đến hệ thống.
- API Secret Key: Dùng để tạo chữ ký (signature) nhằm xác thực tính hợp lệ và toàn vẹn của mỗi yêu cầu API. Đây là thông tin bảo mật, chỉ được lưu trữ và sử dụng tại backend. Tuyệt đối không chia sẻ, công khai hoặc nhúng vào frontend, mobile application hoặc bất kỳ môi trường không an toàn nào.

API Secret Key chỉ được cấp một lần tại thời điểm khởi tạo. Quý đối tác có trách nhiệm lưu trữ khóa an toàn. Trong trường hợp khóa bị lộ hoặc thất lạc, vui lòng tạo khóa mới và ngừng sử dụng khóa cũ.

Tất cả các yêu cầu đến API phải gửi thông tin xác thực thông qua HTTP Header:

x-api-key: <your_api_key>
x-signature: <signature>

Trong đó:

- `x-api-key`: API Key (Public Key) được cấp cho Quý đối tác.
- `x-signature`: Chữ ký được tạo từ dữ liệu yêu cầu bằng API Secret Key theo thuật toán quy định.

Ví dụ:

POST /api/v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
x-api-key: pk_live_xxxxxxxxx
x-signature: 8d2c6d6d6b7d2e...
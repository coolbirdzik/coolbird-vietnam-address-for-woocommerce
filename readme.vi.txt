=== Coolbird Vietnam Address for WooCommerce ===
Contributors: coolbird
Donate link: https://github.com/coolbirdzik/coolbird-vietnam-address-for-woocommerce
Tags: woocommerce, vietnam, checkout, address
Requires at least: 5.0
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Tối ưu checkout WooCommerce cho thị trường Việt Nam với bộ chọn Tỉnh/Thành phố, Quận/Huyện, Xã/Phường.

== Mô tả ==

Plugin thay thế trường địa chỉ mặc định của WooCommerce bằng bộ chọn địa chỉ Việt Nam chuẩn.

**Tính năng:**
- Dropdown Tỉnh/Thành phố, Quận/Huyện, Xã/Phường với dữ liệu hành chính đầy đủ
- Tự động load danh sách theo cấp đã chọn
- Gộp Họ & Tên thành một trường "Họ và tên"
- Thêm trường Số điện thoại người nhận hàng
- Hỗ trợ cả checkout cổ điển và Woo Checkout Blocks
- Tùy chọn hiển thị VNĐ
- Hỗ trợ cấu hình phí vận chuyển theo Tỉnh/Thành phố
- Không tạo bảng database mới, dữ liệu lưu trong mảng PHP

**Yêu cầu:**
- WordPress 5.0+
- WooCommerce 8.0+
- PHP 7.4+

== Cài đặt ==

1. Tải plugin hoặc cài đặt từ Plugins → Add New
2. Kích hoạt plugin
3. Vào Settings → Vietnam Checkout để tùy chỉnh

== Câu hỏi thường gặp =

= Plugin có miễn phí không? =
Có. Miễn phí và mã nguồn mở GPLv3.

= Dữ liệu địa chỉ có cập nhật không? =
Có, được cập nhật định kỳ từ nguồn chính thức.

= Plugin có làm chậm website không? =
Không. Dữ liệu lưu trong mảng PHP, không truy vấn database.

== Mã nguồn & Phát triển ==

Plugin này bao gồm các file JavaScript đã được nén để sử dụng production. Mã nguồn gốc (dễ đọc) có sẵn trên GitHub repository công khai:

**Repository:** https://github.com/coolbirdzik/coolbird-vietnam-address-for-woocommerce

**Mã nguồn Frontend:** Nằm trong thư mục `frontend/`
- Được xây dựng với TypeScript, React, và Vite
- Các file nguồn: `frontend/src/`
- Điểm khởi đầu: `frontend/src/main-checkout.tsx`, `frontend/src/main-admin-order.tsx`, `frontend/src/main-admin-shipping.tsx`

**Để build từ mã nguồn:**
1. Clone repository về
2. Chạy `cd frontend && npm install && npm run build`
3. File đã build sẽ nằm trong `assets/dist/`


== Lịch sử phiên bản =

= 1.0.0 - 2026-02-25 =
- Phiên bản đầu tiên
- Bộ chọn Tỉnh/Thành phố, Quận/Huyện, Xã/Phường
- Tối ưu checkout và thêm trường điện thoại

== Thông tin thêm =

- GitHub: https://github.com/coolbirdzik/coolbird-vietnam-address-for-woocommerce
- Phát triển bởi: Nguyễn Tấn Hưng
- Không gửi dữ liệu khách hàng ra bên ngoài

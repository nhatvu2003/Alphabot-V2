# 📖 Hướng Dẫn Sử Dụng Alphabot V2

> **Tác giả:** Nhat Vu &nbsp;|&nbsp; **Phiên bản:** 1.0.0 &nbsp;|&nbsp; **GitHub:** [Alphabot-V2](https://github.com/nhatvu2003/Alphabot-V2)

---

## 📋 Mục Lục

1. [Yêu Cầu](#-yêu-cầu)
2. [Cài Đặt](#-cài-đặt)
3. [Kích Hoạt Bot](#-kích-hoạt-bot)
4. [Nhập Cookie (Appstate)](#-nhập-cookie-appstate)
5. [Khởi Động & Dừng Bot](#-khởi-động--dừng-bot)
6. [Cài Đặt Cấu Hình](#-cài-đặt-cấu-hình)
7. [Quản Lý Lệnh Bot](#-quản-lý-lệnh-bot)
8. [Xem Danh Sách Nhóm](#-xem-danh-sách-nhóm)
9. [Cập Nhật Bot](#-cập-nhật-bot)
10. [Câu Hỏi Thường Gặp](#-câu-hỏi-thường-gặp)
11. [Báo Cáo Lỗi](#-báo-cáo-lỗi)

---

##  Yêu Cầu

- **Node.js** `16.x` trở lên (khuyến nghị `18.x` hoặc `20.x`)
- **npm** `8.x` trở lên
- **Key kích hoạt** hợp lệ (liên hệ admin để lấy key)
- Kết nối Internet ổn định

---

## 🚀 Cài Đặt

```bash
# 1. Clone dự án
git clone https://github.com/nhatvu2003/Alphabot-V2.git
cd Alphabot-V2

# 2. Cài đặt các thư viện cần thiết
npm install

# 3. Khởi động giao diện quản lý
npm run start
```

Sau đó mở trình duyệt và truy cập **`http://localhost:3000`**

---

## 🔑 Kích Hoạt Bot

Lần đầu truy cập, màn hình nhập **Key Kích Hoạt** sẽ tự động hiện ra.

1. Nhập key kích hoạt vào ô trống.
2. Nhấn **Kích Hoạt**.
3. Chờ hệ thống xử lý — trang sẽ tự tải lại khi hoàn tất.

> ❌ Nếu thấy thông báo lỗi "Key không hợp lệ", hãy kiểm tra lại key và liên hệ admin.

---

## 🍪 Nhập Cookie (Appstate)

Bot cần cookie Facebook để hoạt động. Làm theo các bước sau:

**Lấy cookie:**
1. Đăng nhập Facebook trên trình duyệt máy tính.
2. Cài extension **EditThisCookie** hoặc **Cookie-Editor**.
3. Xuất cookies dưới dạng **JSON Array** (`[...]`).

**Nhập vào bot:**
1. Vào tab **Appstate** trên giao diện web.
2. Xoá nội dung cũ, dán JSON cookie vào.
3. Nhấn **Lưu Appstate**.

> ⚠️ Nếu xuất hiện cảnh báo màu vàng, cookie chưa đúng định dạng. Hãy xuất lại.

---

## ▶️ Khởi Động & Dừng Bot

Vào tab **Dashboard**:

- Nhấn **▶ Khởi Động** để bật bot.
- Nhấn **⏹ Dừng** để tắt bot.
- Badge trạng thái hiển thị **Đang Chạy** (xanh) hoặc **Đã Dừng** (đỏ).

> Sau khi thay đổi cookie hoặc cấu hình, hãy **dừng và khởi động lại** bot để áp dụng.

---

## ⚙️ Cài Đặt Cấu Hình

1. Vào tab **Cài Đặt**.
2. Chỉnh sửa các trường thông tin hiển thị.
3. Nhấn **Lưu Cấu Hình**.
4. **Khởi động lại bot** để áp dụng thay đổi.

---

## 📜 Quản Lý Lệnh Bot

1. Vào tab **Commands**.
2. Chọn một thư mục danh mục, sau đó nhấn vào file lệnh muốn xem hoặc chỉnh sửa.
3. Sửa nội dung trong trình soạn thảo.
4. Nhấn **Lưu** để ghi lại thay đổi.
5. Nhấn **← Quay lại** để trở về danh sách.

---

## 📦 Xem Danh Sách Nhóm

Vào tab **Box** để xem tất cả các nhóm / cuộc trò chuyện bot đang tham gia, bao gồm:

- Tên nhóm
- Loại (Nhóm / Cá nhân)
- Số thành viên

---

##  Cập Nhật Bot

1. Trên Dashboard, nhấn **🔄 Kiểm Tra Cập Nhật**.
2. Nếu có bản mới, xác nhận trong hộp thoại hiện ra.
3. Chờ hệ thống cập nhật hoàn tất rồi nhấn OK để tải lại trang.

> ✅ Cookie và cấu hình của bạn **sẽ được giữ nguyên** sau khi cập nhật.

---

## ❓ Câu Hỏi Thường Gặp

**Mở trình duyệt không thấy giao diện?**  
Kiểm tra terminal xem server đang chạy ở cổng nào, rồi thử `http://localhost:3001` hoặc `http://localhost:3002`.

**Bot bật nhưng không phản hồi trong Messenger?**  
Cookie có thể đã hết hạn. Vào tab **Appstate**, lấy cookie mới và lưu lại.

**Màn hình kích hoạt xuất hiện lại dù đã kích hoạt rồi?**  
Kiểm tra kết nối internet và thử kích hoạt lại.

**Cập nhật thất bại?**  
Kiểm tra kết nối internet và thử lại sau vài phút.

**Appstate bị cảnh báo không hợp lệ?**  
Xuất lại cookie bằng extension trình duyệt đúng định dạng JSON Array `[...]`.

---

## 🐛 Báo Cáo Lỗi

👉 [https://github.com/nhatvu2003/Alphabot-V2/issues](https://github.com/nhatvu2003/Alphabot-V2/issues)

Vui lòng cung cấp: hệ điều hành, phiên bản Node.js, mô tả lỗi và thông báo lỗi từ terminal.

---

*© 2025 Nhat Vu — Alphabot V2*

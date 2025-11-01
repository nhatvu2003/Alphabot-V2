# 🎯 War Commands - AlphaBot

Thư mục này chứa các lệnh dành cho hoạt động "war" trên Facebook Messenger.

## 📋 Danh sách lệnh

### 1. **chuilientuc** (c1, war1)
- **Mô tả**: Gửi tin nhắn war liên tục với lyrics tùy chỉnh
- **Quyền**: Admin (Level 2)
- **Sử dụng**: `/c1 @user` hoặc `/c1 stop`
- **Tính năng**:
  - Tag người dùng và gửi lyrics liên tục
  - Cooldown để tránh spam
  - Có thể dừng bất kỳ lúc nào

### 2. **spam** (spamv1, spv1, spam1)
- **Mô tả**: Gửi tin nhắn lặp lại liên tục
- **Quyền**: Admin (Level 2)
- **Sử dụng**: `/spam [nội dung]` hoặc `/spam stop`
- **Tính năng**:
  - Spam tin nhắn tùy chỉnh
  - Delay 2s giữa các tin nhắn
  - Dừng tự động khi có lỗi

### 3. **gonhay** (n, nhay)
- **Mô tả**: Gửi tin nhắn gonhay ngẫu nhiên từ database
- **Quyền**: Admin (Level 2)
- **Sử dụng**: `/gonhay` hoặc `/gonhay stop`
- **Tính năng**:
  - Lấy messages từ file gonhay.json
  - Gửi tuần tự và lặp lại
  - Quản lý session riêng cho mỗi nhóm

### 4. **taobox** (rb, regbox, creategroup)
- **Mô tả**: Tạo nhiều nhóm Facebook với thành viên hiện tại
- **Quyền**: Admin (Level 2)
- **Sử dụng**: `/taobox [số lượng] [tên nhóm]`
- **Tính năng**:
  - Tạo tối đa 20 nhóm
  - Thêm tất cả thành viên hiện tại
  - Gửi tin nhắn chào mừng
  - Báo cáo kết quả chi tiết

### 5. **key** (price, contact, info)
- **Mô tả**: Hiển thị thông tin liên hệ và bảng giá
- **Quyền**: Tất cả (Level 0, 1, 2)
- **Sử dụng**: `/key`
- **Tính năng**:
  - Hiển thị thông tin developer
  - Bảng giá các gói dịch vụ
  - Thông tin thanh toán

## 🔧 Cấu trúc Code

Tất cả các lệnh đã được chuyên nghiệp hóa với:

### **ES6 Modules**
```javascript
export const config = { ... };
export async function run({ event, api, args }) { ... }
```

### **Error Handling**
- Try-catch cho tất cả operations
- Logging chi tiết lỗi
- Clean-up resources khi có lỗi

### **Type Safety & Validation**
- Kiểm tra input đầu vào
- Validate permissions
- Sanitize user data

### **Performance Optimization**
- Sử dụng Map/Set thay vì Array
- Async/await thay vì callbacks
- Resource cleanup

### **User Experience**
- Tin nhắn lỗi rõ ràng
- Hướng dẫn sử dụng chi tiết
- Progress indicators
- Confirmation messages

## 🗂️ Files cần thiết

### Lyrics Files (trong `NVCODER/Lyrics/`):
- `c1.json` - Lyrics cho lệnh chửi liên tục
- `gonhay.json` - Messages gonhay ngẫu nhiên

### Format JSON:
```json
[
  "Message 1 với {name} placeholder",
  "Message 2 normal",
  "Message 3..."
]
```

## 🛡️ Security Features

- **Permission Levels**: Chỉ admin mới được sử dụng
- **Rate Limiting**: Cooldown giữa các lần sử dụng
- **Resource Limits**: Giới hạn số lượng, thời gian
- **Error Recovery**: Dừng tự động khi có lỗi
- **Session Management**: Theo dõi trạng thái từng nhóm

## 🔄 Global State Management

```javascript
// Tracking active sessions
global.c1 = new Map();     // Chửi liên tục sessions
global.Spam = new Set();   // Spam sessions
global.gonhay = new Map(); // Gonhay sessions
global.taobox = new Set(); // Tạo box sessions
```

## 🚀 Deployment

1. Đảm bảo có files lyrics trong `NVCODER/Lyrics/`
2. Set permissions phù hợp trong config
3. Test từng lệnh trước khi deploy
4. Monitor logs để catch errors

## 📞 Support

Nếu có lỗi hoặc cần hỗ trợ:
- **Zalo**: 0348253995
- **Facebook**: fb.com/vuminhnhat10092003
- **GitHub**: Issues tab

---

> **Lưu ý**: Các lệnh war chỉ nên được sử dụng trong môi trường test hoặc với sự đồng ý của tất cả thành viên. Sử dụng có trách nhiệm để tránh vi phạm chính sách Facebook.

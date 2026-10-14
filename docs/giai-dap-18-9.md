# Giải đáp thắc mắc ngày 18/9/2026

---

## 1. Phân loại khách hàng & nhà cung cấp

### Khách hàng

Phân loại dựa trên **tổng chi tiêu + số đơn đã thanh toán**.

| Phân khúc | Icon | Điều kiện | Mô tả |
|---|---|---|---|
| **VIP** | ⭐ | Tổng chi ≥ **5.000.000 VND** | Khách hàng chi tiêu lớn |
| **Thân thiết** | 💎 | Tổng chi ≥ **1.000.000 VND** HOẶC ≥ **5 đơn** | Khách hàng quen thuộc |
| **Thường** | ✓ | Có đơn nhưng không đạt ngưỡng Thân thiết | Khách hàng thông thường |
| **Mới** | 🌱 | **Chưa có đơn** nào | Khách hàng mới chưa mua |

> Chỉ tính đơn **Đã thanh toán** (`TrangThai = 'DaThanhToan'`), không tính đơn đã hủy.

### Nhà cung cấp

Phân loại dựa trên **tổng giá trị nhập + số phiếu nhập đã xác nhận**.

| Phân khúc | Icon | Điều kiện | Mô tả |
|---|---|---|---|
| **Chiến lược** | 🎯 | Tổng nhập ≥ **50.000.000 VND** | Đối tác chiến lược cấp cao |
| **Thường xuyên** | 🔄 | Tổng nhập ≥ **10.000.000 VND** HOẶC ≥ **5 phiếu** | Đối tác cung ứng định kỳ |
| **Thỉnh thoảng** | ⏳ | Có phiếu nhưng không đạt ngưỡng Thường xuyên | Nhà cung cấp không thường xuyên |
| **Mới** | 🌱 | **Chưa có phiếu** nhập nào | Nhà cung cấp mới |

> Chỉ tính phiếu **Đã nhập** (`TrangThai = 'DaNhap'`), không tính phiếu hủy.

---

## 2. Thiết bị khác có đăng nhập được không?

**Không.** Dự án chỉ chạy ở máy local, chưa deploy lên server/hosting.

### Giải thích

- **Frontend** chạy tại `http://localhost:4444` (hoặc port khác nếu đổi)
- **Backend** chạy tại `http://localhost:8080`
- **Database** (SQL Server) chạy trên máy tính cục bộ

```
┌─────────────────────────────────────────────────┐
│  Máy tính của bạn (localhost)                   │
│  ┌──────────────┐    ┌──────────────┐          │
│  │   Frontend   │───▶│   Backend    │───▶ DB   │
│  │  localhost:  │    │  localhost:  │          │
│  │    4444      │    │    8080      │          │
│  └──────────────┘    └──────────────┘          │
└─────────────────────────────────────────────────┘
```

### Để thiết bị khác truy cập được, cần:

1. **Deploy Frontend** lên hosting (Vercel, Netlify, GitHub Pages...)
2. **Deploy Backend** lên server (Railway, Render, VPS...)
3. **Deploy Database** lên cloud SQL (Azure SQL, AWS RDS, SQL Server cloud...)
4. **Cấu hình CORS** cho phép domain của frontend
5. **Đổi `localhost`** thành domain thật trong config

### Tạm thời để test trong mạng LAN:

Nếu muốn test trên điện thoại cùng mạng WiFi, có thể:
1. Tìm IP local của máy (ví dụ `192.168.1.x`)
2. Sửa `vite.config.js` để frontend listen trên IP đó
3. Truy cập `http://192.168.1.x:4444` từ điện thoại

> ⚠️ **Lưu ý:** Cách này chỉ hoạt động trong cùng mạng LAN, không dùng được khi thiết bị khác mạng internet.

---

## 3. Tình trạng tài liệu API

**Đã fix xong** ✅ — Chờ bên khách hàng cập nhật tài liệu.

- Tài liệu API nằm tại: [`docs/API.md`](./API.md)
- Các endpoint đã được cập nhật và kiểm tra
- Đang chờ phía khách hàng xác nhận và tích hợp

---

## 4. Quyền của Quản trị viên (Admin)

### ✅ Đã triển khai

#### 1. Quản lý Tài khoản & Xác thực
- [V] Đăng nhập với vai trò Admin
- [V] Xem thông tin tài khoản cá nhân
- [V] Đăng xuất hệ thống
- [V] Đổi mật khẩu cá nhân

#### 2. Quản lý Nhân viên (NhanVien)
- [V] Xem danh sách nhân viên
- [V] Thêm nhân viên mới
- [V] Sửa thông tin nhân viên
- [V] Xóa nhân viên
- [V] Tạo tài khoản cho nhân viên
- [V] Reset mật khẩu nhân viên

#### 3. Quản lý Danh mục (DanhMuc)
- [V] Xem danh sách danh mục
- [V] Thêm danh mục mới
- [V] Sửa danh mục
- [V] Xóa danh mục

#### 4. Quản lý Thuốc (Thuoc)
- [V] Xem danh sách thuốc
- [V] Thêm thuốc mới
- [V] Sửa thông tin thuốc
- [V] Xóa thuốc
- [V] Cập nhật giá bán / giá nhập

#### 5. Quản lý Nhà cung cấp (NhaCungCap)
- [V] Xem danh sách nhà cung cấp
- [V] Thêm nhà cung cấp mới
- [V] Sửa thông tin nhà cung cấp
- [V] Xóa nhà cung cấp

#### 6. Quản lý Khách hàng (KhachHang)
- [V] Xem danh sách khách hàng
- [V] Thêm khách hàng mới
- [V] Sửa thông tin khách hàng
- [V] Xóa khách hàng
- [V] Tra cứu theo SĐT (AES mã hóa)

#### 7. Quản lý Kho & Lô thuốc
- [V] Xem tồn kho theo lô (FIFO)
- [V] Theo dõi hạn sử dụng
- [V] Cảnh báo thuốc sắp hết hạn
- [V] Điều chỉnh tồn kho (kiểm kê)
- [V] Duyệt/từ chối điều chỉnh

#### 8. Quản lý Phiếu Nhập
- [V] Xem danh sách phiếu nhập
- [V] Tạo phiếu nhập mới
- [V] Duyệt / Từ chối phiếu nhập
- [V] Sửa phiếu nhập (khi chưa duyệt)

#### 9. Quản lý Bán hàng & Hóa đơn
- [V] Tạo hóa đơn bán hàng
- [V] Xem danh sách hóa đơn
- [V] Xem chi tiết hóa đơn
- [V] Hủy hóa đơn (với lý do)
- [V] Áp dụng voucher giảm giá

#### 10. Quản lý Voucher
- [V] Tạo voucher giảm giá
- [V] Sửa voucher
- [V] Xóa voucher

#### 11. Quản lý Phiếu thu / Phiếu chi
- [V] Tạo phiếu thu
- [V] Tạo phiếu chi
- [V] Xem danh sách phiếu thu/chi

#### 12. Thống kê & Báo cáo
- [V] Thống kê tồn kho
- [V] Thống kê hóa đơn
- [V] Thống kê tài chính (doanh thu/chi phí)
- [V] Lọc theo ngày/tháng/năm

### ❌ Chưa triển khai (TODO)

#### 13. Audit Log & Giám sát
- [ ] Xem nhật ký hệ thống (AuditLog table tồn tại, nhưng **chưa có API/UI**)
- [ ] Tra cứu lịch sử hành động
- [ ] Giám sát hoạt động thời gian thực

#### 14. Cấu hình hệ thống
- [ ] Quản lý JWT tokens (chỉ có auto-expiry)
- [ ] Cấu hình thông số mặc định
- [ ] Backup / Restore dữ liệu
- [ ] Thiết lập tham số bảo mật

---

## 5. Tạo tài khoản & Cấp tài khoản nhân viên

### Quy tắc username & password

| Role | Pattern username | Password mẫu | Ví dụ |
|---|---|---|---|
| **Admin** | `admin.{tên}` | `Admin@2026` | `admin.huong` |
| **NV_BanHang** | `banhang.{tên}` | `BanHang@2026` | `banhang.minh`, `banhang.anh` |
| **NV_Kho** | `kho.{tên}` | `Kho@2026` | `kho.cuong`, `kho.thao` |

- Username: viết thường, phân cách bằng `.`
- Tên ngắn 3–6 ký tự (lấy từ `NhanVien.TenNV`)
- Password có **ký tự đặc biệt + số + chữ hoa**

### Hướng dẫn thao tác trên giao diện

#### Bước 1 — Đăng nhập với quyền Admin
Mở `http://localhost:4444`, đăng nhập bằng tài khoản admin.

#### Bước 2 — Vào menu **Nhân viên** (`/nhan-vien`)
- Hệ thống hiển thị danh sách nhân viên hiện có
- Có nút **"Thêm nhân viên"** ở góc phải

#### Bước 3 — Tạo nhân viên mới
Điền form:
| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Họ tên | ✅ | VD: `Nguyễn Văn A` |
| Số điện thoại | ✅ | 10 số, duy nhất |
| Email | ❌ | |
| Ngày vào làm | ✅ | mặc định hôm nay |
| **Tài khoản** | ⬜ checkbox | Tick nếu muốn cấp tài khoản đăng nhập |
| Username (nếu có) | ✅ | theo pattern `role.tên` |
| Mật khẩu | ✅ | hệ thống hash bcrypt, không lưu plain text |
| **Vai trò** | ✅ | `Admin` / `NV_BanHang` / `NV_Kho` |

Bấm **Lưu** → hệ thống tạo nhân viên + tài khoản (nếu tick).

#### Bước 4 — Reset mật khẩu nhân viên
1. Tìm nhân viên trong danh sách
2. Bấm **"Reset mật khẩu"** (icon 🔑)
3. Nhập mật khẩu mới hoặc dùng nút **"Tạo mật khẩu tự động"**
4. Hệ thống sẽ gửi mật khẩu mới cho nhân viên qua kênh nội bộ

> 💡 **Tip:** Dùng nút "Tạo mật khẩu tự động" để sinh mật khẩu mạnh theo pattern (`Role@2026` + hậu tố ngẫu nhiên).

#### Bước 5 — Vô hiệu hóa tài khoản
- Bấm **"Khóa tài khoản"** để nhân viên không đăng nhập được
- Tài khoản bị khóa không bị xóa khỏi DB, chỉ chuyển trạng thái

### API liên quan

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/nhan-vien` | Tạo nhân viên (kèm tài khoản nếu có) |
| `POST` | `/api/nhan-vien/:id/reset-password` | Reset mật khẩu |
| `POST` | `/api/nhan-vien/:id/khoa` | Khóa tài khoản |
| `POST` | `/api/nhan-vien/:id/mo-khoa` | Mở khóa tài khoản |

---

## Ngưỡng phân loại (Constants)

| Hằng số | Giá trị | Vị trí |
|---|---|---|
| `SEG_VIP` | 5.000.000 | `backend/src/modules/khachHang/khachHang.service.js` |
| `SEG_LOYAL_SPEND` | 1.000.000 | `backend/src/modules/khachHang/khachHang.service.js` |
| `SEG_LOYAL_ORDERS` | 5 | `backend/src/modules/khachHang/khachHang.service.js` |
| `SEG_STRATEGIC` | 50.000.000 | `backend/src/modules/nhaCungCap/nhaCungCap.service.js` |
| `SEG_REGULAR_SPEND` | 10.000.000 | `backend/src/modules/nhaCungCap/nhaCungCap.service.js` |
| `SEG_REGULAR_ORDERS` | 5 | `backend/src/modules/nhaCungCap/nhaCungCap.service.js` |

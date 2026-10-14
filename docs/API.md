# 🔌 SecurePharma — Backend API Reference

> Tài liệu tham chiếu đầy đủ cho mọi endpoint REST của backend (`http://localhost:8080`).
> Cập nhật: 16/09/2026 — Phase 3A → 3H.

---

## 1. Quy ước chung

### 1.1 Base URL & Headers

```
Base URL:  http://localhost:8080
Headers:
  Content-Type: application/json
  Authorization: Bearer <accessToken>     # hầu hết endpoint cần
```

### 1.2 Vai trò (RBAC)

| Role | Mô tả |
|---|---|
| `Admin` | Toàn quyền |
| `NV_BanHang` | Bán thuốc, quản lý khách hàng, xem hóa đơn |
| `NV_Kho` | Quản lý kho, nhập thuốc, điều chỉnh tồn |

### 1.3 Format response thống nhất

Mọi response đều theo helper `backend/src/utils/response.js`:

```json
// ✅ Success
{
  "success": true,
  "message": "Thành công",
  "data": { /* payload */ }
}

// ✅ Success có phân trang
{
  "success": true,
  "message": "Thành công",
  "data": {
    "items": [ /* ... */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 123,
      "totalPages": 13
    }
    /* extra (vd: counts cho filter chips) */
  }
}

// ❌ Error
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",        // ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | VALIDATION_ERROR
    "message": "Không tìm thấy..."
  }
}
```

### 1.4 HTTP status codes

| Code | Ý nghĩa |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request — validate input fail |
| `401` | Unauthorized — thiếu/sai token |
| `403` | Forbidden — không đủ quyền |
| `404` | Not Found |
| `409` | Conflict — trùng dữ liệu (vd: SĐT đã tồn tại) |
| `429` | Too Many Requests — rate limit |
| `500` | Internal Server Error |

### 1.5 Rate limiting

| Middleware | Áp dụng cho | Mặc định |
|---|---|---|
| `authLimiter` | `/auth/login`, `/auth/refresh` | chống brute-force |
| `writeLimiter` | mọi `POST/PUT/PATCH/DELETE` | 100 req / 15 phút |

### 1.6 Audit log

Mọi hành động ghi/đổi trạng thái đều được ghi vào bảng `AuditLog` (qua `logAudit()`). Trường lưu: `Action`, `TableName`, `RecordID`, `OldValue`, `NewValue`, `MaNV`, `IP`, `UserAgent`.

---

## 2. Auth (`/api/auth`)

> **Mount:** `app.js` → `authRouter` (`src/modules/auth/auth.routes.js`)

| Method | Path | Auth | Body / Query | Mô tả |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public (rate-limit) | `{ username, password }` | Đăng nhập, trả `token` + `refreshToken` |
| `POST` | `/api/auth/refresh` | Public (rate-limit) | `{ refreshToken }` | Cấp access token mới (rotation) |
| `POST` | `/api/auth/logout` | Bearer | — | Revoke mọi refresh token của user hiện tại |
| `GET` | `/api/auth/me` | Bearer | — | Thông tin user đang đăng nhập |
| `POST` | `/api/auth/change-password` | Bearer | `{ currentPassword, newPassword, confirmPassword }` | Đổi mật khẩu (revoke refresh token cũ) |

### 2.1 `POST /api/auth/login`

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "admin.huong", "password": "Admin@2026" }
```

**Response 200:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "<jwt access 15m>",
    "refreshToken": "<jwt refresh 7d>",
    "user": {
      "username": "admin.huong",
      "role": "Admin",
      "maNV": 1,
      "employee": {
        "maNV": 1,
        "tenNV": "Nguyễn Thị Hương",
        "sdt": "0901234567",
        "gioiTinh": "Nu"
      }
    }
  }
}
```

**Lỗi hay gặp:**

| Code | Nguyên nhân |
|---|---|
| `400` | Thiếu username/password |
| `401` | Sai thông tin / tài khoản bị khóa 15 phút (sau 5 lần sai) |
| `429` | Quá nhiều request — rate-limit |

### 2.2 `POST /api/auth/refresh`

```http
POST /api/auth/refresh
{ "refreshToken": "<jwt refresh>" }
```

- Secret RIÊNG (`JWT_REFRESH_SECRET`), claim `type="refresh"`.
- Có **rotation thật**: mỗi lần refresh thành công → tăng `TokenVersion` → token cũ hết hiệu lực ngay.
- Validate `TokenVersion` để chặn reuse sau đổi mật khẩu.

### 2.3 `POST /api/auth/logout`

> Revoke toàn bộ refresh token (tăng `TokenVersion`) của user hiện tại.

### 2.4 `GET /api/auth/me`

```json
{
  "success": true,
  "data": {
    "username": "admin.huong",
    "role": "Admin",
    "trangThai": "HoatDong",
    "maNV": 1,
    "employee": {
      "maNV": 1, "tenNV": "Nguyễn Thị Hương",
      "sdt": "0901234567", "gioiTinh": "Nu",
      "ngayVaoLam": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

### 2.5 `POST /api/auth/change-password`

```http
POST /api/auth/change-password
Authorization: Bearer <token>

{
  "currentPassword": "Admin@2026",
  "newPassword": "Admin@2027",
  "confirmPassword": "Admin@2027"
}
```

- Mật khẩu mới ≥ 6 ký tự, phải khớp `confirmPassword`.
- Thành công → `TokenVersion++` → mọi refresh token cũ bị revoke.

---

## 3. Danh mục thuốc (`/api/danh-muc`)

> **Mount:** `danhMucRouter` (`src/modules/danhMuc/danhMuc.routes.js`)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/danh-muc` | Bearer | All | Danh sách + count thuốc / DM |
| `GET` | `/api/danh-muc/:maDM` | Bearer | All | Chi tiết 1 DM |
| `POST` | `/api/danh-muc` | Bearer | **Admin** | Tạo mới |
| `PUT` | `/api/danh-muc/:maDM` | Bearer | **Admin** | Cập nhật |
| `DELETE` | `/api/danh-muc/:maDM` | Bearer | **Admin** | Xóa |

### 3.1 `GET /api/danh-muc`

```json
[
  { "maDM": "DM_GIAMDAU", "tenDM": "Giảm đau", "soThuoc": 12 },
  { "maDM": "DM_KHANGVIEM", "tenDM": "Kháng viêm", "soThuoc": 8 }
]
```

### 3.2 `POST /api/danh-muc`

```http
{ "maDM": "DM_GIAMDAU", "tenDM": "Giảm đau - Hạ sốt" }
```

Validate: `maDM` ≤ 20 ký tự, `tenDM` ≤ 200 ký tự.

---

## 4. Thuốc (`/api/thuoc`)

> **Mount:** `thuocRouter` (`src/modules/thuoc/thuoc.routes.js`)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/thuoc` | Bearer | All | Danh sách + filter + phân trang |
| `GET` | `/api/thuoc/:id` | Bearer | All | Chi tiết |
| `GET` | `/api/thuoc/:id/similar` | Bearer | All | Thuốc cùng hoạt chất (gợi ý thay thế khi thuốc hết) |
| `POST` | `/api/thuoc` | Bearer | **Admin** | Tạo mới |
| `PUT` | `/api/thuoc/:id` | Bearer | **Admin** | Cập nhật |
| `DELETE` | `/api/thuoc/:id` | Bearer | **Admin** | Xóa |

### 4.1 `GET /api/thuoc`

**Query params:**

| Param | Type | Default | Ý nghĩa |
|---|---|---|---|
| `keyword` | string | `""` | Tìm theo `tenThuoc`, `hoatChat` |
| `maDM` | string | `null` | Lọc theo mã danh mục |
| `trangThaiTon` | `'all' \| 'in' \| 'low' \| 'out'` | `'all'` | Lọc theo tình trạng tồn kho |
| `sort` | string | `'ma_desc'` | Sắp xếp |
| `page` | int ≥ 1 | `1` | Trang |
| `limit` | 1–100 | `10` | Số bản ghi / trang |

**Response (có phân trang + counts):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "maThuoc": 1,
        "tenThuoc": "Paracetamol 500mg",
        "hoatChat": "Paracetamol",
        "khoiLuong": "500mg",
        "giaBanThamKhao": 25000,
        "maDM": "DM_GIAMDAU",
        "tenDM": "Giảm đau",
        "soLuongTonKho": 120,
        "trangThaiTon": "in",
        "moTa": "...",
        "lieuDung": "...",
        "chongChiDinh": "...",
        "ghiChu": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 },
    "counts": { "inStock": 30, "low": 10, "out": 5 }
  }
}
```

### 4.2 `GET /api/thuoc/:id/similar?limit=5&inStockOnly=true`

```http
GET /api/thuoc/1/similar?limit=6&inStockOnly=true
```

Trả về tối đa 5 (mặc định) thuốc cùng `hoatChat`.

- `inStockOnly=true` (mặc định): chỉ trả thuốc **đang còn hàng và chưa hết hạn** — dùng cho nghiệp vụ "gợi ý thuốc thay thế" khi thuốc nguồn hết.
- `inStockOnly=false`: trả về tất cả (kể cả hết hàng) — dùng cho trang chi tiết thuốc.
- Sắp xếp: thuốc **cùng `KhoiLuong`** (tương đương) trước, sau đó mới đến khác hàm lượng. Mỗi field `tuongDuong` (boolean) đánh dấu thuốc thay thế tương đương.

### 4.3 `POST /api/thuoc`

```http
{
  "tenThuoc": "Paracetamol 500mg",
  "hoatChat": "Paracetamol",
  "khoiLuong": "500mg",
  "giaBanThamKhao": 25000,
  "maDM": "DM_GIAMDAU",
  "moTa": "Giảm đau, hạ sốt",
  "lieuDung": "Người lớn 1-2 viên / lần",
  "chongChiDinh": "Suy gan nặng",
  "ghiChu": null
}
```

Validate: `tenThuoc`, `maDM`, `giaBanThamKhao` (≥ 0) bắt buộc. `maDM` phải tồn tại trong `DanhMuc`.

---

## 5. Nhà cung cấp (`/api/nha-cung-cap`)

> **Mount:** `nhaCungCapRouter` (`src/modules/nhaCungCap/nhaCungCap.routes.js`)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/nha-cung-cap` | Bearer | All | Danh sách + filter |
| `GET` | `/api/nha-cung-cap/stats` | Bearer | All | Thống kê tổng quan (cards đầu trang) |
| `GET` | `/api/nha-cung-cap/:id` | Bearer | All | Chi tiết |
| `GET` | `/api/nha-cung-cap/:id/phieu-nhap` | Bearer | All | Lịch sử phiếu nhập của NCC |
| `POST` | `/api/nha-cung-cap` | Bearer | **Admin** | Tạo mới |
| `PUT` | `/api/nha-cung-cap/:id` | Bearer | **Admin** | Cập nhật |
| `DELETE` | `/api/nha-cung-cap/:id` | Bearer | **Admin** | Xóa |

### 5.1 `GET /api/nha-cung-cap`

**Query:** `keyword`, `segment` (`Moi \| ThanThiet \| ...`), `page`, `limit`.

### 5.2 `POST /api/nha-cung-cap`

```http
{
  "tenNCC": "Công ty Dược Hà Nội",
  "diaChi": "123 Hoàng Hoa Thám, Hà Nội",
  "sdt": "0243456789"
}
```

Validate: `tenNCC` bắt buộc; `sdt` (nếu có) phải là 10–11 chữ số.

---

## 6. Khách hàng (`/api/khach-hang`)

> **Mount:** `khachHangRouter` (`src/modules/khachHang/khachHang.routes.js`)
> **RBAC:** Read/Write dành cho **Admin + NV_BanHang** (NV_Kho không thấy KH). Delete chỉ **Admin**.

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/khach-hang` | Bearer | Admin, NV_BanHang | Danh sách + filter |
| `GET` | `/api/khach-hang/stats` | Bearer | Admin, NV_BanHang | Thống kê |
| `GET` | `/api/khach-hang/:id` | Bearer | Admin, NV_BanHang | Chi tiết |
| `GET` | `/api/khach-hang/:id/hoa-don` | Bearer | Admin, NV_BanHang | Lịch sử hóa đơn |
| `POST` | `/api/khach-hang` | Bearer | Admin, NV_BanHang | Tạo mới |
| `PUT` | `/api/khach-hang/:id` | Bearer | Admin, NV_BanHang | Cập nhật |
| `DELETE` | `/api/khach-hang/:id` | Bearer | **Admin** | Xóa |

### 6.1 `GET /api/khach-hang`

**Query:** `keyword`, `segment` (`Moi \| ThanThiet \| VIP`), `gioiTinh` (`Nam \| Nu`), `page`, `limit`.

### 6.2 `POST /api/khach-hang`

```http
{
  "tenKH": "Nguyễn Văn A",
  "sdt": "0901234567",
  "gioiTinh": "Nam"
}
```

- `tenKH` bắt buộc.
- `sdt` (nếu có) 10–11 chữ số — **đã được mã hóa AES** ở tầng DB.
- Trùng SĐT → `409 CONFLICT`.

### 6.3 `GET /api/khach-hang/:id/hoa-don?limit=10`

Trả về tối đa 10 (mặc định) hóa đơn gần nhất, tối đa 50.

---

## 7. Nhân viên (`/api/nhan-vien`)

> **Mount:** `nhanVienRouter` (`src/modules/nhanVien/nhanVien.routes.js`)
> **RBAC:** Tất cả chỉ **Admin**.

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/nhan-vien` | Bearer | Admin | Danh sách + filter |
| `GET` | `/api/nhan-vien/stats` | Bearer | Admin | Thống kê |
| `GET` | `/api/nhan-vien/:id` | Bearer | Admin | Chi tiết |
| `GET` | `/api/nhan-vien/:id/hoa-don` | Bearer | Admin | Lịch sử hóa đơn NV đã lập |
| `POST` | `/api/nhan-vien` | Bearer | Admin | Tạo mới |
| `PUT` | `/api/nhan-vien/:id` | Bearer | Admin | Cập nhật |
| `DELETE` | `/api/nhan-vien/:id` | Bearer | Admin | Xóa |

### 7.1 `POST /api/nhan-vien`

```http
{
  "tenNV": "Trần Văn Minh",
  "sdt": "0987654321",
  "gioiTinh": "Nam",
  "luong": 8000000,
  "ngayVaoLam": "2026-09-16",
  "trangThai": "DangLam"
}
```

Validate: `tenNV` bắt buộc; `luong` ≥ 0.

### 7.2 Ràng buộc đặc biệt

- Không thể **đổi trạng thái** chính mình sang giá trị ≠ `DangLam`.
- Không thể **xóa** chính mình.

---

## 8. Kho & Lô thuốc (`/api/kho`)

> **Mount:** `khoRouter` (`src/modules/kho/kho.routes.js`)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/kho/thong-ke-tong` | Bearer | Admin, NV_Kho | Tổng quan tồn kho (Hub Kho) |
| `GET` | `/api/kho/ton-kho` | Bearer | All | Danh sách tồn kho + phân trang |
| `GET` | `/api/kho/sap-het-hang` | Bearer | All | Cảnh báo sắp hết (`?nguong=10`) |
| `GET` | `/api/kho/sap-het-han` | Bearer | All | Cảnh báo sắp hết hạn (`?days=30`) |
| `GET` | `/api/kho/lo/:maThuoc` | Bearer | All | Lô còn hàng của 1 thuốc (FIFO) + điều chỉnh |
| `GET` | `/api/kho/dieu-chinh` | Bearer | Admin, NV_Kho | Lịch sử điều chỉnh tồn (audit trail) |
| `PATCH` | `/api/kho/lo/:maLo/ton-kho` | Bearer | **Admin, NV_Kho** | Điều chỉnh tồn sau kiểm kê |

### 8.1 `GET /api/kho/thong-ke-tong`

```json
{
  "tongTon": 4520,
  "giaTriTonKho": 285000000,
  "soThuocCoTon": 78,
  "tongSoLo": 142
}
```

### 8.2 `PATCH /api/kho/lo/:maLo/ton-kho`

```http
PATCH /api/kho/lo/123/ton-kho
{
  "soLuongMoi": 95,
  "lyDo": "Kiểm kê định kỳ tháng 9 — hao hụt 5 viên"
}
```

Validate:
- `maLo` là số nguyên > 0
- `soLuongMoi` ∈ `[0, 1_000_000_000]`
- `lyDo` 3–500 ký tự

→ Ghi `AuditLog` action `ADJUST_TONKHO` (old/new value, lý do, `maNV`).

---

## 9. Phiếu nhập (`/api/phieu-nhap`)

> **Mount:** `phieuNhapRouter` (`src/modules/phieuNhap/phieuNhap.routes.js`)
> **RBAC:** **Admin + NV_Kho**

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/phieu-nhap` | Bearer | Admin, NV_Kho | Danh sách + filter |
| `GET` | `/api/phieu-nhap/:id` | Bearer | Admin, NV_Kho | Chi tiết |
| `POST` | `/api/phieu-nhap` | Bearer | Admin, NV_Kho | Tạo phiếu nhập (+ nhiều lô) |
| `PUT` | `/api/phieu-nhap/:id/huy` | Bearer | Admin, NV_Kho | Hủy phiếu (set `TrangThai='Huy'`) |

### 9.1 `POST /api/phieu-nhap`

```http
{
  "maNCC": 1,
  "chiTiet": [
    {
      "maThuoc": 1,
      "soLuongNhap": 100,
      "ngaySX": "2026-08-01",
      "hanSD": "2028-08-01",
      "giaNhap": 18000
    }
  ]
}
```

Validate từng lô:
- `maThuoc`, `soLuongNhap`, `ngaySX`, `hanSD`, `giaNhap` bắt buộc
- `soLuongNhap` > 0
- `hanSD > ngaySX` **và** `hanSD > hôm nay`
- `giaNhap` ≥ 0

→ Tạo transaction, ghi `PhieuNhap` + `LoThuoc_ChiTietNhap`, audit `CREATE_PHIEUNHAP`.

### 9.2 `PUT /api/phieu-nhap/:id/huy`

- Set `TrangThai='Huy'` (không xóa lô, giữ lịch sử).
- **Không hủy được nếu** đã bán một phần (`SoLuongTonKho < SoLuongNhap`).
- Audit `CANCEL_PHIEUNHAP`.

---

## 10. Bán hàng (`/api/ban-hang`) & Hóa đơn (`/api/hoa-don`)

> **Mount:**
> - `banHangRouter` → `/api/ban-hang` (POST = action tạo hóa đơn)
> - `hoaDonRouter` → `/api/hoa-don` (resource collection, hủy)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `POST` | `/api/ban-hang` | Bearer | Admin, NV_BanHang | **Tạo hóa đơn + trừ tồn kho (FIFO)** |
| `GET` | `/api/hoa-don` | Bearer | Admin, NV_BanHang | Danh sách + filter + phân trang |
| `GET` | `/api/hoa-don/:id` | Bearer | Admin, NV_BanHang | Chi tiết |
| `PUT` | `/api/hoa-don/:id/huy` | Bearer | **Admin** | Hủy hóa đơn |

### 10.1 `POST /api/ban-hang`

```http
{
  "maKH": 1,                     // optional — khách lẻ: null
  "tienKhachDua": 100000,
  "giamGia": 5000,                // optional, default 0
  "items": [
    { "maThuoc": 1, "soLuong": 2, "donGia": 25000 },
    { "maThuoc": 5, "soLuong": 1, "donGia": 60000 }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "maHD": 123,
    "maKH": 1,
    "maNV": 2,
    "ngayGioLap": "2026-09-16T10:30:00.000Z",
    "trangThai": "DaThanhToan",
    "tongTien": 155000,
    "giamGia": 5000,
    "thanhTien": 150000,
    "tienKhachDua": 100000,
    "tienTraLai": -50000,
    "chiTiet": [
      {
        "maThuoc": 1, "tenThuoc": "Paracetamol 500mg",
        "soLuong": 2, "donGia": 25000, "thanhTien": 50000,
        "maLo": 12, "soLuongTonSau": 118
      }
    ]
  }
}
```

- **FIFO**: tự động trừ theo lô cũ nhất (`NgaySX` ASC, hết hạn sớm ưu tiên).
- Lỗi: `INSUFFICIENT_STOCK`, `INVALID_THOI_GIAN`, FK violation.

### 10.2 `GET /api/hoa-don`

**Query:** `keyword`, `from` (yyyy-mm-dd), `to` (yyyy-mm-dd), `page`, `limit`.

### 10.3 `PUT /api/hoa-don/:id/huy`

- Chỉ Admin.
- Hoàn tồn kho về các lô tương ứng.
- Audit `CANCEL_HOADON`.

---

## 11. Phiếu chi (`/api/phieu-chi`)

> **Mount:** `phieuChiRouter` (`src/modules/phieuChi/phieuChi.routes.js`)
> **RBAC:** **Admin only**

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/phieu-chi` | Bearer | Admin | Danh sách + filter |
| `GET` | `/api/phieu-chi/so-du` | Bearer | Admin | Số dư quỹ hiện tại |
| `GET` | `/api/phieu-chi/stats` | Bearer | Admin | Stats cho trang Tài chính (`?days=30`) |
| `GET` | `/api/phieu-chi/:id` | Bearer | Admin | Chi tiết |
| `POST` | `/api/phieu-chi` | Bearer | Admin | Tạo phiếu chi |

### 11.1 `POST /api/phieu-chi`

```http
{
  "soTien": 1500000,
  "noiDung": "Thanh toán tiền điện tháng 9"
}
```

Validate: `soTien` bắt buộc (> 0), `noiDung` bắt buộc (không rỗng).

### 11.2 `GET /api/phieu-chi/so-du`

```json
{ "soDu": 25000000, "tongThu": 85000000, "tongChi": 60000000 }
```

### 11.3 `GET /api/phieu-chi/stats?days=30`

Trả về: `tongChiTheoNgay[]`, `chiTheoDanhMuc[]`, `top5NoiDung[]` cho chart + top list FE.

---

## 12. Phiếu thu (`/api/phieu-thu`)

> **Mount:** `phieuThuRouter` (`src/modules/phieuThu/phieuThu.routes.js`)
> **RBAC:** **Admin + NV_BanHang**

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/phieu-thu` | Bearer | Admin, NV_BanHang | Danh sách + filter |
| `GET` | `/api/phieu-thu/:id` | Bearer | Admin, NV_BanHang | Chi tiết |
| `POST` | `/api/phieu-thu` | Bearer | Admin, NV_BanHang | Tạo phiếu thu |

### 12.1 `POST /api/phieu-thu`

```http
{
  "soTien": 250000,
  "noiDung": "Khách thanh toán công nợ hóa đơn HD-123"
}
```

> Phiếu thu dùng cho công nợ / thu khác (không bao gồm doanh thu bán hàng — doanh thu ghi nhận tự động qua `HoaDon`).

---

## 13. Thống kê (`/api/thong-ke`)

> **Mount:** `thongKeRouter` (`src/modules/thongKe/thongKe.routes.js`)

| Method | Path | Auth | Role | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/thong-ke/kho` | Bearer | All | Dashboard Kho |
| `GET` | `/api/thong-ke/hoa-don` | Bearer | All | Doanh thu + top thuốc (`?from&to`) |
| `GET` | `/api/thong-ke/hoa-don/list` | Bearer | All | Danh sách chi tiết hóa đơn trong kỳ (phân trang, `?from&to&page&limit`) |
| `GET` | `/api/thong-ke/tai-chinh` | Bearer | **Admin** | Tổng thu/chi/lợi nhuận (`?from&to`) |

### 13.1 Query chung

| Param | Format | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `from` | `yyyy-mm-dd` | Không | Ngày bắt đầu |
| `to` | `yyyy-mm-dd` | Không | Ngày kết thúc |

Validate: `to >= from`, range tối đa **365 ngày** (xem `dateRange.logic.js`).

### 13.2 `GET /api/thong-ke/kho`

```json
{
  "tongGiaTriTonKho": 285000000,
  "soLuongThuocSapHet": 8,
  "soLuongLoSapHetHan": 14,
  "topThuocTonNhieu": [
    { "maThuoc": 1, "tenThuoc": "Paracetamol 500mg", "soLuongTon": 1200 }
  ],
  "topThuocSapHet": [
    { "maThuoc": 22, "tenThuoc": "...", "soLuongTon": 5 }
  ]
}
```

### 13.3 `GET /api/thong-ke/hoa-don?from=2026-09-01&to=2026-09-30`

```json
{
  "tongDoanhThu": 45000000,
  "soHoaDon": 320,
  "hoaDonTheoNgay": [
    { "ngay": "2026-09-01", "doanhThu": 1500000, "soHoaDon": 12 }
  ],
  "topThuocBanChay": [
    { "maThuoc": 1, "tenThuoc": "Paracetamol 500mg", "soLuongBan": 240, "doanhThu": 6000000 }
  ]
}
```

### 13.4 `GET /api/thong-ke/tai-chinh?from=2026-09-01&to=2026-09-30` (Admin)

```json
{
  "tongThu": 45000000,
  "tongChi": 12000000,
  "loiNhuan": 33000000,
  "thuTheoNgay": [...],
  "chiTheoNgay": [...],
  "topPhieuChi": [...],
  "topPhieuThu": [...]
}
```

---

## 14. Endpoints hệ thống

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api` | Welcome — metadata API |
| `GET` | `/api/health` | Health check (DB + uptime) |

```json
// GET /api/health
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-16T10:30:00.000Z",
    "uptime": 1234.5
  },
  "message": "Server is running"
}
```

---

## 15. Bảng tổng hợp nhanh (cheat-sheet)

| Nhóm | Base path | Endpoints | RBAC chính |
|---|---|---|---|
| Auth | `/api/auth` | 5 | Public + Bearer |
| Danh mục | `/api/danh-muc` | 5 | Read: All · Write: Admin |
| Thuốc | `/api/thuoc` | 6 | Read: All · Write: Admin |
| NCC | `/api/nha-cung-cap` | 7 | Read: All · Write: Admin |
| Khách hàng | `/api/khach-hang` | 7 | Admin + NV_BanHang · Delete: Admin |
| Nhân viên | `/api/nhan-vien` | 7 | Admin |
| Kho | `/api/kho` | 7 | Read: All · Adjust: Admin/NV_Kho |
| Phiếu nhập | `/api/phieu-nhap` | 4 | Admin + NV_Kho |
| Bán hàng | `/api/ban-hang` | 1 | Admin + NV_BanHang |
| Hóa đơn | `/api/hoa-don` | 3 | Read: Admin + NV_BanHang · Hủy: Admin |
| Phiếu chi | `/api/phieu-chi` | 5 | Admin |
| Phiếu thu | `/api/phieu-thu` | 3 | Admin + NV_BanHang |
| Thống kê | `/api/thong-ke` | 3 | Tài chính: Admin · Còn lại: All |
| Hệ thống | `/api`, `/api/health` | 2 | Public |

**Tổng cộng: ~70 endpoints.**

---

## 16. Lỗi thường gặp & mã lỗi

| Mã | HTTP | Ý nghĩa |
|---|---|---|
| `ERROR` | 400 | Lỗi validate chung |
| `VALIDATION_ERROR` | 400 | Lỗi validate có `details[]` |
| `UNAUTHORIZED` | 401 | Thiếu/sai/hết hạn token |
| `FORBIDDEN` | 403 | Không đủ role |
| `NOT_FOUND` | 404 | Không tìm thấy resource |
| `CONFLICT` | 409 | Trùng dữ liệu (vd: SĐT) |
| (không code) | 429 | Rate limit |
| (không code) | 500 | Lỗi server (xem log) |

---

## 17. Công cụ test nhanh

```bash
# Lấy token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin.huong","password":"Admin@2026"}' \
  | jq -r '.data.token')

# Gọi API có Bearer
curl -s http://localhost:8080/api/thuoc \
  -H "Authorization: Bearer $TOKEN" | jq
```

> 💡 Trỏ Swagger UI vào base URL trên nếu muốn khám phá trực quan (chưa tích hợp ở phase hiện tại).

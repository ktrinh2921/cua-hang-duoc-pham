# 🏥 SecurePharma - Website Quản Lý Cửa Hàng Dược Phẩm

> **Đề tài:** Xây dựng website quản lý cửa hàng dược phẩm có tích hợp giải pháp an toàn
> **Ngành:** An toàn thông tin
> **Cơ sở dữ liệu:** Microsoft SQL Server 2019

---

## 📋 MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Ngăn xếp công nghệ](#2-ngăn-xếp-công-nghệ)
3. [Sơ đồ tổng quan hệ thống](#3-sơ-đồ-tổng-quan-hệ-thống)
4. [Phân quyền RBAC](#4-phân-quyền-rbac)
5. [Chức năng hệ thống](#5-chức-năng-hệ-thống)
6. [Thiết kế Cơ sở dữ liệu (SQL Server)](#6-thiết-kế-cơ-sở-dữ-liệu-sql-server)
7. [Bảo mật & Giải pháp an toàn](#7-bảo-mật--giải-pháp-an-toàn)
8. [Cấu trúc dự án gợi ý](#8-cấu-trúc-dự-án-gợi-ý)
9. [API Endpoints gợi ý](#9-api-endpoints-gợi-ý)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mục tiêu
- Số hóa toàn bộ quy trình quản lý hiệu thuốc (nhập, bán, tồn kho, tài chính, nhân sự)
- Bảo đảm **an toàn thông tin** cho dữ liệu nhạy cảm (thuốc, khách hàng, doanh thu)
- Tuân thủ **RBAC + nguyên tắc đặc quyền tối thiểu**
- Chống lại các lỗ hổng OWASP Top 10: **SQL Injection, XSS, CSRF, Broken Access Control**

### 1.2. Đối tượng sử dụng
| Vai trò | Quyền hạn |
|---|---|
| **Admin (Chủ hiệu)** | Toàn quyền: quản lý nhân viên, tài chính, thống kê, cấu hình |
| **Nhân viên bán hàng** | Bán thuốc, tìm kiếm thuốc, xem thông tin cá nhân |
| **Thủ kho** | Nhập thuốc, quản lý lô/hạn sử dụng, thống kê tồn kho |

### 1.3. Tiêu chí nghiệp vụ
- ✅ Quản lý **lô thuốc + hạn sử dụng** (đặc thù ngành dược)
- ✅ Cảnh báo thuốc sắp hết hạn / sắp hết hàng
- ✅ Theo dõi doanh thu theo ngày/tuần/tháng/quý/năm
- ✅ Phân quyền theo **chức năng + dữ liệu**

---

## 2. NGĂN XẾP CÔNG NGHỆ

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| **Frontend** | **React 18 (Vite)** + TypeScript + React Router v6 + TailwindCSS + Ant Design / Material UI + Recharts | SPA hiện đại, type-safe, component tái sử dụng, biểu đồ đẹp |
| **State Management** | **Redux Toolkit** (RTK) + RTK Query hoặc **Zustand** + TanStack Query (React Query) | Quản lý state + cache API hiệu quả |
| **Backend** | Node.js (Express) + TypeScript **hoặc** ASP.NET Core / C# | Phù hợp kết nối SQL Server |
| **Database** | **Microsoft SQL Server 2019** | Theo yêu cầu đề tài |
| **ORM/Driver** | Sequelize (Node) / TypeORM / Prisma **hoặc** Entity Framework (.NET) / `mssql` package | Hỗ trợ parameterized query chống SQLi |
| **Auth** | JWT (Access 15 phút + Refresh 7 ngày) + bcrypt/argon2 + MFA TOTP | Xác thực an toàn |
| **Mã hóa** | AES-256 cho dữ liệu nhạy cảm, TLS 1.3 cho truyền tải, HTTPS bắt buộc | Bảo mật dữ liệu |
| **Thư viện bảo mật FE** | DOMPurify, react-helmet-async, js-cookie (HttpOnly), axios interceptor | Sanitize HTML, CSP, CSRF token |
| **Thư viện bảo mật BE** | helmet, express-rate-limit, csurf, xss, express-validator | Hardening middleware |
| **Logging** | winston / pino + audit log table | Theo dõi truy cập |
| **Testing bảo mật** | OWASP ZAP, sqlmap, Burp Suite | Kiểm thử lỗ hổng |

---

## 3. SƠ ĐỒ TỔNG QUAN HỆ THỐNG

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                            │
│   HTML/CSS/JS ── Bootstrap / React ── Trang Đăng nhập / Dashboard  │
└────────────────┬─────────────────────────────────────────────────────┘
                 │ HTTPS (TLS 1.3) – JWT trong Authorization Header
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js / ASP.NET)                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ Auth Middleware ─ RBAC Middleware ─ Rate-Limit ─ Validator   │   │
│   └──────────────────────────────────────────────────────────────┘   │
│   ┌────────────┬────────────┬────────────┬─────────────────────┐    │
│   │ Admin API  │ Pharmacy   │ Inventory  │ HR / Finance APIs   │    │
│   │ Module     │ Module     │ Module     │ Module              │    │
│   └────────────┴────────────┴────────────┴─────────────────────┘    │
└────────────────┬─────────────────────────────────────────────────────┘
                 │ TLS + Connection String (Encrypt=True)
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│              MICROSOFT SQL SERVER 2019                               │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ Database: SecurePharmaDB                                     │   │
│   │ Tables: TaiKhoan, NhanVien, Thuoc, LoThuoc, PhieuNhap,       │   │
│   │         HoaDon, ChiTietHoaDon, KhachHang, NhaCungCap,        │   │
│   │         DanhMuc, PhieuChi, PhieuThu, AuditLog                │   │
│   └──────────────────────────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ Stored Procedures / Views / Encryption (TDE + Column-Level) │   │
│   └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. PHÂN QUYỀN RBAC

### 4.1. Vai trò (Roles)

| Role | Mô tả |
|---|---|
| `Admin` | Chủ hiệu - toàn quyền |
| `NV_BanHang` | Nhân viên bán hàng |
| `NV_Kho` | Thủ kho / Quản lý kho |

### 4.2. Ma trận quyền

| Chức năng | Admin | NV_BanHang | NV_Kho |
|---|:-:|:-:|:-:|
| Đăng nhập / Đăng xuất | ✅ | ✅ | ✅ |
| Tìm kiếm thuốc | ✅ | ✅ | ✅ |
| Bán thuốc (lập hóa đơn) | ✅ | ✅ | ❌ |
| Nhập thuốc (phiếu nhập) | ✅ | ❌ | ✅ |
| Tạo phiếu chi | ✅ | ❌ | ❌ |
| Tạo phiếu thu | ✅ | ✅ | ❌ |
| Quản lý nhân viên | ✅ | ❌ | ❌ |
| Thống kê kho | ✅ | ✅ | ✅ |
| Thống kê hóa đơn | ✅ | ✅ | ❌ |
| Thống kê tài chính | ✅ | ❌ | ❌ |
| Xem Audit Log | ✅ | ❌ | ❌ |

### 4.3. Cấu trúc Permission/Role (DB)

```sql
-- Bảng trung gian Role - Permission để linh hoạt
CREATE TABLE Quyen (
    MaQuyen INT PRIMARY KEY IDENTITY,
    TenQuyen NVARCHAR(100) NOT NULL UNIQUE,
    MoTa NVARCHAR(500)
);

CREATE TABLE VaiTro_Quyen (
    MaVaiTro NVARCHAR(50) NOT NULL,
    MaQuyen INT NOT NULL,
    PRIMARY KEY (MaVaiTro, MaQuyen),
    FOREIGN KEY (MaQuyen) REFERENCES Quyen(MaQuyen)
);

-- TaiKhoan sẽ liên kết VaiTro tới NhanVien
```

---

## 5. CHỨC NĂNG HỆ THỐNG

> Module đánh dấu ⭐ = **trọng yếu** cho báo cáo và demo

### 5.1. ⭐ **Module Xác thực & Bảo mật đăng nhập**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 1 | Đăng nhập | Nhập `TenDangNhap`, `MatKhau` (đã hash bcrypt). Trả về **Access Token (JWT, 15 phút)** + **Refresh Token (7 ngày)**. Có **MFA** (TOTP qua Google Authenticator) cho Admin. Sau 5 lần sai → khóa tài khoản 15 phút. |
| 2 | Đăng xuất | Vô hiệu hóa Refresh Token (đưa vào blacklist). Ghi nhật ký. |
| 3 | Refresh Token | Cấp lại Access Token khi hết hạn (rotation). |
| 4 | Đổi mật khẩu | Yêu cầu mật khẩu cũ + mới (≥ 8 ký tự, có chữ hoa, số, ký tự đặc biệt). |
| 5 | Quên mật khẩu | Gửi email token reset (có thời hạn 15 phút), single use. |

### 5.2. ⭐ **Module Quản lý Thuốc & Danh mục**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 6 | CRUD Danh mục | Admin thêm/sửa/xóa nhóm thuốc (kháng sinh, giảm đau, ...). |
| 7 | CRUD Thuốc | Lưu `MaThuoc`, `TenThuoc`, `KhoiLuong`, `GiaBanThamKhao`, `MaDM`. Validate đầu vào. |
| 8 | Tìm kiếm thuốc | Tìm theo tên/hoạt chất/nhóm thuốc/NCC. Hỗ trợ phân trang, sắp xếp. Hiển thị lượng tồn. |

### 5.3. ⭐ **Module Quản lý Kho & Lô thuốc**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 9 | Tạo phiếu nhập | Chọn NCC, thêm nhiều lô thuốc (mỗi lô có `SoLuongNhap`, `NgaySX`, `HanSD`, `GiaNhap`). |
| 10 | Quản lý lô thuốc | Theo dõi `SoLuongTonKho` của từng lô. Cảnh báo thuốc sắp hết hạn (< 30 ngày). |
| 11 | Nhập kho | Sau khi phiếu nhập được duyệt → cộng `SoLuongTonKho` cho từng lô. |
| 12 | Thống kê tồn kho | Báo cáo thuốc **sắp hết** (≤ ngưỡng), **sắp hết hạn**, **đã hết hạn**. |

### 5.4. ⭐ **Module Bán hàng**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 13 | Lập hóa đơn | Chọn thuốc (auto-suggest), nhập số lượng. Hệ thống **chọn lô FIFO** (lô cũ nhất còn hàng). |
| 14 | Kiểm tra tồn kho | Realtime: nếu `SoLuongBan > SoLuongTonKho` → báo lỗi. |
| 15 | Thanh toán | Tính `TongTien = Σ(SoLuongBan × GiaBanThucTe)`. Ghi nhận `TienKhachDua`, `TienTraLai`. |
| 16 | In/Xem hóa đơn | Hiển thị chi tiết, in PDF hoặc xuất HTML. |
| 17 | Hủy hóa đơn | Chỉ Admin. Hoàn lại số lượng về lô tương ứng, ghi log. |

### 5.5. **Module Quản lý Khách hàng & NCC**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 18 | CRUD Khách hàng | Lưu `TenKH`, `SDT`, `GioiTinh`. SDT **mã hóa AES-256** khi lưu, giải mã khi hiển thị (cần quyền). |
| 19 | CRUD Nhà cung cấp | `MaNCC`, `TenNCC`, `DiaChi`, `SDT`, `Email`, `MaSoThue`, `NguoiLienHe`, `GhiChu`. |

### 5.6. **Module Quản lý Nhân viên**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 20 | CRUD Nhân viên | `TenNV`, `SDT`, `GioiTinh`, `Luong` (chỉ Admin thấy), `MaTK`. |
| 21 | Phân quyền | Gán vai trò cho từng nhân viên. |
| 22 | Tạo tài khoản tự động | Khi thêm NV → tạo `TaiKhoan` với mật khẩu random, gửi email kích hoạt. |

### 5.7. ⭐ **Module Tài chính**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 23 | Tạo phiếu chi | Admin nhập số tiền + nội dung. Validate không vượt quá số dư. |
| 24 | Tạo phiếu thu | NV bán hàng ghi nhận tiền mặt khách đưa/bán hàng. |
| 25 | Thống kê tài chính | Báo cáo doanh thu/chi phí theo khoảng thời gian (theo ngày/tuần/tháng/quý/năm). |

### 5.8. ⭐ **Module Thống kê & Báo cáo**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 26 | Thống kê kho | Biểu đồ tồn kho, thuốc cận date. |
| 27 | Thống kê hóa đơn | Số lượng hóa đơn/ngày, top 10 thuốc bán chạy. |
| 28 | Thống kê tài chính | Dashboard doanh thu (revenue chart), chi phí, lợi nhuận. |
| 29 | Xuất báo cáo | Excel/PDF. |

### 5.9. **Module Audit Log**

| STT | Chức năng | Mô tả chi tiết |
|:-:|---|---|
| 30 | Ghi log | Mọi hành động (INSERT/UPDATE/DELETE/LOGIN/...) đều được ghi vào `AuditLog`. |
| 31 | Xem log | Chỉ Admin. Lọc theo user, thời gian, action. |

---

## 6. THIẾT KẾ CƠ SỞ DỮ LIỆU (SQL Server)

### 6.1. Script tạo CSDL

```sql
-- ============================================================
-- SECUREPHARMA DATABASE - Microsoft SQL Server 2019
-- ============================================================

CREATE DATABASE SecurePharmaDB;
GO
USE SecurePharmaDB;
GO

-- 1. BẢNG DANH MỤC THUỐC
CREATE TABLE DanhMuc (
    MaDM VARCHAR(20) PRIMARY KEY,
    TenDM NVARCHAR(200) NOT NULL UNIQUE
);

-- 2. BẢNG NHÀ CUNG CẤP
CREATE TABLE NhaCungCap (
    MaNCC INT IDENTITY(1,1) PRIMARY KEY,
    TenNCC NVARCHAR(400) NOT NULL,
    DiaChi NVARCHAR(1000),
    SDT VARCHAR(15) -- mã hóa AES-256
);

-- 3. BẢNG KHÁCH HÀNG
CREATE TABLE KhachHang (
    MaKH INT IDENTITY(1,1) PRIMARY KEY,
    TenKH NVARCHAR(200) NOT NULL,
    SDT VARCHAR(15),                  -- mã hóa AES-256
    GioiTinh NVARCHAR(20),
    NgayTao DATETIME DEFAULT GETDATE()
);

-- 4. BẢNG NHÂN VIÊN
CREATE TABLE NhanVien (
    MaNV INT IDENTITY(1,1) PRIMARY KEY,
    TenNV NVARCHAR(200) NOT NULL,
    SDT VARCHAR(15),                  -- mã hóa
    GioiTinh NVARCHAR(20),
    Luong DECIMAL(18,2),              -- mã hóa cột (Column-Level Encryption)
    NgayVaoLam DATE DEFAULT GETDATE(),
    TrangThai NVARCHAR(50) DEFAULT N'DangLam' -- DangLam / NghiViec
);

-- 5. BẢNG TÀI KHOẢN
CREATE TABLE TaiKhoan (
    TenDangNhap VARCHAR(50) PRIMARY KEY,
    MatKhauHash VARCHAR(255) NOT NULL,    -- bcrypt/argon2 hash
    VaiTro NVARCHAR(50) NOT NULL,          -- 'Admin', 'NV_BanHang', 'NV_Kho'
    TrangThai NVARCHAR(50) DEFAULT N'HoatDong', -- HoatDong / Khoa
    MaNV INT NOT NULL,
    MFASecret VARCHAR(100),                -- mã TOTP secret (mã hóa)
    LastLogin DATETIME,
    LoginFailCount INT DEFAULT 0,
    LockUntil DATETIME,
    NgayTao DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_TaiKhoan_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);

-- 6. BẢNG THUỐC
CREATE TABLE Thuoc (
    MaThuoc INT IDENTITY(1,1) PRIMARY KEY,
    TenThuoc NVARCHAR(400) NOT NULL,
    HoatChat NVARCHAR(500),               -- thành phần
    KhoiLuong NVARCHAR(100),
    GiaBanThamKhao DECIMAL(18,2),
    MaDM VARCHAR(20) NOT NULL,
    NgayTao DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Thuoc_DanhMuc FOREIGN KEY (MaDM) REFERENCES DanhMuc(MaDM)
);
CREATE INDEX IX_Thuoc_TenThuoc ON Thuoc(TenThuoc);

-- 7. BẢNG PHIẾU NHẬP
CREATE TABLE PhieuNhap (
    MaPN INT IDENTITY(1,1) PRIMARY KEY,
    NgayNhap DATETIME DEFAULT GETDATE(),
    TrangThai NVARCHAR(50) DEFAULT N'ChoDuyet',
    MaNCC INT NOT NULL,
    MaNV INT NOT NULL,
    CONSTRAINT FK_PhieuNhap_NCC FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC),
    CONSTRAINT FK_PhieuNhap_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);

-- 8. BẢNG LÔ THUỐC - CHI TIẾT NHẬP
CREATE TABLE LoThuoc_ChiTietNhap (
    MaLo INT IDENTITY(1,1) PRIMARY KEY,
    SoLuongNhap INT NOT NULL,
    SoLuongTonKho INT NOT NULL,
    NgaySX DATE NOT NULL,
    HanSD DATE NOT NULL,
    GiaNhap DECIMAL(18,2) NOT NULL,
    MaPN INT NOT NULL,
    MaThuoc INT NOT NULL,
    CONSTRAINT FK_LoThuoc_PhieuNhap FOREIGN KEY (MaPN) REFERENCES PhieuNhap(MaPN),
    CONSTRAINT FK_LoThuoc_Thuoc FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc)
);
CREATE INDEX IX_LoThuoc_HanSD ON LoThuoc_ChiTietNhap(HanSD);

-- 9. BẢNG HÓA ĐƠN
CREATE TABLE HoaDon (
    MaHD INT IDENTITY(1,1) PRIMARY KEY,
    NgayGioLap DATETIME DEFAULT GETDATE(),
    TongTien DECIMAL(18,2) NOT NULL,
    TienKhachDua DECIMAL(18,2),
    TienTraLai DECIMAL(18,2),
    TrangThai NVARCHAR(50) DEFAULT N'DaThanhToan', -- DaThanhToan / DaHuy
    MaNV INT NOT NULL,
    MaKH INT,
    CONSTRAINT FK_HoaDon_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
    CONSTRAINT FK_HoaDon_KH FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH)
);
CREATE INDEX IX_HoaDon_NgayGioLap ON HoaDon(NgayGioLap);

-- 10. BẢNG CHI TIẾT HÓA ĐƠN
CREATE TABLE ChiTietHoaDon (
    MaHD INT NOT NULL,
    MaLo INT NOT NULL,
    SoLuongBan INT NOT NULL,
    GiaBanThucTe DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (MaHD, MaLo),
    CONSTRAINT FK_CTHD_HoaDon FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
    CONSTRAINT FK_CTHD_LoThuoc FOREIGN KEY (MaLo) REFERENCES LoThuoc_ChiTietNhap(MaLo)
);

-- 11. BẢNG PHIẾU THU
CREATE TABLE PhieuThu (
    MaPhieuThu INT IDENTITY(1,1) PRIMARY KEY,
    NgayLap DATETIME DEFAULT GETDATE(),
    SoTien DECIMAL(18,2) NOT NULL,
    LoaiPhieu NVARCHAR(50),    -- 'BanHang' / 'Khac'
    NoiDung NVARCHAR(500),
    MaNV INT NOT NULL,
    MaHD INT,
    CONSTRAINT FK_PhieuThu_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);

-- 12. BẢNG PHIẾU CHI
CREATE TABLE PhieuChi (
    MaPhieuChi INT IDENTITY(1,1) PRIMARY KEY,
    NgayLap DATETIME DEFAULT GETDATE(),
    SoTien DECIMAL(18,2) NOT NULL,
    NoiDung NVARCHAR(500) NOT NULL,
    MaNV INT NOT NULL,
    MaPN INT,
    CONSTRAINT FK_PhieuChi_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);

-- 13. BẢNG QUYỀN HẠN (cho RBAC)
CREATE TABLE Quyen (
    MaQuyen INT IDENTITY(1,1) PRIMARY KEY,
    TenQuyen NVARCHAR(100) NOT NULL UNIQUE,
    MoTa NVARCHAR(500)
);

CREATE TABLE VaiTro_Quyen (
    MaVaiTro NVARCHAR(50) NOT NULL,
    MaQuyen INT NOT NULL,
    PRIMARY KEY (MaVaiTro, MaQuyen),
    FOREIGN KEY (MaQuyen) REFERENCES Quyen(MaQuyen)
);

-- 14. BẢNG AUDIT LOG
CREATE TABLE AuditLog (
    LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
    TenDangNhap VARCHAR(50),
    Action NVARCHAR(100) NOT NULL,    -- LOGIN, INSERT, UPDATE, DELETE, EXPORT, ...
    TableName NVARCHAR(100),
    RecordID NVARCHAR(50),
    OldValue NVARCHAR(MAX),            -- JSON
    NewValue NVARCHAR(MAX),            -- JSON
    IPAddress VARCHAR(50),
    UserAgent NVARCHAR(500),
    Timestamp DATETIME DEFAULT GETDATE()
);
CREATE INDEX IX_AuditLog_Timestamp ON AuditLog(Timestamp);
CREATE INDEX IX_AuditLog_User ON AuditLog(TenDangNhap);
```

### 6.2. Stored Procedures quan trọng

```sql
-- SP: Bán thuốc (có transaction + FIFO theo lô)
CREATE PROCEDURE SP_BanThuoc
    @MaNV INT,
    @MaKH INT,
    @ChiTietChiTiet AS dbo.ChiTietBanType READONLY,
    @TienKhachDua DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @MaHD INT;
        DECLARE @TongTien DECIMAL(18,2) = 0;

        -- 1. Tạo hóa đơn
        INSERT INTO HoaDon (TongTien, TienKhachDua, TienTraLai, MaNV, MaKH)
        VALUES (0, @TienKhachDua, 0, @MaNV, @MaKH);
        SET @MaHD = SCOPE_IDENTITY();

        -- 2. Duyệt từng dòng (dùng cursor hoặc loop)
        DECLARE @MaThuoc INT, @SoLuongBan INT;
        DECLARE cur CURSOR FOR SELECT MaThuoc, SoLuongBan FROM @ChiTietChiTiet;
        OPEN cur;
        FETCH NEXT FROM cur INTO @MaThuoc, @SoLuongBan;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Logic FIFO: lấy lô cũ nhất còn hàng
            DECLARE @MaLo INT, @TonKho INT, @DaBan INT = 0;
            DECLARE curLo CURSOR FOR
                SELECT MaLo, SoLuongTonKho
                FROM LoThuoc_ChiTietNhap
                WHERE MaThuoc = @MaThuoc AND SoLuongTonKho > 0 AND HanSD > GETDATE()
                ORDER BY HanSD ASC;
            OPEN curLo;
            FETCH NEXT FROM curLo INTO @MaLo, @TonKho;

            WHILE @@FETCH_STATUS = 0 AND @DaBan < @SoLuongBan
            BEGIN
                DECLARE @Lay INT = CASE
                    WHEN (@TonKho >= (@SoLuongBan - @DaBan)) THEN (@SoLuongBan - @DaBan)
                    ELSE @TonKho END;

                -- Trừ tồn kho
                UPDATE LoThuoc_ChiTietNhap
                SET SoLuongTonKho = SoLuongTonKho - @Lay
                WHERE MaLo = @MaLo;

                -- Lấy giá bán tham khảo
                DECLARE @GiaBan DECIMAL(18,2);
                SELECT @GiaBan = GiaBanThamKhao FROM Thuoc WHERE MaThuoc = @MaThuoc;

                -- Insert chi tiết hóa đơn
                INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
                VALUES (@MaHD, @MaLo, @Lay, @GiaBan);

                SET @TongTien = @TongTien + @Lay * @GiaBan;
                SET @DaBan = @DaBan + @Lay;

                FETCH NEXT FROM curLo INTO @MaLo, @TonKho;
            END
            CLOSE curLo; DEALLOCATE curLo;

            IF @DaBan < @SoLuongBan
                THROW 50001, N'Thuốc không đủ tồn kho', 1;

            FETCH NEXT FROM cur INTO @MaThuoc, @SoLuongBan;
        END
        CLOSE cur; DEALLOCATE cur;

        -- 3. Cập nhật tổng tiền
        UPDATE HoaDon
        SET TongTien = @TongTien, TienTraLai = @TienKhachDua - @TongTien
        WHERE MaHD = @MaHD;

        COMMIT TRANSACTION;
        SELECT @MaHD AS MaHD, @TongTien AS TongTien;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
```

### 6.3. View thống kê

```sql
-- View: Thuốc sắp hết hạn
CREATE VIEW VW_ThuocSapHetHan AS
SELECT t.MaThuoc, t.TenThuoc, l.MaLo, l.HanSD, l.SoLuongTonKho, DATEDIFF(DAY, GETDATE(), l.HanSD) AS SoNgayConLai
FROM Thuoc t
JOIN LoThuoc_ChiTietNhap l ON t.MaThuoc = l.MaThuoc
WHERE l.SoLuongTonKho > 0
  AND DATEDIFF(DAY, GETDATE(), l.HanSD) <= 30;
GO

-- View: Doanh thu theo ngày
CREATE VIEW VW_DoanhThuTheoNgay AS
SELECT CAST(NgayGioLap AS DATE) AS Ngay,
       COUNT(*) AS SoHoaDon,
       SUM(TongTien) AS TongDoanhThu
FROM HoaDon
WHERE TrangThai = N'DaThanhToan'
GROUP BY CAST(NgayGioLap AS DATE);
```

---

## 7. BẢO MẬT & GIẢI PHÁP AN TOÀN

> Đây là **phần trọng yếu** của đồ án ngành ATTT.

### 7.1. ⭐ Nguyên tắc áp dụng

| Lớp | Giải pháp | Mục đích |
|---|---|---|
| **1. Xác thực** | Bcrypt/Argon2 + JWT + Refresh Token + MFA | Đảm bảo người dùng đúng danh tính |
| **2. Phân quyền** | RBAC theo chức năng + dữ liệu | Đặc quyền tối thiểu |
| **3. Dữ liệu** | AES-256 (cột nhạy cảm) + TDE (DB) + TLS 1.3 | Bảo vệ dữ liệu lưu trữ & truyền tải |
| **4. Đầu vào** | Validator + Parameterized Query | Chống XSS / SQLi |
| **5. Phiên** | JWT có exp ngắn + Refresh rotation + Blacklist | Chống session hijacking |
| **6. Tấn công** | CSRF token + SameSite Cookie + Rate-limit + CSP | Chống CSRF, brute-force, XSS |
| **7. Theo dõi** | Audit Log + alerting | Phát hiện bất thường |

### 7.2. Mã hóa mật khẩu

```javascript
// Node.js - bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(plain) {
    return await bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
    return await bcrypt.compare(plain, hash);
}
```

### 7.3. JWT + Refresh Token

```javascript
// Tạo Access Token (15 phút)
const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: user.TenDangNhap,
            role: user.VaiTro,
            maNV: user.MaNV
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m', algorithm: 'HS256' }
    );
}

// Refresh Token (7 ngày, lưu DB)
function generateRefreshToken(user) {
    const token = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    // Lưu hashed vào DB với expiry
    return token;  // Trả về raw cho client
}
```

### 7.4. Middleware phân quyền RBAC

```javascript
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Chưa xác thực' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        next();
    };
}

// Sử dụng:
app.post('/api/nhan-vien', authenticate, requireRole('Admin'), createNhanVien);
app.post('/api/ban-thuoc', authenticate, requireRole('Admin', 'NV_BanHang'), banThuoc);
```

### 7.5. ⭐ Phòng chống SQL Injection

```javascript
// ❌ SAI - String concatenation
const sql = `SELECT * FROM Thuoc WHERE TenThuoc LIKE '%${keyword}%'`;

// ✅ ĐÚNG - Parameterized query
const sql = `SELECT * FROM Thuoc WHERE TenThuoc LIKE @kw`;
const result = await pool.request()
    .input('kw', `%${keyword}%`)
    .query(sql);
```

### 7.6. ⭐ Phòng chống XSS

```javascript
const xss = require('xss');

// Khi nhận input từ client
app.use((req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        }
    }
    next();
});

// Frontend - escape khi render
function safeHTML(str) {
    return str.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Response headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    }
}));
```

### 7.7. ⭐ Phòng chống CSRF

```javascript
const csurf = require('csurf');
app.use(csurf({ cookie: { httpOnly: true, secure: true, sameSite: 'strict' } }));

// Mỗi form phải include CSRF token
// <input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### 7.8. Rate Limiting & Brute-Force

```javascript
const rateLimit = require('express-rate-limit');

// Login: tối đa 5 lần/15 phút
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Quá nhiều lần đăng nhập sai, thử lại sau 15 phút'
});

// API chung: 100 req/15 phút/IP
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });

app.post('/api/auth/login', loginLimiter, loginHandler);
app.use('/api/', apiLimiter);
```

### 7.9. Mã hóa dữ liệu nhạy cảm (Column-Level)

```sql
-- Trong SQL Server: tạo Master Key + Certificate
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongP@ssw0rd!';
CREATE CERTIFICATE CertSecurePharma WITH SUBJECT = 'Encrypt Sensitive Data';

-- Mã hóa SDT
ALTER TABLE NhanVien
ADD SDT_Encrypted VARBINARY(256);

UPDATE NhanVien
SET SDT_Encrypted = ENCRYPTBYCERT(Cert_ID('CertSecurePharma'), SDT);
```

```javascript
// Backend - mã hóa/giải mã AES-256 cho dữ liệu trước khi lưu
const crypto = require('crypto');
const ENCRYPT_KEY = Buffer.from(process.env.AES_KEY, 'hex');  // 32 bytes
const IV = Buffer.from(process.env.AES_IV, 'hex');          // 16 bytes

function encryptAES(plaintext) {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPT_KEY, IV);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

function decryptAES(ciphertext) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPT_KEY, IV);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
```

### 7.10. Audit Log

```javascript
async function logAudit(req, action, tableName, recordID, oldVal, newVal) {
    if (!req.user) return;
    await pool.request()
        .input('user', sql.VarChar, req.user.sub)
        .input('action', sql.NVarChar, action)
        .input('table', sql.NVarChar, tableName)
        .input('record', sql.NVarChar, recordID)
        .input('oldVal', sql.NVarChar, JSON.stringify(oldVal))
        .input('newVal', sql.NVarChar, JSON.stringify(newVal))
        .input('ip', sql.VarChar, req.ip)
        .input('ua', sql.NVarChar, req.headers['user-agent'] || '')
        .query(`INSERT INTO AuditLog (TenDangNhap, Action, TableName, RecordID, OldValue, NewValue, IPAddress, UserAgent)
                VALUES (@user, @action, @table, @record, @oldVal, @newVal, @ip, @ua)`);
}
```

### 7.11. Kiểm thử bảo mật (theo báo cáo)

| Kiểm thử | Công cụ | Mục tiêu |
|---|---|---|
| SQL Injection | sqlmap, Burp Suite | Không cho phép bypass auth/xóa DB |
| XSS | OWASP ZAP, manual payload | Không cho chèn `<script>` |
| CSRF | Burp Suite | Form không gửi được từ site khác |
| Access Control | Postman (đổi role, token) | NV không truy cập được API Admin |
| Brute Force | Hydra / script | Sau 5 lần sai phải khóa account |

---

## 8. CẤU TRÚC DỰ ÁN GỢI Ý

```
SecurePharma/                             # Monorepo
├── backend/                              # Node.js + Express + TS
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                     # Kết nối SQL Server (mssql)
│   │   │   └── security.ts               # JWT secret, AES key (env)
│   │   ├── middleware/
│   │   │   ├── auth.ts                   # Xác thực JWT
│   │   │   ├── rbac.ts                   # Phân quyền
│   │   │   ├── audit.ts                  # Ghi log
│   │   │   ├── rateLimit.ts
│   │   │   └── validate.ts               # express-validator + xss
│   │   ├── modules/
│   │   │   ├── auth/                     # Đăng nhập, đổi MK, MFA
│   │   │   ├── thuoc/                    # Thuốc + Danh mục
│   │   │   ├── kho/                      # Phiếu nhập + Lô
│   │   │   ├── banhang/                  # Hóa đơn + Chi tiết
│   │   │   ├── khachhang/
│   │   │   ├── nhacungcap/
│   │   │   ├── nhanvien/
│   │   │   ├── taichinh/                 # Phiếu thu/chi
│   │   │   └── baocao/                   # Thống kê + Audit
│   │   ├── utils/
│   │   │   ├── crypto.ts                 # AES-256, bcrypt
│   │   │   ├── logger.ts                 # winston
│   │   │   └── errorHandler.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── database/
│   │   ├── 01_create_tables.sql
│   │   ├── 02_stored_procedures.sql
│   │   ├── 03_views.sql
│   │   ├── 04_seed_data.sql              # Tạo admin mặc định
│   │   └── 05_audit_triggers.sql
│   └── .env
│
├── frontend/                             # ⭐ React 18 + Vite + TS
│   ├── public/
│   ├── src/
│   │   ├── main.tsx                      # Entry point
│   │   ├── App.tsx                       # Root + Router
│   │   ├── index.css                     # Tailwind imports
│   │   ├── router/
│   │   │   ├── index.tsx                 # Router config
│   │   │   ├── ProtectedRoute.tsx        # Bảo vệ route theo role
│   │   │   └── routes.ts                 # Định nghĩa route paths
│   │   ├── store/                        # State management
│   │   │   ├── index.ts                  # Cấu hình store
│   │   │   ├── api/
│   │   │   │   └── baseApi.ts            # RTK Query baseApi + interceptor
│   │   │   └── slices/
│   │   │       ├── authSlice.ts          # user, token, role
│   │   │       ├── cartSlice.ts          # giỏ hàng bán thuốc
│   │   │       └── uiSlice.ts            # sidebar, theme, modal
│   │   ├── services/                     # Gọi API
│   │   │   ├── axiosClient.ts            # Axios instance + interceptor
│   │   │   ├── authService.ts
│   │   │   ├── thuocService.ts
│   │   │   ├── khoService.ts
│   │   │   ├── banHangService.ts
│   │   │   ├── khachHangService.ts
│   │   │   ├── nhaCungCapService.ts
│   │   │   ├── nhanVienService.ts
│   │   │   ├── taiChinhService.ts
│   │   │   ├── thongKeService.ts
│   │   │   └── auditService.ts
│   │   ├── hooks/                        # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── usePagination.ts
│   │   │   └── useToast.ts
│   │   ├── components/                   # Shared components
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx        # Sidebar + Header + Outlet
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx           # Menu lọc theo role
│   │   │   │   └── Footer.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx             # DataTable có sort/paginate
│   │   │   │   ├── Spinner.tsx
│   │   │   │   └── ProtectedAction.tsx   # Ẩn nút nếu thiếu quyền
│   │   │   ├── charts/
│   │   │   │   ├── BarChart.tsx          # Recharts
│   │   │   │   ├── LineChart.tsx
│   │   │   │   ├── PieChart.tsx
│   │   │   │   └── StatCard.tsx
│   │   │   └── common/
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── LoadingFallback.tsx
│   │   │       └── ToastContainer.tsx
│   │   ├── pages/                        # Trang theo feature
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── MfaVerifyPage.tsx
│   │   │   │   └── ForgotPasswordPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx     # Tổng quan + biểu đồ
│   │   │   ├── thuoc/
│   │   │   │   ├── ThuocListPage.tsx     # Tìm kiếm + CRUD
│   │   │   │   ├── ThuocDetailPage.tsx
│   │   │   │   └── DanhMucPage.tsx
│   │   │   ├── kho/
│   │   │   │   ├── PhieuNhapListPage.tsx
│   │   │   │   ├── PhieuNhapCreatePage.tsx
│   │   │   │   ├── TonKhoPage.tsx
│   │   │   │   ├── SapHetHanPage.tsx
│   │   │   │   └── LoThuocDetailPage.tsx
│   │   │   ├── banhang/
│   │   │   │   ├── BanHangPage.tsx       # Bán thuốc + giỏ hàng
│   │   │   │   ├── HoaDonListPage.tsx
│   │   │   │   └── HoaDonDetailPage.tsx  # In hóa đơn
│   │   │   ├── khachhang/
│   │   │   │   └── KhachHangPage.tsx
│   │   │   ├── nhacungcap/
│   │   │   │   └── NhaCungCapPage.tsx
│   │   │   ├── nhanvien/                 # Admin only
│   │   │   │   └── NhanVienPage.tsx
│   │   │   ├── taichinh/
│   │   │   │   ├── PhieuThuPage.tsx
│   │   │   │   └── PhieuChiPage.tsx
│   │   │   ├── baocao/
│   │   │   │   ├── DoanhThuPage.tsx
│   │   │   │   ├── TopThuocPage.tsx
│   │   │   │   └── AuditLogPage.tsx
│   │   │   ├── profile/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   └── ChangePasswordPage.tsx
│   │   │   └── errors/
│   │   │       ├── NotFoundPage.tsx      # 404
│   │   │       └── ForbiddenPage.tsx     # 403
│   │   ├── utils/                        # ⭐ Bảo mật FE
│   │   │   ├── sanitize.ts               # DOMPurify wrapper
│   │   │   ├── csrf.ts                   # Lấy CSRF token
│   │   │   ├── storage.ts                # Lưu token an toàn
│   │   │   ├── validators.ts             # Validate form
│   │   │   ├── format.ts                 # Format tiền, ngày
│   │   │   └── constants.ts
│   │   ├── types/                        # TypeScript types
│   │   │   ├── auth.types.ts
│   │   │   ├── thuoc.types.ts
│   │   │   ├── hoaDon.types.ts
│   │   │   └── ...
│   │   └── vite-env.d.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts                    # Cấu hình proxy /api -> backend
│   ├── .env.development
│   ├── .env.production
│   └── package.json
│
├── docs/
│   ├── SECURITY.md                       # Tài liệu bảo mật
│   ├── ERD.png
│   ├── Usecase/
│   └── Sequence/
│
├── tests/
│   ├── backend/
│   │   ├── security/
│   │   │   ├── sqli.test.ts
│   │   │   ├── xss.test.ts
│   │   │   ├── rbac.test.ts
│   │   │   └── brute_force.test.ts
│   │   └── functional/
│   └── frontend/
│       ├── components/
│       └── e2e/                          # Playwright/Cypress
│
├── docker-compose.yml                    # SQL Server + Backend + Frontend
├── .gitignore
└── README.md
```

### 8.1. Cấu hình Vite quan trọng (FE)

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false,           // Ẩn source map ở production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

### 8.2. Package.json - Dependencies chính (FE)

```json
{
  "name": "securepharma-frontend",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@reduxjs/toolkit": "^2.2.7",
    "react-redux": "^9.1.2",
    "axios": "^1.7.7",
    "@tanstack/react-query": "^5.51.0",
    "recharts": "^2.12.7",
    "antd": "^5.20.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "dompurify": "^3.1.6",
    "js-cookie": "^3.0.5",
    "react-helmet-async": "^2.0.5",
    "react-hot-toast": "^2.4.1",
    "dayjs": "^1.11.12",
    "xss": "^1.0.15",
    "otplib": "^12.0.1"          // MFA cho Admin
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/dompurify": "^3.0.5",
    "@types/js-cookie": "^3.0.6",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.10",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "eslint": "^9.9.0",
    "prettier": "^3.3.3"
  }
}
```

---

## 9. API ENDPOINTS GỢI Ý

### 9.1. Auth
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| POST | `/api/auth/login` | ❌ | Public |
| POST | `/api/auth/logout` | ✅ | All |
| POST | `/api/auth/refresh` | ❌ | Public |
| POST | `/api/auth/change-password` | ✅ | All |
| POST | `/api/auth/forgot-password` | ❌ | Public |
| POST | `/api/auth/verify-mfa` | ❌ | Public |

### 9.2. Thuốc & Danh mục
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/api/thuoc?keyword=...&page=1` | ✅ | All |
| GET | `/api/thuoc/:id` | ✅ | All |
| POST | `/api/thuoc` | ✅ | Admin, NV_Kho |
| PUT | `/api/thuoc/:id` | ✅ | Admin, NV_Kho |
| DELETE | `/api/thuoc/:id` | ✅ | Admin |
| CRUD | `/api/danh-muc` | ✅ | Admin (write), All (read) |

### 9.3. Kho & Lô
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/api/kho/ton-kho` | ✅ | All |
| GET | `/api/kho/sap-het-han?days=30` | ✅ | All |
| GET | `/api/kho/sap-het-hang` | ✅ | All |
| POST | `/api/phieu-nhap` | ✅ | Admin, NV_Kho |
| GET | `/api/phieu-nhap` | ✅ | Admin, NV_Kho |
| PUT | `/api/phieu-nhap/:id/duyet` | ✅ | Admin |

### 9.4. Bán hàng
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| POST | `/api/ban-hang` | ✅ | Admin, NV_BanHang |
| GET | `/api/hoa-don` | ✅ | All |
| GET | `/api/hoa-don/:id` | ✅ | All |
| PUT | `/api/hoa-don/:id/huy` | ✅ | Admin |

### 9.5. Khách hàng & NCC
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| CRUD | `/api/khach-hang` | ✅ | All (read), Admin (write) |
| CRUD | `/api/nha-cung-cap` | ✅ | Admin, NV_Kho |

### 9.6. Nhân viên
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| CRUD | `/api/nhan-vien` | ✅ | Admin |

### 9.7. Tài chính
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| POST | `/api/phieu-thu` | ✅ | Admin, NV_BanHang |
| POST | `/api/phieu-chi` | ✅ | Admin |
| GET | `/api/phieu-thu` | ✅ | Admin |
| GET | `/api/phieu-chi` | ✅ | Admin |

### 9.8. Thống kê
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| GET | `/api/thong-ke/doanh-thu?from=&to=` | ✅ | Admin |
| GET | `/api/thong-ke/top-thuoc` | ✅ | Admin, NV_BanHang |
| GET | `/api/thong-ke/ton-kho` | ✅ | All |
| GET | `/api/audit-log` | ✅ | Admin |

---


> Khi viết báo cáo & thuyết trình, đảm bảo đề cập đủ các điểm sau:

### Mục lục chính cần có:
- [x] Mục lục / Danh mục từ viết tắt / Danh mục hình ảnh / Bảng biểu
- [x] **Mở đầu** (Lý do chọn đề tài, mục tiêu, phạm vi)
- [x] **Chương 1**: Cơ sở lý thuyết + Công cụ
- [x] **Chương 2**: Phân tích & Thiết kế hệ thống
- [x] **Chương 3**: Xây dựng Website & Đánh giá (quan trọng nhất)
- [x] Kết luận & Hướng phát triển
- [x] Tài liệu tham khảo
- [x] Phụ lục (code, script SQL, ...)

### Nội dung **Chương 3** (phần điểm cao):
- [ ] Demo các chức năng chính (có hình ảnh + giải thích)
- [ ] **Phần tích hợp bảo mật** (mục 3.3 trong báo cáo gốc):
  - Phân quyền RBAC
  - Mã hóa dữ liệu (AES, bcrypt)
  - Phòng chống XSS/SQL Injection
  - **Hình ảnh minh chứng bảo mật**
- [ ] Kiểm thử chức năng (bảng test case + kết quả)
- [ ] **Kiểm thử bảo mật** (bảng test case + kết quả ← rất quan trọng)
- [ ] Đánh giá ưu điểm, hạn chế, hướng cải tiến

### Thuyết trình nên nhấn mạnh:
1. ✅ Tính **thực tế** (khảo sát nhà thuốc thật)
2. ✅ Tính **an toàn** (phân quyền + mã hóa + chống tấn công)
3. ✅ Đặc thù **ngành dược** (lô + hạn dùng)
4. ✅ Tuân thủ **nguyên tắc kế toán** (nhập - xuất - tồn)

---

## 📚 TÀI LIỆU THAM KHẢO GỢI Ý

1. OWASP Top 10 - https://owasp.org/www-project-top-ten/
2. Microsoft SQL Server 2019 Documentation - https://learn.microsoft.com/en-us/sql/sql-server/
3. Node.js Best Practices Security - https://github.com/goldbergyoni/nodebestpractices
4. JWT.io - JSON Web Tokens
5. Stripe - Customer Data Best Practices
6. StarUML - https://staruml.io/

---

> 💡 **Lưu ý:** File này là bản tổng hợp chức năng từ báo cáo + bổ sung chi tiết kỹ thuật về bảo mật, CSDL SQL Server và API. Bạn có thể dùng file này làm roadmap triển khai hoặc chia thành các task trên GitHub Projects.

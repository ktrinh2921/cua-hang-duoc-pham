-- ============================================================
-- SECUREPHARMA DATABASE - Create Database
-- ============================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SecurePharmaDB')
BEGIN
    CREATE DATABASE SecurePharmaDB;
    PRINT 'Database SecurePharmaDB created successfully';
END
ELSE
BEGIN
    PRINT 'Database SecurePharmaDB already exists';
END
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. BẢNG DANH MỤC THUỐC
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DanhMuc')
BEGIN
    CREATE TABLE DanhMuc (
        MaDM VARCHAR(20) PRIMARY KEY,
        TenDM NVARCHAR(200) NOT NULL UNIQUE,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table DanhMuc created';
END
GO

-- ============================================================
-- 2. BẢNG NHÀ CUNG CẤP
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NhaCungCap')
BEGIN
    CREATE TABLE NhaCungCap (
        MaNCC INT IDENTITY(1,1) PRIMARY KEY,
        TenNCC NVARCHAR(400) NOT NULL,
        DiaChi NVARCHAR(1000),
        SDT VARCHAR(64), -- AES-256 encrypted (base64 ~24 chars)
        Email NVARCHAR(254),
        MaSoThue VARCHAR(20),
        NguoiLienHe NVARCHAR(200),
        GhiChu NVARCHAR(1000),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table NhaCungCap created';
END
GO

-- ============================================================
-- 3. BẢNG KHÁCH HÀNG
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'KhachHang')
BEGIN
    CREATE TABLE KhachHang (
        MaKH INT IDENTITY(1,1) PRIMARY KEY,
        TenKH NVARCHAR(200) NOT NULL,
        SDT VARCHAR(64), -- AES-256 encrypted
        GioiTinh NVARCHAR(20),
        NgayTao DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table KhachHang created';
END
GO

-- ============================================================
-- 4. BẢNG NHÂN VIÊN
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NhanVien')
BEGIN
    CREATE TABLE NhanVien (
        MaNV INT IDENTITY(1,1) PRIMARY KEY,
        TenNV NVARCHAR(200) NOT NULL,
        SDT VARCHAR(64), -- AES-256 encrypted
        GioiTinh NVARCHAR(20),
        Luong DECIMAL(18,2),
        NgayVaoLam DATE DEFAULT GETDATE(),
        TrangThai NVARCHAR(50) DEFAULT N'DangLam',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
    );
    PRINT 'Table NhanVien created';
END
GO

-- ============================================================
-- 5. BẢNG TÀI KHOẢN
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TaiKhoan')
BEGIN
    CREATE TABLE TaiKhoan (
        TenDangNhap VARCHAR(50) PRIMARY KEY,
        MatKhauHash VARCHAR(255) NOT NULL,
        VaiTro NVARCHAR(50) NOT NULL CHECK (VaiTro IN ('Admin', 'NV_BanHang', 'NV_Kho')),
        TrangThai NVARCHAR(50) DEFAULT N'HoatDong',
        MaNV INT NOT NULL,
        LastLogin DATETIME2,
        LoginFailCount INT DEFAULT 0,
        LockUntil DATETIME2,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_TaiKhoan_NhanVien FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
    );
    PRINT 'Table TaiKhoan created';
END
GO

-- ============================================================
-- 6. BẢNG THUỐC
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Thuoc')
BEGIN
    CREATE TABLE Thuoc (
        MaThuoc INT IDENTITY(1,1) PRIMARY KEY,
        TenThuoc NVARCHAR(400) NOT NULL,
        HoatChat NVARCHAR(500),
        KhoiLuong NVARCHAR(100),
        GiaBanThamKhao DECIMAL(18,2),
        MaDM VARCHAR(20) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Thuoc_DanhMuc FOREIGN KEY (MaDM) REFERENCES DanhMuc(MaDM)
    );
    CREATE INDEX IX_Thuoc_TenThuoc ON Thuoc(TenThuoc);
    PRINT 'Table Thuoc created';
END
GO

-- ============================================================
-- 7. BẢNG PHIẾU NHẬP
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PhieuNhap')
BEGIN
    CREATE TABLE PhieuNhap (
        MaPN INT IDENTITY(1,1) PRIMARY KEY,
        NgayNhap DATETIME2 DEFAULT GETDATE(),
        TrangThai NVARCHAR(50) DEFAULT N'DaNhap',
        MaNCC INT NOT NULL,
        MaNV INT NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuNhap_NCC FOREIGN KEY (MaNCC) REFERENCES NhaCungCap(MaNCC),
        CONSTRAINT FK_PhieuNhap_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
    );
    PRINT 'Table PhieuNhap created';
END
GO

-- ============================================================
-- 8. BẢNG LÔ THUỐC - CHI TIẾT NHẬP
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LoThuoc_ChiTietNhap')
BEGIN
    CREATE TABLE LoThuoc_ChiTietNhap (
        MaLo INT IDENTITY(1,1) PRIMARY KEY,
        SoLuongNhap INT NOT NULL,
        SoLuongTonKho INT NOT NULL,
        NgaySX DATE NOT NULL,
        HanSD DATE NOT NULL,
        GiaNhap DECIMAL(18,2) NOT NULL,
        MaPN INT NOT NULL,
        MaThuoc INT NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_LoThuoc_PhieuNhap FOREIGN KEY (MaPN) REFERENCES PhieuNhap(MaPN),
        CONSTRAINT FK_LoThuoc_Thuoc FOREIGN KEY (MaThuoc) REFERENCES Thuoc(MaThuoc),
        CONSTRAINT CK_LoThuoc_SLNhap CHECK (SoLuongNhap > 0),
        CONSTRAINT CK_LoThuoc_SLTon CHECK (SoLuongTonKho >= 0),
        CONSTRAINT CK_LoThuoc_HanSD CHECK (HanSD > NgaySX)
    );
    CREATE INDEX IX_LoThuoc_HanSD ON LoThuoc_ChiTietNhap(HanSD);
    CREATE INDEX IX_LoThuoc_MaThuoc ON LoThuoc_ChiTietNhap(MaThuoc);
    PRINT 'Table LoThuoc_ChiTietNhap created';
END
GO

-- ============================================================
-- 9. BẢNG HÓA ĐƠN
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HoaDon')
BEGIN
    CREATE TABLE HoaDon (
        MaHD INT IDENTITY(1,1) PRIMARY KEY,
        NgayGioLap DATETIME2 DEFAULT GETDATE(),
        TongTien DECIMAL(18,2) NOT NULL,
        GiamGia DECIMAL(18,2) NOT NULL DEFAULT 0,
        TienKhachDua DECIMAL(18,2),
        TienTraLai DECIMAL(18,2),
        TrangThai NVARCHAR(50) DEFAULT N'DaThanhToan',
        MaNV INT NOT NULL,
        MaKH INT,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_HoaDon_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT FK_HoaDon_KH FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH)
    );
    CREATE INDEX IX_HoaDon_NgayGioLap ON HoaDon(NgayGioLap);
    PRINT 'Table HoaDon created';
END
GO

-- ============================================================
-- 10. BẢNG CHI TIẾT HÓA ĐƠN
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChiTietHoaDon')
BEGIN
    CREATE TABLE ChiTietHoaDon (
        MaHD INT NOT NULL,
        MaLo INT NOT NULL,
        SoLuongBan INT NOT NULL,
        GiaBanThucTe DECIMAL(18,2) NOT NULL,
        PRIMARY KEY (MaHD, MaLo),
        CONSTRAINT FK_CTHD_HoaDon FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
        CONSTRAINT FK_CTHD_LoThuoc FOREIGN KEY (MaLo) REFERENCES LoThuoc_ChiTietNhap(MaLo),
        CONSTRAINT CK_CTHD_SLBan CHECK (SoLuongBan > 0)
    );
    PRINT 'Table ChiTietHoaDon created';
END
GO

-- ============================================================
-- 11. BẢNG PHIẾU THU
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PhieuThu')
BEGIN
    CREATE TABLE PhieuThu (
        MaPhieuThu INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME2 DEFAULT GETDATE(),
        SoTien DECIMAL(18,2) NOT NULL,
        LoaiPhieu NVARCHAR(50) NOT NULL DEFAULT N'Khac',
        NoiDung NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        MaHD INT,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuThu_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT FK_PhieuThu_HD FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
        CONSTRAINT CK_PhieuThu_SoTien CHECK (SoTien > 0),
        CONSTRAINT CK_PhieuThu_LoaiPhieu CHECK (LoaiPhieu IN (N'BanHang', N'Khac'))
    );
    CREATE UNIQUE INDEX UX_PhieuThu_MaHD ON PhieuThu(MaHD) WHERE MaHD IS NOT NULL;
    CREATE INDEX IX_PhieuThu_NgayLap ON PhieuThu(NgayLap);
    PRINT 'Table PhieuThu created';
END
GO

-- ============================================================
-- 12. BẢNG PHIẾU CHI
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PhieuChi')
BEGIN
    CREATE TABLE PhieuChi (
        MaPhieuChi INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME2 DEFAULT GETDATE(),
        SoTien DECIMAL(18,2) NOT NULL,
        NoiDung NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuChi_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT CK_PhieuChi_SoTien CHECK (SoTien > 0)
    );
    PRINT 'Table PhieuChi created';
END
GO

-- ============================================================
-- 13. BẢNG AUDIT LOG
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLog')
BEGIN
    CREATE TABLE AuditLog (
        LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenDangNhap VARCHAR(50),
        Action NVARCHAR(100) NOT NULL,
        TableName NVARCHAR(100),
        RecordID NVARCHAR(50),
        OldValue NVARCHAR(MAX),
        NewValue NVARCHAR(MAX),
        IPAddress VARCHAR(50),
        UserAgent NVARCHAR(500),
        Timestamp DATETIME2 DEFAULT GETDATE()
    );
    CREATE INDEX IX_AuditLog_Timestamp ON AuditLog(Timestamp);
    CREATE INDEX IX_AuditLog_User ON AuditLog(TenDangNhap);
    PRINT 'Table AuditLog created';
END
GO

PRINT '============================================================';
PRINT 'All tables created successfully!';
PRINT '============================================================';

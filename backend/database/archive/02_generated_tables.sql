-- ============================================================
-- SCRIPT GENERATED TỰ ĐỘNG - KHÔNG SỬA TAY
-- Ngày tạo: 2026-09-17 16:38:03 UTC
-- Server:  LAPTOP-3CSTMP8:1433
-- Database: SecurePharmaDB
-- Tool:    node src/scripts/generate_tables_sql.js
-- ============================================================

USE [master];
GO

IF DB_ID(N'SecurePharmaDB') IS NULL
BEGIN
    CREATE DATABASE [SecurePharmaDB]
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE [SecurePharmaDB];
GO

-- ============================================================
-- Table: AuditLog
-- ============================================================
IF OBJECT_ID(N'[AuditLog]', 'U') IS NOT NULL
    DROP TABLE [AuditLog];
GO

CREATE TABLE [AuditLog] (
    [LogID] BIGINT NOT NULL,
    [TenDangNhap] VARCHAR(50) NULL,
    [Action] NVARCHAR(50) NOT NULL,
    [TableName] NVARCHAR(50) NULL,
    [RecordID] NVARCHAR(25) NULL,
    [OldValue] NVARCHAR(MAX) NULL,
    [NewValue] NVARCHAR(MAX) NULL,
    [IPAddress] VARCHAR(50) NULL,
    [UserAgent] NVARCHAR(250) NULL,
    [Timestamp] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_AuditLog] PRIMARY KEY CLUSTERED ([LogID])
);
GO

CREATE NONCLUSTERED INDEX [IX_AuditLog_Timestamp] ON [AuditLog] ([Timestamp]);
GO

CREATE NONCLUSTERED INDEX [IX_AuditLog_User] ON [AuditLog] ([TenDangNhap]);
GO

-- ============================================================
-- Table: DanhMuc
-- ============================================================
IF OBJECT_ID(N'[DanhMuc]', 'U') IS NOT NULL
    DROP TABLE [DanhMuc];
GO

CREATE TABLE [DanhMuc] (
    [MaDM] VARCHAR(20) NOT NULL,
    [TenDM] NVARCHAR(100) NOT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_DanhMuc] PRIMARY KEY CLUSTERED ([MaDM]),
    CONSTRAINT [UQ__DanhMuc__4CF9655909B0B261] UNIQUE ([TenDM])
);
GO

-- ============================================================
-- Table: KhachHang
-- ============================================================
IF OBJECT_ID(N'[KhachHang]', 'U') IS NOT NULL
    DROP TABLE [KhachHang];
GO

CREATE TABLE [KhachHang] (
    [MaKH] INT NOT NULL,
    [TenKH] NVARCHAR(100) NOT NULL,
    [SDT] VARCHAR(64) NULL DEFAULT N'NULL',
    [GioiTinh] NVARCHAR(10) NULL,
    [NgayTao] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_KhachHang] PRIMARY KEY CLUSTERED ([MaKH]),
    CONSTRAINT [UQ_KhachHang_SDT] UNIQUE ([SDT])
);
GO

-- ============================================================
-- Table: NhaCungCap
-- ============================================================
IF OBJECT_ID(N'[NhaCungCap]', 'U') IS NOT NULL
    DROP TABLE [NhaCungCap];
GO

CREATE TABLE [NhaCungCap] (
    [MaNCC] INT NOT NULL,
    [TenNCC] NVARCHAR(200) NOT NULL,
    [DiaChi] NVARCHAR(500) NULL,
    [SDT] VARCHAR(64) NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [Email] NVARCHAR(127) NULL,
    [MaSoThue] VARCHAR(20) NULL,
    [NguoiLienHe] NVARCHAR(100) NULL,
    [GhiChu] NVARCHAR(500) NULL,
    CONSTRAINT [PK_NhaCungCap] PRIMARY KEY CLUSTERED ([MaNCC])
);
GO

-- ============================================================
-- Table: NhanVien
-- ============================================================
IF OBJECT_ID(N'[NhanVien]', 'U') IS NOT NULL
    DROP TABLE [NhanVien];
GO

CREATE TABLE [NhanVien] (
    [MaNV] INT NOT NULL,
    [TenNV] NVARCHAR(100) NOT NULL,
    [SDT] VARCHAR(64) NULL,
    [GioiTinh] NVARCHAR(10) NULL,
    [Luong] DECIMAL(18,2) NULL,
    [NgayVaoLam] DATE NULL DEFAULT getdate(),
    [TrangThai] NVARCHAR(25) NULL DEFAULT N'DangLam',
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_NhanVien] PRIMARY KEY CLUSTERED ([MaNV])
);
GO

-- ============================================================
-- Table: Thuoc
-- ============================================================
IF OBJECT_ID(N'[Thuoc]', 'U') IS NOT NULL
    DROP TABLE [Thuoc];
GO

CREATE TABLE [Thuoc] (
    [MaThuoc] INT NOT NULL,
    [TenThuoc] NVARCHAR(200) NOT NULL,
    [HoatChat] NVARCHAR(250) NULL,
    [KhoiLuong] NVARCHAR(50) NULL,
    [GiaBanThamKhao] DECIMAL(18,2) NULL,
    [MaDM] VARCHAR(20) NOT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [MoTa] NVARCHAR(MAX) NULL,
    [LieuDung] NVARCHAR(250) NULL,
    [ChongChiDinh] NVARCHAR(250) NULL,
    [GhiChu] NVARCHAR(500) NULL,
    CONSTRAINT [PK_Thuoc] PRIMARY KEY CLUSTERED ([MaThuoc]),
    CONSTRAINT [FK_Thuoc_DanhMuc] FOREIGN KEY ([MaDM]) REFERENCES [DanhMuc]([MaDM])
);
GO

CREATE NONCLUSTERED INDEX [IX_Thuoc_TenThuoc] ON [Thuoc] ([TenThuoc]);
GO

-- ============================================================
-- Table: TaiKhoan
-- ============================================================
IF OBJECT_ID(N'[TaiKhoan]', 'U') IS NOT NULL
    DROP TABLE [TaiKhoan];
GO

CREATE TABLE [TaiKhoan] (
    [TenDangNhap] VARCHAR(50) NOT NULL,
    [MatKhauHash] VARCHAR(255) NOT NULL,
    [VaiTro] NVARCHAR(25) NOT NULL,
    [TrangThai] NVARCHAR(25) NULL DEFAULT N'HoatDong',
    [MaNV] INT NOT NULL,
    [LastLogin] DATETIME2(7) NULL,
    [LoginFailCount] INT NULL DEFAULT 0,
    [LockUntil] DATETIME2(7) NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [TokenVersion] INT NULL DEFAULT 1,
    CONSTRAINT [PK_TaiKhoan] PRIMARY KEY CLUSTERED ([TenDangNhap]),
    CONSTRAINT [CK_TaiKhoan_VaiTro] CHECK ([VaiTro]='NV_Kho' OR [VaiTro]='NV_BanHang' OR [VaiTro]='Admin'),
    CONSTRAINT [FK_TaiKhoan_NhanVien] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

-- ============================================================
-- Table: PhieuNhap
-- ============================================================
IF OBJECT_ID(N'[PhieuNhap]', 'U') IS NOT NULL
    DROP TABLE [PhieuNhap];
GO

CREATE TABLE [PhieuNhap] (
    [MaPN] INT NOT NULL,
    [NgayNhap] DATETIME2(7) NULL DEFAULT getdate(),
    [TrangThai] NVARCHAR(25) NULL DEFAULT N'DaNhap',
    [MaNCC] INT NOT NULL,
    [MaNV] INT NOT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_PhieuNhap] PRIMARY KEY CLUSTERED ([MaPN]),
    CONSTRAINT [CK_PhieuNhap_TrangThai] CHECK ([TrangThai]=N'Huy' OR [TrangThai]=N'ChoDuyet' OR [TrangThai]=N'DaNhap'),
    CONSTRAINT [FK_PhieuNhap_NCC] FOREIGN KEY ([MaNCC]) REFERENCES [NhaCungCap]([MaNCC]),
    CONSTRAINT [FK_PhieuNhap_NV] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

-- ============================================================
-- Table: HoaDon
-- ============================================================
IF OBJECT_ID(N'[HoaDon]', 'U') IS NOT NULL
    DROP TABLE [HoaDon];
GO

CREATE TABLE [HoaDon] (
    [MaHD] INT NOT NULL,
    [NgayGioLap] DATETIME2(7) NULL DEFAULT getdate(),
    [TongTien] DECIMAL(18,2) NOT NULL,
    [TienKhachDua] DECIMAL(18,2) NULL,
    [TienTraLai] DECIMAL(18,2) NULL,
    [TrangThai] NVARCHAR(25) NULL DEFAULT N'DaThanhToan',
    [MaNV] INT NOT NULL,
    [MaKH] INT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [UpdatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    [GiamGia] DECIMAL(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT [PK_HoaDon] PRIMARY KEY CLUSTERED ([MaHD]),
    CONSTRAINT [FK_HoaDon_KH] FOREIGN KEY ([MaKH]) REFERENCES [KhachHang]([MaKH]),
    CONSTRAINT [FK_HoaDon_NV] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

CREATE NONCLUSTERED INDEX [IX_HoaDon_NgayGioLap] ON [HoaDon] ([NgayGioLap]);
GO

-- ============================================================
-- Table: PhieuChi
-- ============================================================
IF OBJECT_ID(N'[PhieuChi]', 'U') IS NOT NULL
    DROP TABLE [PhieuChi];
GO

CREATE TABLE [PhieuChi] (
    [MaPhieuChi] INT NOT NULL,
    [NgayLap] DATETIME2(7) NULL DEFAULT getdate(),
    [SoTien] DECIMAL(18,2) NOT NULL,
    [NoiDung] NVARCHAR(250) NOT NULL,
    [MaNV] INT NOT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_PhieuChi] PRIMARY KEY CLUSTERED ([MaPhieuChi]),
    CONSTRAINT [CK_PhieuChi_SoTien] CHECK ([SoTien]>(0)),
    CONSTRAINT [FK_PhieuChi_NV] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

-- ============================================================
-- Table: LoThuoc_ChiTietNhap
-- ============================================================
IF OBJECT_ID(N'[LoThuoc_ChiTietNhap]', 'U') IS NOT NULL
    DROP TABLE [LoThuoc_ChiTietNhap];
GO

CREATE TABLE [LoThuoc_ChiTietNhap] (
    [MaLo] INT NOT NULL,
    [SoLuongNhap] INT NOT NULL,
    [SoLuongTonKho] INT NOT NULL,
    [NgaySX] DATE NOT NULL,
    [HanSD] DATE NOT NULL,
    [GiaNhap] DECIMAL(18,2) NOT NULL,
    [MaPN] INT NOT NULL,
    [MaThuoc] INT NOT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_LoThuoc_ChiTietNhap] PRIMARY KEY CLUSTERED ([MaLo]),
    CONSTRAINT [CK_LoThuoc_HanSD] CHECK ([HanSD]>[NgaySX]),
    CONSTRAINT [CK_LoThuoc_SLNhap] CHECK ([SoLuongNhap]>(0)),
    CONSTRAINT [CK_LoThuoc_SLTon] CHECK ([SoLuongTonKho]>=(0)),
    CONSTRAINT [FK_LoThuoc_PhieuNhap] FOREIGN KEY ([MaPN]) REFERENCES [PhieuNhap]([MaPN]),
    CONSTRAINT [FK_LoThuoc_Thuoc] FOREIGN KEY ([MaThuoc]) REFERENCES [Thuoc]([MaThuoc])
);
GO

CREATE NONCLUSTERED INDEX [IX_LoThuoc_HanSD] ON [LoThuoc_ChiTietNhap] ([HanSD]);
GO

CREATE NONCLUSTERED INDEX [IX_LoThuoc_MaThuoc] ON [LoThuoc_ChiTietNhap] ([MaThuoc]);
GO

-- ============================================================
-- Table: PhieuThu
-- ============================================================
IF OBJECT_ID(N'[PhieuThu]', 'U') IS NOT NULL
    DROP TABLE [PhieuThu];
GO

CREATE TABLE [PhieuThu] (
    [MaPhieuThu] INT NOT NULL,
    [NgayLap] DATETIME2(7) NULL DEFAULT getdate(),
    [SoTien] DECIMAL(18,2) NOT NULL,
    [LoaiPhieu] NVARCHAR(25) NOT NULL DEFAULT N'Khac',
    [NoiDung] NVARCHAR(250) NOT NULL,
    [MaNV] INT NOT NULL,
    [MaHD] INT NULL,
    [CreatedAt] DATETIME2(7) NULL DEFAULT getdate(),
    CONSTRAINT [PK_PhieuThu] PRIMARY KEY CLUSTERED ([MaPhieuThu]),
    CONSTRAINT [CK_PhieuThu_LoaiPhieu] CHECK ([LoaiPhieu]=N'Khac' OR [LoaiPhieu]=N'BanHang'),
    CONSTRAINT [CK_PhieuThu_SoTien] CHECK ([SoTien]>(0)),
    CONSTRAINT [FK_PhieuThu_HD] FOREIGN KEY ([MaHD]) REFERENCES [HoaDon]([MaHD]),
    CONSTRAINT [FK_PhieuThu_NV] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

CREATE NONCLUSTERED INDEX [IX_PhieuThu_NgayLap] ON [PhieuThu] ([NgayLap]);
GO

CREATE UNIQUE NONCLUSTERED INDEX [UX_PhieuThu_MaHD] ON [PhieuThu] ([MaHD]);
GO

-- ============================================================
-- Table: ChiTietHoaDon
-- ============================================================
IF OBJECT_ID(N'[ChiTietHoaDon]', 'U') IS NOT NULL
    DROP TABLE [ChiTietHoaDon];
GO

CREATE TABLE [ChiTietHoaDon] (
    [MaHD] INT NOT NULL,
    [MaLo] INT NOT NULL,
    [SoLuongBan] INT NOT NULL,
    [GiaBanThucTe] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [PK_ChiTietHoaDon] PRIMARY KEY CLUSTERED ([MaHD], [MaLo]),
    CONSTRAINT [CK_CTHD_SLBan] CHECK ([SoLuongBan]>(0)),
    CONSTRAINT [FK_CTHD_HoaDon] FOREIGN KEY ([MaHD]) REFERENCES [HoaDon]([MaHD]),
    CONSTRAINT [FK_CTHD_LoThuoc] FOREIGN KEY ([MaLo]) REFERENCES [LoThuoc_ChiTietNhap]([MaLo])
);
GO

-- ============================================================
-- Table: DieuChinhTonKho
-- ============================================================
IF OBJECT_ID(N'[DieuChinhTonKho]', 'U') IS NOT NULL
    DROP TABLE [DieuChinhTonKho];
GO

CREATE TABLE [DieuChinhTonKho] (
    [MaDieuChinh] BIGINT NOT NULL,
    [MaLo] INT NOT NULL,
    [SoLuongTruoc] INT NOT NULL,
    [SoLuongSau] INT NOT NULL,
    [ChenhLech] INT NULL,
    [LyDo] NVARCHAR(250) NOT NULL,
    [MaNV] INT NOT NULL,
    [CreatedAt] DATETIME2(7) NOT NULL DEFAULT getdate(),
    CONSTRAINT [PK_DieuChinhTonKho] PRIMARY KEY CLUSTERED ([MaDieuChinh]),
    CONSTRAINT [CK_DieuChinhTonKho_LyDo] CHECK (len(ltrim(rtrim([LyDo])))>=(3)),
    CONSTRAINT [CK_DieuChinhTonKho_SoLuongSau] CHECK ([SoLuongSau]>=(0)),
    CONSTRAINT [CK_DieuChinhTonKho_SoLuongTruoc] CHECK ([SoLuongTruoc]>=(0)),
    CONSTRAINT [FK_DieuChinhTonKho_LoThuoc] FOREIGN KEY ([MaLo]) REFERENCES [LoThuoc_ChiTietNhap]([MaLo]),
    CONSTRAINT [FK_DieuChinhTonKho_NhanVien] FOREIGN KEY ([MaNV]) REFERENCES [NhanVien]([MaNV])
);
GO

CREATE NONCLUSTERED INDEX [IX_DieuChinhTonKho_MaLo_CreatedAt] ON [DieuChinhTonKho] ([MaLo], [CreatedAt]);
GO

-- ============================================================
-- HẾT. Import file này vào SQL Server Management Studio để
-- reproduce toàn bộ schema.
-- ============================================================
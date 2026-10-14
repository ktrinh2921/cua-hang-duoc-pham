-- ============================================================
-- SECUREPHARMA - Seed Data
-- Run AFTER tables are created
-- Passwords will be hashed by seed.js script
-- ============================================================

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. SEED DANH MỤC
-- ============================================================
-- DanhMuc.MaDM là VARCHAR(20), không phải IDENTITY -> không dùng SET IDENTITY_INSERT
IF NOT EXISTS (SELECT * FROM DanhMuc WHERE MaDM = 'DM001')
BEGIN
    INSERT INTO DanhMuc (MaDM, TenDM) VALUES
    ('DM001', N'Kháng sinh'),
    ('DM002', N'Giảm đau, hạ sốt'),
    ('DM003', N'Tiêu hóa'),
    ('DM004', N'Thực phẩm chức năng'),
    ('DM005', N'Thuốc nhỏ mắt'),
    ('DM006', N'Thuốc bổ'),
    ('DM007', N'Thuốc ho'),
    ('DM008', N'Dung dịch vệ sinh');
END
GO

-- ============================================================
-- 2. SEED NHÀ CUNG CẤP
-- ============================================================
SET IDENTITY_INSERT NhaCungCap ON;

IF NOT EXISTS (SELECT TOP 1 * FROM NhaCungCap)
BEGIN
    INSERT INTO NhaCungCap (MaNCC, TenNCC, DiaChi, SDT) VALUES
    (1, N'Công ty Dược phẩm Trung Ương 1', N'123 Nguyễn Trãi, Quận 1, TP.HCM', '02812345678'),
    (2, N'Công ty Dược phẩm Hà Nội', N'45 Lê Duẩn, Hoàn Kiếm, Hà Nội', '02412345678'),
    (3, N'Công ty Dược phẩm Đà Nẵng', N'78 Nguyễn Văn Linh, Đà Nẵng', '02361234567'),
    (4, N'Công ty Dược phẩm Phú Thọ', N'56 Hoàng Quốc Việt, TP Việt Trì', '02103891234'),
    (5, N'Công ty Dược phẩm Bình Dương', N'89 Đại lộ Bình Dương, Thủ Dầu Một', '02743678901');
END

SET IDENTITY_INSERT NhaCungCap OFF;
GO

-- ============================================================
-- 3. SEED NHÂN VIÊN
-- ============================================================
SET IDENTITY_INSERT NhanVien ON;

IF NOT EXISTS (SELECT TOP 1 * FROM NhanVien)
BEGIN
    INSERT INTO NhanVien (MaNV, TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai) VALUES
    (1, N'Nguyễn Thị Hương', '0912345678', N'Nữ', 15000000, '2020-01-15', N'DangLam'),
    (2, N'Trần Văn Minh', '0923456789', N'Nam', 8000000, '2022-03-20', N'DangLam'),
    (3, N'Lê Thị Lan', '0934567890', N'Nữ', 8000000, '2023-06-01', N'DangLam'),
    (4, N'Lê Văn Cường', '0945678901', N'Nam', 8500000, '2024-02-10', N'DangLam');
END

SET IDENTITY_INSERT NhanVien OFF;
GO

-- ============================================================
-- 4. SEED THUỐC
-- ============================================================
SET IDENTITY_INSERT Thuoc ON;

IF NOT EXISTS (SELECT TOP 1 * FROM Thuoc)
BEGIN
    INSERT INTO Thuoc (MaThuoc, TenThuoc, HoatChat, KhoiLuong, GiaBanThamKhao, MaDM) VALUES
    (1, N'Paracetamol 500mg', N'Paracetamol', N'20 viên/hộp', 25000, 'DM002'),
    (2, N'Amoxicillin 500mg', N'Amoxicillin', N'21 viên/hộp', 45000, 'DM001'),
    (3, N'Ibuprofen 400mg', N'Ibuprofen', N'30 viên/hộp', 35000, 'DM002'),
    (4, N'Vitamin C 1000mg', N'Ascorbic Acid', N'30 viên/hộp', 55000, 'DM004'),
    (5, N'Omeprazole 20mg', N'Omeprazole', N'14 viên/hộp', 65000, 'DM003'),
    (6, N'Metformin 500mg', N'Metformin', N'60 viên/hộp', 85000, 'DM004'),
    (7, N'Loperamide 2mg', N'Loperamide', N'10 viên/hộp', 22000, 'DM003'),
    (8, N'Loratadine 10mg', N'Loratadine', N'10 viên/hộp', 32000, 'DM002'),
    (9, N'Cetirizine 10mg', N'Cetirizine', N'10 viên/hộp', 28000, 'DM002'),
    (10, N'Vitamin B-Complex', N'Thiamin, B6, B12', N'30 viên/hộp', 75000, 'DM004'),
    (11, N'Canxi + D3', N'Canxi Carbonate, Vitamin D3', N'60 viên/hộp', 120000, 'DM004'),
    (12, N'Toilet Sept Cemerlang', N'Nước muối sinh lý', N'1 chai 500ml', 15000, 'DM008'),
    (13, N'Xylometazolin 0.05%', N'Xylometazolin', N'1 chai 10ml', 28000, 'DM007'),
    (14, N'Chloramphenicol 0.25%', N'Chloramphenicol', N'1 chai 5ml', 35000, 'DM005'),
    (15, N'Mucostar 200ml', N'Bromhexin', N'1 chai 200ml', 42000, 'DM007'),
    (16, N'Ginkgo Biloba', N'Ginkgo Biloba', N'30 viên/hộp', 95000, 'DM004'),
    (17, N'Ostorheum Plus', N'Glucosamine, MSM', N'30 viên/hộp', 180000, 'DM004'),
    (18, N'Berocca Performance', N'Vitamin B, C, khoáng chất', N'30 viên/hộp', 165000, 'DM004'),
    (19, N'Efferalgan 500mg', N'Paracetamol', N'16 viên/hộp', 38000, 'DM002'),
    (20, N'Enterogermina', N'Bacillus clausii', N'5 ống/hộp', 85000, 'DM003');
END

SET IDENTITY_INSERT Thuoc OFF;
GO

-- ============================================================
-- 5. SEED KHÁCH HÀNG MẪU
-- ============================================================
SET IDENTITY_INSERT KhachHang ON;

IF NOT EXISTS (SELECT TOP 1 * FROM KhachHang)
BEGIN
    INSERT INTO KhachHang (MaKH, TenKH, SDT, GioiTinh) VALUES
    (1, N'Nguyễn Văn An', '0941234567', N'Nam'),
    (2, N'Trần Thị Bình', '0952345678', N'Nữ'),
    (3, N'Lê Hoàng Cường', '0963456789', N'Nam'),
    (4, N'Phạm Thị Dung', '0974567890', N'Nữ'),
    (5, N'Hoàng Văn Em', '0985678901', N'Nam');
END

SET IDENTITY_INSERT KhachHang OFF;
GO

PRINT '============================================================';
PRINT 'Seed data (except accounts) inserted successfully!';
PRINT '============================================================';
PRINT 'NOTE: Run seed.js to create accounts with hashed passwords';
PRINT '============================================================';

-- ============================================================
-- 06_sales.sql — Hóa đơn + Chi tiết hóa đơn
-- ============================================================
-- Mục đích: Seed hóa đơn đa dạng để:
--   - Test UI bán hàng
--   - Có dữ liệu thống kê doanh thu (theo ngày/tháng/quý)
--   - Test vòng quay tồn kho (tồn → bán → cập nhật SoLuongTonKho)
--
-- Thứ tự chạy: SAU 05_medicines.sql (MaKH, MaNV, MaLo đã có).
--               TRƯỚC 07_vouchers.sql (PhieuThu backfill FK MaHD).
--
-- Gộp từ: 12_patch_expiry_lots.sql (5 HD đầu) + 16_patch_seed_pretty.sql (25 HD).
--
-- LƯU Ý QUAN TRỌNG — MaLo lookup pattern:
--   MaLo là IDENTITY(1,1), giá trị phụ thuộc thứ tự INSERT (không cố định).
--   Tất cả ChiTietHoaDon dùng subquery để lookup MaLo theo (MaThuoc, HanSD)
--   thay vì hard-code số. An toàn cho cả DB mới và DB cũ (đã seed từ
--   patch 10/12/16 trước đó).
--
-- Idempotent: check theo NgayGioLap.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- Helper: Subquery lookup MaLo theo (MaThuoc, HanSD, TrangThai=DaNhap)
-- Trả về NULL nếu không tìm thấy → skip insert (idempotent)
-- ============================================================
-- Lưu ý: SQL Server không cho phép DECLARE function inline trong batch.
-- Dùng subquery lặp lại ở mỗi INSERT.

-- ============================================================
-- 1. Hóa đơn tháng 6/2026 (5 hóa đơn)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-06-15 09:30:00')
BEGIN
    DECLARE @HD INT;

    -- HĐ 1: 2026-06-15 — bán Amlodipine + Atorvastatin (MaThuoc 21, 23)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, NULL, '2026-06-15 09:30:00', 285000, 25000, 300000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 21 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';

    -- HĐ 2: 2026-06-17 — bán Calamine + Povidone (MaThuoc 25, 27)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, NULL, '2026-06-17 10:15:00', 92000, 0, 100000, 8000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 42000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 25 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-20';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 50000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 27 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-10';

    -- HĐ 3: 2026-06-20 — bán Cefixime (MaThuoc 32) - ĐÃ HỦY
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (6, 9, '2026-06-20 14:30:00', 175000, 0, 200000, 25000, N'DaHuy');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 175000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 32 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-09-01';

    -- HĐ 4: 2026-06-25 — bán Hydrogen Peroxide + Paracetamol 650 (MaThuoc 28, 36)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, NULL, '2026-06-25 11:00:00', 132000, 0, 150000, 18000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 28 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-15';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';

    -- HĐ 5: 2026-06-28 — bán Vitamin D3 + Kẽm (MaThuoc 38, 39)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, NULL, '2026-06-28 15:20:00', 425000, 15000, 450000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 38 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 39 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-10';

    PRINT '[06] Seeded 5 HoaDon tháng 6/2026';
END
GO

-- ============================================================
-- 2. Hóa đơn tháng 7/2026 (5 hóa đơn)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-07-05 11:00:00')
BEGIN
    DECLARE @HD INT;

    -- HĐ 6: 2026-07-05 — Atorvastatin + Losartan + Amlodipine
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (6, NULL, '2026-07-05 11:00:00', 685000, 35000, 700000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 22 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 21 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-01';

    -- HĐ 7: 2026-07-10 — Hydrogen Peroxide + Chlorhexidine
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, NULL, '2026-07-10 15:20:00', 45000, 0, 50000, 5000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 28000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 28 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-15';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 17000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 29 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-15';

    -- HĐ 8: 2026-07-15 — Azithromycin + Metronidazole (MaKH=13)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, 13, '2026-07-15 14:10:00', 198000, 8000, 200000, 10000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 33 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-09-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 53000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 34 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-09-15';

    -- HĐ 9: 2026-07-22 — Atorvastatin + Diclofenac (MaKH=14)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 14, '2026-07-22 09:00:00', 365000, 50000, 350000, 35000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 75000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 37 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-10';

    -- HĐ 10: 2026-07-28 — Paracetamol 650 (MaKH=15)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (9, 15, '2026-07-28 14:10:00', 175000, 0, 200000, 25000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 5, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';

    PRINT '[06] Seeded 5 HoaDon tháng 7/2026';
END
GO

-- ============================================================
-- 3. Hóa đơn tháng 8/2026 (6 hóa đơn)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-08-03 10:30:00')
BEGIN
    DECLARE @HD INT;

    -- HĐ 11: 2026-08-03 — Paracetamol 650 (MaKH=15)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (9, 15, '2026-08-03 10:30:00', 175000, 0, 200000, 25000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 5, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';

    -- HĐ 12: 2026-08-08 — Ibuprofen + Amoxicillin + Loperamide (MaThuoc 3, 2, 7)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, NULL, '2026-08-08 13:20:00', 98000, 0, 100000, 2000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 45000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 2 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 18000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 7 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    -- HĐ 13: 2026-08-12 — combo tim mạch + Vitamin D3 (MaKH=16)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 16, '2026-08-12 11:30:00', 425000, 25000, 450000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 22 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 21 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 38 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-01';

    -- HĐ 14: 2026-08-18 — Paracetamol 650 + Hydrogen Peroxide + Domperidone (MaKH=17)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (6, 17, '2026-08-18 15:45:00', 235000, 0, 250000, 15000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 4, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 28000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 28 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-15';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 35 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-15';

    -- HĐ 15: 2026-08-25 — Calamine Lotion (MaKH=18) - ĐÃ HỦY
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (9, 18, '2026-08-25 16:00:00', 95000, 0, 100000, 5000, N'DaHuy');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 25 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-20';

    -- HĐ 16: 2026-08-30 — Fexofenadine + Desloratadine (MaKH=19)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, 19, '2026-08-30 10:00:00', 132000, 0, 150000, 18000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 78000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 30 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 54000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 31 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-05';

    PRINT '[06] Seeded 6 HoaDon tháng 8/2026';
END
GO

-- ============================================================
-- 4. Hóa đơn tháng 9/2026 (11 hóa đơn)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-09-02 09:15:00')
BEGIN
    DECLARE @HD INT;

    -- HĐ 17: 2026-09-02 — combo tim mạch (MaKH=20)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (6, 20, '2026-09-02 09:15:00', 425000, 25000, 450000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 22 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 21 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-01';

    -- HĐ 18: 2026-09-04 — Ibuprofen + Hydrogen Peroxide
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, NULL, '2026-09-04 10:30:00', 58000, 0, 60000, 2000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 23000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 28 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-02-15';

    -- HĐ 19: 2026-09-05 — Vitamin D3 (MaKH=21)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, 21, '2026-09-05 14:00:00', 285000, 0, 300000, 15000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 38 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-01';

    -- HĐ 20: 2026-09-08 — combo tim mạch + Vitamin D3 (MaKH=22)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (9, 22, '2026-09-08 11:20:00', 595000, 45000, 600000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 22 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 21 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-12-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 38 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-01';

    -- HĐ 21: 2026-09-10 — Paracetamol 650 + Desloratadine (MaKH=23)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, 23, '2026-09-10 16:30:00', 235000, 0, 235000, 0, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 4, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 47000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 31 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-05';

    -- HĐ 22: 2026-09-12 — Azithromycin + Domperidone (MaKH=24)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (6, 24, '2026-09-12 09:00:00', 175000, 5000, 200000, 30000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 33 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-09-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 35 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-15';

    -- HĐ 23: 2026-09-14 — Calamine Lotion (MaKH=25)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 25, '2026-09-14 10:45:00', 95000, 0, 100000, 5000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 25 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-20';

    -- HĐ 24: 2026-09-15 — Vitamin D3 + Kẽm + Acetylcysteine (MaKH=26)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, 26, '2026-09-15 13:30:00', 425000, 15000, 450000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 95000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 38 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-01';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 65000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 39 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-10';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 55000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 40 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-06-20';

    -- HĐ 25: 2026-09-16 — Atorvastatin
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (9, NULL, '2026-09-16 15:20:00', 145000, 0, 145000, 0, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 145000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 23 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2027-07-05';

    -- HĐ 26: 2026-09-17 — Paracetamol 650 + Fexofenadine
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai)
    VALUES (5, NULL, '2026-09-17 08:30:00', 38000, 0, 50000, 12000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 36 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2028-04-05';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 1, 3000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 30 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-01';

    PRINT '[06] Seeded 10 HoaDon tháng 9/2026';
END
GO

-- ============================================================
-- 5. Hóa đơn vòng quay tồn kho (giữ lại từ patch 12 cũ)
-- ============================================================
-- Các hóa đơn 11-15/09/2026 với MaKH 1-5, đảm bảo vòng quay tồn kho hoạt động.
-- (Patch 12 cũ tạo 5 hóa đơn này với IDENTITY, giờ vẫn dùng subquery tìm MaLo)
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-09-11 10:00:00')
BEGIN
    DECLARE @HD INT;

    -- HĐ vòng quay: 11-15/09/2026, mỗi ngày 1 hóa đơn
    -- Tham chiếu MaThuoc 3 (Ibuprofen, lô cận HSD) + MaThuoc 16 (Vitamin C lô 2) + MaThuoc 5 (Paracetamol lô 2)

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 1, '2026-09-11 10:00:00', 175000, 200000, 25000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 5, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 2, '2026-09-12 11:00:00', 230000, 250000, 20000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 4, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 2, 45000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 4 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (3, 3, '2026-09-13 14:00:00', 280000, 300000, 20000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 4, 45000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 4 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 1, '2026-09-14 09:30:00', 320000, 350000, 30000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 3, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 5, 45000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 4 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (3, 5, '2026-09-15 15:00:00', 360000, 400000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 4, 35000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 3 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    SELECT @HD, l.MaLo, 5, 45000
    FROM LoThuoc_ChiTietNhap l JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 4 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-16';

    PRINT '[06] Seeded 5 HoaDon vòng quay tồn kho (11-15/09)';
END
GO

-- ============================================================
-- 6. Verify (dùng biến trung gian tránh subquery trong CAST)
-- ============================================================
DECLARE @HD INT = (SELECT COUNT(*) FROM HoaDon);
DECLARE @CT INT = (SELECT COUNT(*) FROM ChiTietHoaDon);
DECLARE @DT INT = (SELECT COUNT(*) FROM HoaDon WHERE TrangThai = N'DaThanhToan');
DECLARE @DH INT = (SELECT COUNT(*) FROM HoaDon WHERE TrangThai = N'DaHuy');

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║                06_sales.sql — VERIFICATION                  ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║   HoaDon: ' + CAST(@HD AS VARCHAR) + ' dòng';
PRINT '║   ChiTietHoaDon: ' + CAST(@CT AS VARCHAR) + ' dòng';
PRINT '║   DaThanhToan: ' + CAST(@DT AS VARCHAR);
PRINT '║   DaHuy: ' + CAST(@DH AS VARCHAR);
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO

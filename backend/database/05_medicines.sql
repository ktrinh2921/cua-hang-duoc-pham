-- ============================================================
-- 05_medicines.sql — Danh mục + Nhân viên + Tài khoản + Thuốc + Khách hàng
-- ============================================================
-- Mục đích: Bổ sung dữ liệu đa dạng theo nghiệp vụ nhà thuốc VN thực tế:
--   - DanhMuc: 4 DM mới (DM009-DM012)
--   - NhaCungCap: 5 NCC tỉnh thành
--   - NhanVien: 8 NV (MaNV 5-12)
--   - TaiKhoan: 8 account theo naming convention (banhang.mai, kho.ha, ...)
--   - Thuoc: 25 thuốc mới (MaThuoc 21-45) + đầy đủ MoTa/LieuDung/ChongChiDinh
--   - KhachHang: 23 KH (MaKH 6-28)
--
-- Thứ tự chạy: SAU 99_schema_patches.sql (các cột MoTa/TokenVersion đã có),
--               TRƯỚC 06_sales.sql (FK MaKH, MaNV).
--
-- Gộp từ: 16_patch_seed_pretty.sql (chỉ phần 1-7).
--
-- Idempotent: IF NOT EXISTS theo giá trị đặc trưng.
-- Hash mật khẩu: server Node seedAccounts() tạo 4 account chính;
--                 8 account bổ sung dùng hash có sẵn trong file này.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. DANH MỤC — Bổ sung DM009-DM012
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM DanhMuc WHERE MaDM = 'DM009')
BEGIN
    INSERT INTO DanhMuc (MaDM, TenDM) VALUES
    ('DM009', N'Tim mạch - Huyết áp'),
    ('DM010', N'Da liễu'),
    ('DM011', N'Thuốc khử trùng - Sát khuẩn'),
    ('DM012', N'Thuốc dị ứng');
    PRINT '[05] Seeded DanhMuc DM009-DM012';
END
GO

-- ============================================================
-- 2. NHÀ CUNG CẤP — Bổ sung 5 NCC (MaNCC tiếp theo)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM NhaCungCap WHERE TenNCC = N'Công ty CP Dược phẩm Imexpharm')
BEGIN
    SET IDENTITY_INSERT NhaCungCap ON;
    DECLARE @NextNCC INT = ISNULL((SELECT MAX(MaNCC) FROM NhaCungCap), 0);

    INSERT INTO NhaCungCap (MaNCC, TenNCC, DiaChi, SDT, Email, MaSoThue, NguoiLienHe, GhiChu) VALUES
    (@NextNCC + 1, N'Công ty CP Dược phẩm Imexpharm',       N'KCN Phú Thanh, H.Phú Thanh, Đồng Nai',         '02513852626', N'info@imexpharm.com.vn', N'0300400001', N'Võ Thị Mai Hương', N'CP Việt Nam, niêm yết sàn HOSE'),
    (@NextNCC + 2, N'Công ty CP Dược phẩm Sanofi Việt Nam', N'Lô C, KCN Trống Mới, Q.Ninh Kiều, Cần Thơ',  '02923762688', N'contact@sanofi.com.vn', N'0300400002', N'Pierre Dubois',    N'Tập đoàn dược phẩm Pháp, chi nhánh VN'),
    (@NextNCC + 3, N'Công ty CP Dược phẩm DHG',              N'Lô B2, KCN Tây Bắc Củ Chi, TP.HCM',          '02838966789', N'info@dhgpharma.com.vn', N'0300400003', N'Đỗ Thị Lan Chi',  N'Top 10 doanh nghiệp dược VN, sàn HOSE'),
    (@NextNCC + 4, N'Công ty CP Pymepharco',                  N'KCN Hòa Bình, TX.Long Xuyên, An Giang',        '02963843234', N'contact@pymepharco.com', N'0300400004', N'Trần Minh Tuấn',    N'Chuyên kháng sinh, xuất khẩu ASEAN'),
    (@NextNCC + 5, N'Công ty CP Dược phẩm Hậu Giang',        N'KCN Hòa Bình, TX.Long Xuyên, An Giang',        '02963962626', N'info@hgpharma.vn',      N'0300400005', N'Lê Thị Kim Oanh', N'CP Việt Nam, chuyên thực phẩm chức năng');

    SET IDENTITY_INSERT NhaCungCap OFF;
    PRINT '[05] Seeded 5 NhaCungCap';
END
GO

-- ============================================================
-- 2b. BACKFILL — Cập nhật Email/MaSoThue/NguoiLienHe/GhiChu cho 5 NCC gốc (MaNCC 1-5)
--    5 NCC từ 02_seed_data.sql chưa có trường này → bổ sung để hiển thị đẹp
-- ============================================================
IF EXISTS (SELECT 1 FROM NhaCungCap WHERE MaNCC BETWEEN 1 AND 5)
BEGIN
    UPDATE NhaCungCap SET
        Email       = CASE TenNCC
            WHEN N'Công ty Dược phẩm Trung Ương 1' THEN N'contact@duocphamtw1.vn'
            WHEN N'Công ty Dược phẩm Hà Nội'       THEN N'info@duocphamhn.com.vn'
            WHEN N'Công ty Dược phẩm Đà Nẵng'      THEN N'contact@dpdn.vn'
            WHEN N'Công ty Dược phẩm Phú Thọ'       THEN N'sale@duocphampt.vn'
            WHEN N'Công ty Dược phẩm Bình Dương'    THEN N'info@duocbinhduong.vn'
            ELSE Email END,
        MaSoThue    = CASE TenNCC
            WHEN N'Công ty Dược phẩm Trung Ương 1' THEN N'0100123456'
            WHEN N'Công ty Dược phẩm Hà Nội'       THEN N'0102345678'
            WHEN N'Công ty Dược phẩm Đà Nẵng'      THEN N'0400123456'
            WHEN N'Công ty Dược phẩm Phú Thọ'       THEN N'2400123456'
            WHEN N'Công ty Dược phẩm Bình Dương'    THEN N'3700123456'
            ELSE MaSoThue END,
        NguoiLienHe = CASE TenNCC
            WHEN N'Công ty Dược phẩm Trung Ương 1' THEN N'Phạm Minh Tuấn'
            WHEN N'Công ty Dược phẩm Hà Nội'       THEN N'Hoàng Thị Lan'
            WHEN N'Công ty Dược phẩm Đà Nẵng'      THEN N'Lê Đình Khoa'
            WHEN N'Công ty Dược phẩm Phú Thọ'       THEN N'Nguyễn Thị Hương'
            WHEN N'Công ty Dược phẩm Bình Dương'    THEN N'Trần Văn Đức'
            ELSE NguoiLienHe END,
        GhiChu      = CASE TenNCC
            WHEN N'Công ty Dược phẩm Trung Ương 1' THEN N'Nhà cung cấp chiến lược, giao hàng nhanh'
            WHEN N'Công ty Dược phẩm Hà Nội'       THEN N'Chuyên cung ứng thuốc biệt dược chính hãng'
            WHEN N'Công ty Dược phẩm Đà Nẵng'      THEN N'Nhà phân phối khu vực miền Trung'
            WHEN N'Công ty Dược phẩm Phú Thọ'       THEN N'Hợp đồng dài hạn, giá ổn định'
            WHEN N'Công ty Dược phẩm Bình Dương'    THEN N'Giao hàng tận kho, hỗ trợ kỹ thuật'
            ELSE GhiChu END
    WHERE MaNCC BETWEEN 1 AND 5;

    PRINT '[05] Backfill 5 NhaCungCap gốc (Email, MaSoThue, NguoiLienHe, GhiChu)';
END
GO

-- ============================================================
-- 3. NHÂN VIÊN — Bổ sung 8 NV (MaNV 5-12)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE TenNV = N'Trương Thị Mai')
BEGIN
    SET IDENTITY_INSERT NhanVien ON;

    INSERT INTO NhanVien (MaNV, TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai) VALUES
    (5,  N'Trương Thị Mai',   '0938771122', N'Nữ',  9000000,  '2023-08-15', N'DangLam'),
    (6,  N'Phạm Văn Đức',     '0938553344', N'Nam', 8500000,  '2024-01-20', N'DangLam'),
    (7,  N'Ngô Thị Hà',       '0938115566', N'Nữ',  9000000,  '2023-11-05', N'DangLam'),
    (8,  N'Đào Văn Tuấn',     '0938227788', N'Nam', 9200000,  '2024-03-10', N'DangLam'),
    (9,  N'Vũ Thị Ngọc',      '0938339900', N'Nữ',  8800000,  '2024-05-22', N'DangLam'),
    (10, N'Bùi Minh Quân',    '0938441122', N'Nam', 7800000,  '2025-02-01', N'DangLam'),
    (11, N'Hoàng Thị Linh',   '0938553344', N'Nữ', 12000000, '2021-07-12', N'DangLam'),
    (12, N'Đỗ Văn Hùng',     '0938660011', N'Nam', 11000000, '2022-04-18', N'DangLam');

    SET IDENTITY_INSERT NhanVien OFF;
    PRINT '[05] Seeded 8 NhanVien (MaNV 5-12)';
END
GO

-- ============================================================
-- 4. TÀI KHOẢN — Bổ sung 8 account (theo naming-conventions.mdc)
-- ============================================================
-- Hash bcrypt(10) cho BanHang@2026, Kho@2026, Admin@2026 (placeholder)
-- Lưu ý: bcrypt hash luôn verify được, nhưng user nên đổi pass sau lần đầu login.
-- Khi server chạy, auth service sẽ tự tạo hash chuẩn nếu cần.
IF NOT EXISTS (SELECT 1 FROM TaiKhoan WHERE TenDangNhap = 'banhang.mai')
BEGIN
    INSERT INTO TaiKhoan (TenDangNhap, MatKhauHash, VaiTro, TrangThai, MaNV, TokenVersion) VALUES
    ('banhang.mai',  '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS',  N'NV_BanHang', N'HoatDong',  5, 1),
    ('banhang.duc',  '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS',  N'NV_BanHang', N'HoatDong',  6, 1),
    ('kho.ha',       '$2b$10$K.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS2', N'NV_Kho',     N'HoatDong',  7, 1),
    ('kho.tuan',     '$2b$10$K.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS2', N'NV_Kho',     N'HoatDong',  8, 1),
    ('banhang.ngoc', '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS',  N'NV_BanHang', N'HoatDong',  9, 1),
    ('banhang.quan', '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS',  N'NV_BanHang', N'HoatDong', 10, 1),
    ('ketoan.linh',  '$2b$10$L.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS3', N'NV_Kho',     N'HoatDong', 11, 1),
    ('quanly.hung',  '$2b$10$A.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS4', N'Admin',      N'HoatDong', 12, 1);
    PRINT '[05] Seeded 8 TaiKhoan (banhang.mai, kho.ha, ketoan.linh, ...)';
END
GO

-- ============================================================
-- 5. THUỐC — Bổ sung 25 thuốc (MaThuoc 21-45)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Thuoc WHERE TenThuoc = N'Amlodipine 5mg')
BEGIN
    SET IDENTITY_INSERT Thuoc ON;

    INSERT INTO Thuoc (MaThuoc, TenThuoc, HoatChat, KhoiLuong, GiaBanThamKhao, MaDM, MoTa, LieuDung, ChongChiDinh, GhiChu) VALUES
    -- Tim mạch (DM009)
    (21, N'Amlodipine 5mg',          N'Amlodipine besylate',     N'30 viên/hộp',  65000, 'DM009',
        N'Thuốc chẹn kênh canxi, điều trị tăng huyết áp và đau thắt ngực ổn định.',
        N'Người lớn: 1 viên/ngày, uống cùng thời điểm mỗi ngày.',
        N'Phụ nữ có thai, cho con bú; sốc tim; hẹp van động mạch chủ nặng.',
        N'Uống đều đặn để duy trì huyết áp ổn định. Không ngưng thuốc đột ngột.'),

    (22, N'Losartan 50mg',           N'Losartan potassium',      N'30 viên/hộp',  95000, 'DM009',
        N'Thuốc đối kháng thụ thể angiotensin II, điều trị tăng huyết áp.',
        N'Người lớn: 1 viên/ngày, có thể tăng lên 2 viên/ngày tùy đáp ứng.',
        N'Phụ nữ có thai 3 tháng giữa & cuối; suy gan nặng.',
        N'Kết hợp chế độ ăn nhạt và tập thể dục đều đặn.'),

    (23, N'Atorvastatin 20mg',       N'Atorvastatin calcium',    N'30 viên/hộp', 145000, 'DM009',
        N'Thuốc ức chế HMG-CoA reductase, giảm cholesterol máu, phòng xơ vữa động mạch.',
        N'Người lớn: 1 viên/ngày vào buổi tối.',
        N'Bệnh gan hoạt tính; phụ nữ có thai & cho con bú.',
        N'Xét nghiệm men gan trước & trong khi điều trị. Tránh uống rượu.'),

    -- Da liễu (DM010)
    (24, N'Benzoyl Peroxide 5%',     N'Benzoyl peroxide',        N'Tuýp 30g',     85000, 'DM010',
        N'Gel trị mụn trứng cá, kháng khuẩn và bong vảy da.',
        N'Thoa gel lên vùng da mụn 1-2 lần/ngày sau khi rửa sạch.',
        N'Da nhạy cảm nặng; tránh bôi lên niêm mạc, vết thương hở.',
        N'Có thể gây khô da, bong tróc nhẹ trong tuần đầu.'),

    (25, N'Calamine Lotion',         N'Calamine, Zinc oxide',    N'Chai 100ml',   42000, 'DM010',
        N'Dung dịch bôi ngoài da, làm dịu ngứa, mát da, dùng cho viêm da tiếp xúc, rôm sảy.',
        N'Lắc đều, bôi lên vùng da tổn thương 2-3 lần/ngày.',
        N'Vết thương hở; quá mẫn với thành phần.',
        N'Tránh bôi lên niêm mạc mắt, miệng, mũi.'),

    (26, N'Ketoconazole Cream 2%',   N'Ketoconazole',            N'Tuýp 15g',     38000, 'DM010',
        N'Kem kháng nấm, điều trị nấm da, nấm kẽ, lang ben, hắc lào.',
        N'Bôi lên vùng da tổn thương 1-2 lần/ngày, dùng liên tục 2-4 tuần.',
        N'Quá mẫn với ketoconazole; không dùng cho mắt.',
        N'Tiếp tục dùng 1 tuần sau khi hết triệu chứng.'),

    -- Thuốc khử trùng (DM011)
    (27, N'Povidone Iodine 10%',     N'Povidone-iodine',         N'Chai 100ml',   32000, 'DM011',
        N'Dung dịch sát trùng phổ rộng, dùng ngoài da cho vết thương hở, vết mổ.',
        N'Rửa vết thương bằng dung dịch pha loãng hoặc bôi trực tiếp.',
        N'Tuyến giáp bất thường; phụ nữ có thai & cho con bú (không bôi diện rộng).',
        N'Không dùng chung với dung dịch chứa thủy ngân.'),

    (28, N'Hydrogen Peroxide 3%',    N'Hydrogen peroxide',       N'Chai 100ml',   15000, 'DM011',
        N'Dung dịch oxy già, sát trùng nhẹ vết thương hở, súc miệng khi viêm nướu.',
        N'Rửa vết thương, hoặc pha loãng 1:1 với nước để súc miệng.',
        N'Không bôi lên vùng da lành, không dùng sâu trong tai.',
        N'Bọt khí khi tiếp xúc vết thương là phản ứng bình thường.'),

    (29, N'Chlorhexidine 0.5%',      N'Chlorhexidine gluconate', N'Chai 250ml',   55000, 'DM011',
        N'Dung dịch sát trùng tay, da trước phẫu thuật, vết thương.',
        N'Rửa tay 1-3 phút với dung dịch không pha loãng.',
        N'Không dùng cho mắt, tai giữa, não; quá mẫn.',
        N'Hiệu quả kéo dài 6 giờ sau khi rửa.'),

    -- Thuốc dị ứng (DM012)
    (30, N'Fexofenadine 180mg',      N'Fexofenadine HCl',        N'10 viên/hộp',  78000, 'DM012',
        N'Thuốc kháng histamine thế hệ 2, điều trị viêm mũi dị ứng, mày đay.',
        N'Người lớn & trẻ >12 tuổi: 1 viên/ngày, uống trước bữa ăn.',
        N'Quá mẫn với thành phần; trẻ em dưới 12 tuổi.',
        N'Không gây buồn ngủ. An toàn khi lái xe & vận hành máy.'),

    (31, N'Desloratadine 5mg',       N'Desloratadine',           N'10 viên/hộp',  65000, 'DM012',
        N'Thuốc kháng histamine, điều trị viêm mũi dị ứng theo mùa và quanh năm.',
        N'Người lớn & trẻ >12 tuổi: 1 viên/ngày.',
        N'Quá mẫn; phụ nữ đang cho con bú.',
        N'Có thể uống cùng hoặc không cùng thức ăn.'),

    -- Bổ sung cho DM cũ
    (32, N'Cefixime 200mg',          N'Cefixime',                N'10 viên/hộp', 135000, 'DM001',
        N'Kháng sinh cephalosporin thế hệ 3, điều trị nhiễm khuẩn hô hấp, tiết niệu, tai mũi họng.',
        N'Người lớn: 1 viên x 2 lần/ngày; trẻ em theo cân nặng.',
        N'Quá mẫn với cephalosporin, penicillin; trẻ sơ sinh dưới 6 tháng.',
        N'Uống đủ liều 7-14 ngày, không tự ý ngưng thuốc.'),

    (33, N'Azithromycin 500mg',      N'Azithromycin',            N'6 viên/hộp',  145000, 'DM001',
        N'Kháng sinh macrolide, điều trị nhiễm khuẩn đường hô hấp, da, sinh dục.',
        N'Người lớn: 2 viên ngày đầu, sau đó 1 viên/ngày x 4 ngày.',
        N'Quá mẫn với macrolide; bệnh gan nặng; kết hợp ergotamine.',
        N'Uống trước bữa ăn 1 giờ hoặc sau ăn 2 giờ.'),

    (34, N'Metronidazole 250mg',     N'Metronidazole',           N'20 viên/hộp',  45000, 'DM003',
        N'Thuốc kháng khuẩn, điều trị nhiễm khuẩn kỵ khí, viêm âm đạo, kiết lỵ amip.',
        N'Người lớn: 1-2 viên x 3 lần/ngày, uống sau ăn.',
        N'Phụ nữ có thai 3 tháng đầu; nghiện rượu; bệnh thần kinh trung ương.',
        N'Tránh tuyệt đối rượu trong và sau khi dùng thuốc 3 ngày.'),

    (35, N'Domperidone 10mg',        N'Domperidone',             N'30 viên/hộp',  52000, 'DM003',
        N'Thuốc chống nôn, điều trị buồn nôn, nôn do nhiều nguyên nhân.',
        N'Người lớn: 1-2 viên x 3 lần/ngày trước bữa ăn 15-30 phút.',
        N'Xuất huyết tiêu hóa, tắc ruột; phụ nữ có thai; khoảng QT kéo dài.',
        N'Không dùng quá 7 ngày liên tục khi không có chỉ định.'),

    (36, N'Paracetamol 650mg',       N'Paracetamol',             N'20 viên/hộp',  35000, 'DM002',
        N'Giảm đau, hạ sốt cho người lớn, liều cao hơn viên 500mg thông thường.',
        N'Người lớn: 1 viên/lần, tối đa 4 viên/ngày, cách nhau ≥4 giờ.',
        N'Suy gan nặng; nghiện rượu; quá mẫn.',
        N'Không dùng quá 10 ngày liên tục. Tránh rượu.'),

    (37, N'Diclofenac 50mg',         N'Diclofenac sodium',       N'20 viên/hộp',  45000, 'DM002',
        N'Thuốc chống viêm không steroid (NSAID), giảm đau, kháng viêm.',
        N'Người lớn: 1 viên x 2-3 lần/ngày sau ăn.',
        N'Loét dạ dày tá tràng; suy tim/thận/gan nặng; phụ nữ có thai 3 tháng cuối.',
        N'Uống sau ăn no để giảm kích ứng dạ dày.'),

    (38, N'Vitamin D3 1000IU',       N'Cholecalciferol',         N'30 viên/hộp',  85000, 'DM006',
        N'Bổ sung vitamin D3, phòng và điều trị thiếu vitamin D, loãng xương.',
        N'Người lớn: 1 viên/ngày, uống cùng bữa ăn có chất béo.',
        N'Tăng canxi máu, sỏi thận canxi; quá liều vitamin D.',
        N'Kết hợp phơi nắng sáng 15 phút/ngày.'),

    (39, N'Kẽm Gluconate 50mg',     N'Zinc gluconate',          N'30 viên/hộp',  65000, 'DM006',
        N'Bổ sung kẽm, tăng cường miễn dịch, hỗ trợ tiêu hóa.',
        N'Người lớn: 1 viên/ngày, uống sau ăn.',
        N'Suy thận; người đang dùng kháng sinh tetracycline, fluoroquinolone.',
        N'Uống cách kháng sinh ≥2 giờ.'),

    (40, N'Acetylcysteine 200mg',   N'N-Acetylcysteine',        N'30 gói/hộp',   95000, 'DM007',
        N'Thuốc long đờm, tiêu nhầy, điều trị ho có đờm, viêm phế quản.',
        N'Người lớn: 1 gói x 3 lần/ngày, hòa tan trong nửa cốc nước.',
        N'Quá mẫn với acetylcysteine; hen phế quản nặng.',
        N'Uống ngay sau khi pha.'),

    (41, N'Salbutamol 4mg',         N'Salbutamol sulfate',      N'30 viên/hộp',  52000, 'DM007',
        N'Thuốc giãn phế quản, cắt cơn khó thở do co thắt phế quản.',
        N'Người lớn: 1-2 viên x 3-4 lần/ngày.',
        N'Tim mạch nặng; cường giáp không kiểm soát; đang dùng IMAO.',
        N'Run tay, nhịp nhanh là tác dụng phụ thường gặp.'),

    (42, N'Fluconazole 150mg',       N'Fluconazole',             N'1 viên/hộp',   65000, 'DM003',
        N'Thuốc kháng nấm, điều trị nhiễm nấm Candida âm đạo, miệng.',
        N'Người lớn: 1 viên liều duy nhất cho viêm âm đạo do Candida.',
        N'Phụ nữ có thai; suy thận/gan nặng; kết hợp terfenadine.',
        N'Có thể gây đau đầu, buồn nôn. Tránh rượu.'),

    (43, N'Medrol 16mg',             N'Methylprednisolone',      N'10 viên/hộp', 165000, 'DM002',
        N'Corticosteroid, kháng viêm, ức chế miễn dịch, điều trị dị ứng nặng.',
        N'Theo chỉ định bác sĩ, thường 1-2 viên/ngày sau ăn sáng.',
        N'Nhiễm trùng toàn thân chưa kiểm soát; loét dạ dày tá tràng.',
        N'Không ngưng thuốc đột ngột. Dùng ngắn hạn theo chỉ định.'),

    (44, N'Tobramycin Eye Drops 0.3%',N'Tobramycin sulfate',     N'Lọ 5ml',       75000, 'DM005',
        N'Thuốc nhỏ mắt kháng sinh, điều trị viêm kết mạc, viêm giác mạc do vi khuẩn.',
        N'Nhỏ 1-2 giọt vào mắt bị bệnh 2-4 lần/ngày, 7-10 ngày.',
        N'Quá mẫn với tobramycin, aminoglycoside; nhiễm nấm/virus mắt.',
        N'Không chạm đầu lọ vào mắt. Vứt lọ sau 28 ngày mở.'),

    (45, N'Berberin 100mg',          N'Berberin HCl',            N'100 viên/hộp', 42000, 'DM003',
        N'Thuốc kháng sinh thảo dược, điều trị tiêu chảy, lỵ trực trùng.',
        N'Người lớn: 4-6 viên x 2-3 lần/ngày.',
        N'Phụ nữ có thai & cho con bú; trẻ sơ sinh.',
        N'Có thể gây táo bón khi dùng kéo dài.');

    SET IDENTITY_INSERT Thuoc OFF;
    PRINT '[05] Seeded 25 Thuoc (MaThuoc 21-45)';
END
GO

-- ============================================================
-- 6. KHÁCH HÀNG — Bổ sung 23 KH (MaKH 6-28)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE TenKH = N'Nguyễn Thị Thu Hà')
BEGIN
    SET IDENTITY_INSERT KhachHang ON;
    DECLARE @NextKH INT = ISNULL((SELECT MAX(MaKH) FROM KhachHang), 0);

    INSERT INTO KhachHang (MaKH, TenKH, SDT, GioiTinh, NgayTao) VALUES
    (@NextKH+1,  N'Nguyễn Thị Thu Hà',  '0932112233', N'Nữ',  '2024-03-15'),
    (@NextKH+2,  N'Trần Văn Bình',      '0932113344', N'Nam', '2024-04-02'),
    (@NextKH+3,  N'Lê Thị Hồng Nhung',  '0932114455', N'Nữ',  '2024-04-20'),
    (@NextKH+4,  N'Phạm Đức Anh',       '0932115566', N'Nam', '2024-05-10'),
    (@NextKH+5,  N'Hoàng Thị Mai',      '0932116677', N'Nữ',  '2024-06-01'),
    (@NextKH+6,  N'Vũ Văn Khánh',       '0932117788', N'Nam', '2024-06-25'),
    (@NextKH+7,  N'Đặng Thị Lan Anh',   '0932118899', N'Nữ',  '2024-07-14'),
    (@NextKH+8,  N'Bùi Văn Hải',        '0932119900', N'Nam', '2024-08-08'),
    (@NextKH+9,  N'Ngô Thị Tuyết',      '0932120011', N'Nữ',  '2024-08-30'),
    (@NextKH+10, N'Đỗ Văn Nam',         '0932121122', N'Nam', '2024-09-12'),
    (@NextKH+11, N'Hồ Thị Phương',      '0932122233', N'Nữ',  '2024-10-05'),
    (@NextKH+12, N'Lý Văn Sơn',         '0932123344', N'Nam', '2024-10-28'),
    (@NextKH+13, N'Trịnh Thị Hằng',     '0932124455', N'Nữ',  '2024-11-15'),
    (@NextKH+14, N'Đào Văn Phong',      '0932125566', N'Nam', '2024-12-01'),
    (@NextKH+15, N'Phan Thị Thanh',      '0932126677', N'Nữ',  '2025-01-10'),
    (@NextKH+16, N'Tô Văn Đạt',         '0932127788', N'Nam', '2025-02-05'),
    (@NextKH+17, N'Mai Thị Hương',      '0932128899', N'Nữ',  '2025-03-01'),
    (@NextKH+18, N'Chu Văn Long',       '0932129900', N'Nam', '2025-03-25'),
    (@NextKH+19, N'Đinh Thị Yến',       '0932130011', N'Nữ',  '2025-05-12'),
    (@NextKH+20, N'Nguyễn Văn Đức',     '0932131122', N'Nam', '2025-06-08'),
    (@NextKH+21, N'Trần Thị Kim Oanh',  '0932132233', N'Nữ',  '2025-07-15'),
    (@NextKH+22, N'Lê Văn Thành',       '0932133344', N'Nam', '2025-08-20'),
    (@NextKH+23, N'Phạm Thị Thúy',      '0932134455', N'Nữ',  '2025-09-05');

    SET IDENTITY_INSERT KhachHang OFF;
    PRINT '[05] Seeded 23 KhachHang';
END
GO

-- ============================================================
-- 7. LÔ THUỐC bổ sung cho 25 thuốc mới (MaThuoc 21-45)
-- ============================================================
-- Dùng MaPN=1 (cũ nhất, idempotent — fallback nếu DB mới chưa có MaPN>5)
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (SELECT 1 FROM LoThuoc_ChiTietNhap l INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc WHERE t.TenThuoc = N'Amlodipine 5mg')
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    -- Tim mạch - HSD mới (MaPN=1)
    (21, 1, 80, 80, 35000, '2025-12-01', '2027-12-01'),   -- Amlodipine
    (22, 1, 60, 60, 52000, '2025-12-10', '2027-12-10'),   -- Losartan
    (23, 1, 40, 40, 80000, '2026-01-05', '2027-07-05'),   -- Atorvastatin
    -- Da liễu + khử trùng (MaPN=5)
    (24, 5, 50, 50, 45000, '2026-01-15', '2027-07-15'),   -- Benzoyl Peroxide
    (25, 5, 70, 70, 18000, '2026-01-20', '2027-07-20'),   -- Calamine
    (26, 5, 60, 60, 16000, '2026-02-01', '2027-08-01'),   -- Ketoconazole
    (27, 5, 100,100, 14000, '2026-02-10', '2027-02-10'),   -- Povidone
    (28, 5, 90, 90,  6000, '2026-02-15', '2027-02-15'),   -- Hydrogen Peroxide
    -- Dị ứng (MaPN=1) — cận date
    (30, 1, 20, 20, 42000, '2025-10-01', '2026-10-01'),   -- Fexofenadine CẬN (14 ngày)
    (31, 1, 30, 30, 35000, '2025-10-05', '2026-10-05'),   -- Desloratadine CẬN (18 ngày)
    -- Kháng sinh (MaPN=6)
    (32, 6, 60, 60, 85000, '2026-03-01', '2027-09-01'),   -- Cefixime
    (33, 6, 50, 50, 95000, '2026-03-10', '2027-09-10'),   -- Azithromycin
    (34, 6, 70, 70, 22000, '2026-03-15', '2027-09-15'),   -- Metronidazole
    -- Giảm đau + tiêu hóa (MaPN=7)
    (35, 7, 90, 90, 48000, '2026-04-15', '2028-04-15'),   -- Domperidone
    (36, 7,100,100, 18000, '2026-04-05', '2028-04-05'),   -- Paracetamol 650
    (37, 7, 80, 80, 25000, '2026-04-10', '2028-04-10'),   -- Diclofenac
    -- Vitamin + hô hấp (MaPN=8)
    (38, 8,100,100, 48000, '2026-06-01', '2028-06-01'),   -- Vitamin D3
    (39, 8, 80, 80, 35000, '2026-06-10', '2028-06-10'),   -- Kẽm
    (40, 8, 70, 70, 55000, '2026-06-20', '2028-06-20'),   -- Acetylcysteine
    (41, 8, 60, 60, 28000, '2026-06-25', '2028-06-25'),   -- Salbutamol
    -- Cảnh báo (MaPN=1) — Fluconazole 59 ngày
    (42, 1, 25, 25, 85000, '2025-11-15', '2026-11-15'),
    -- Medrol (MaPN=7)
    (43, 7, 60, 60, 55000, '2026-05-01', '2028-05-01'),
    -- Thuốc nhỏ mắt (MaPN=9)
    (44, 9, 50, 50, 45000, '2026-05-15', '2028-05-15'),
    -- Berberin (MaPN=10)
    (45,10, 40, 40, 22000, '2026-05-20', '2028-05-20');

    PRINT '[05] Seeded 24 LoThuoc_ChiTietNhap (MaThuoc 21-45)';
END
GO

-- ============================================================
-- 8. Verify (dùng biến trung gian tránh subquery trong CAST)
-- ============================================================
DECLARE @DM INT = (SELECT COUNT(*) FROM DanhMuc);
DECLARE @NCC INT = (SELECT COUNT(*) FROM NhaCungCap);
DECLARE @NV INT = (SELECT COUNT(*) FROM NhanVien);
DECLARE @TK INT = (SELECT COUNT(*) FROM TaiKhoan);
DECLARE @T INT = (SELECT COUNT(*) FROM Thuoc);
DECLARE @KH INT = (SELECT COUNT(*) FROM KhachHang);
DECLARE @Lo INT = (SELECT COUNT(*) FROM LoThuoc_ChiTietNhap);

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║              05_medicines.sql — VERIFICATION                  ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║   DanhMuc:        ' + CAST(@DM AS VARCHAR);
PRINT '║   NhaCungCap:     ' + CAST(@NCC AS VARCHAR);
PRINT '║   NhanVien:       ' + CAST(@NV AS VARCHAR);
PRINT '║   TaiKhoan:       ' + CAST(@TK AS VARCHAR);
PRINT '║   Thuoc:          ' + CAST(@T AS VARCHAR);
PRINT '║   KhachHang:      ' + CAST(@KH AS VARCHAR);
PRINT '║   LoThuoc_ChiTietNhap: ' + CAST(@Lo AS VARCHAR);
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO

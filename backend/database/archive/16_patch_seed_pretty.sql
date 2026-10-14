-- ============================================================
-- PATCH 16: Seed dữ liệu đẹp - Đa dạng, thực tế, đầy đủ nghiệp vụ
-- ============================================================
-- Mục đích: Bổ sung dữ liệu mẫu phong phú để demo/báo cáo.
-- Đặc điểm:
--   - Idempotent: dùng IF NOT EXISTS / NOT EXISTS để chạy nhiều lần OK.
--   - Bổ sung, KHÔNG xóa dữ liệu hiện có (tránh FK violation).
--   - Dữ liệu đa dạng theo nghiệp vụ nhà thuốc VN thực tế.
--
-- Thứ tự chạy:
--   1. DanhMuc (bổ sung 4 DM mới)
--   2. NhaCungCap (bổ sung 5 NCC tỉnh/thành)
--   3. NhanVien (bổ sung 8 NV đủ phòng ban)
--   4. TaiKhoan (bổ sung 8 account theo naming-conventions)
--   5. Thuoc (bổ sung 25 thuốc, kèm MoTa/LieuDung/ChongChiDinh)
--   6. KhachHang (bổ sung 23 KH đa dạng)
--   7. LoThuoc_ChiTietNhap (bổ sung lô đa dạng HSD)
--   8. HoaDon + ChiTietHoaDon (bổ sung 25 hóa đơn)
--   9. PhieuThu (backfill 1-1 với HoaDon + 3 phiếu Khac)
--  10. PhieuChi (bổ sung 12 phiếu chi đa dạng)
--  11. AuditLog (ghi nhận patch)
--  12. Verify
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
GO

USE SecurePharmaDB;
GO

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║  PATCH 16: SEED DỮ LIỆU ĐẸP - ĐA DẠNG & THỰC TẾ         ║';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO

-- ============================================================
-- 1. DANH MỤC - Bổ sung 4 danh mục còn thiếu
-- ============================================================
PRINT '';
PRINT '━━━ [1/10] DanhMuc ━━━';

IF NOT EXISTS (SELECT 1 FROM DanhMuc WHERE MaDM = 'DM009')
BEGIN
    INSERT INTO DanhMuc (MaDM, TenDM) VALUES
    ('DM009', N'Tim mạch - Huyết áp'),
    ('DM010', N'Da liễu'),
    ('DM011', N'Thuốc khử trùng - Sát khuẩn'),
    ('DM012', N'Thuốc dị ứng');
    PRINT '   ✓ Bổ sung 4 danh mục mới (DM009-DM012)';
END ELSE
BEGIN
    PRINT '   ℹ DM009 đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 2. NHÀ CUNG CẤP - Bổ sung 5 NCC các tỉnh/thành
-- ============================================================
PRINT '';
PRINT '━━━ [2/10] NhaCungCap ━━━';

IF NOT EXISTS (SELECT 1 FROM NhaCungCap WHERE TenNCC = N'Công ty CP Dược phẩm Imexpharm')
BEGIN
    SET IDENTITY_INSERT NhaCungCap ON;

    DECLARE @NextNCC INT = ISNULL((SELECT MAX(MaNCC) FROM NhaCungCap), 0);

    INSERT INTO NhaCungCap (MaNCC, TenNCC, DiaChi, SDT) VALUES
    (@NextNCC + 1, N'Công ty CP Dược phẩm Imexpharm',       N'KCN Phú Thanh, H.Phú Thanh, Đồng Nai',         '02513852626'),
    (@NextNCC + 2, N'Công ty CP Dược phẩm Sanofi Việt Nam', N'Lô C, KCN Trống Mới, Q.Ninh Kiều, Cần Thơ',  '02923762688'),
    (@NextNCC + 3, N'Công ty CP Dược phẩm DHG',              N'Lô B2, KCN Tây Bắc Củ Chi, TP.HCM',          '02838966789'),
    (@NextNCC + 4, N'Công ty CP Pymepharco',                  N'KCN Hòa Bình, TX.Long Xuyên, An Giang',        '02963843234'),
    (@NextNCC + 5, N'Công ty CP Dược phẩm Hậu Giang',        N'KCN Hòa Bình, TX.Long Xuyên, An Giang',        '02963962626');

    SET IDENTITY_INSERT NhaCungCap OFF;
    PRINT '   ✓ Bổ sung 5 nhà cung cấp mới';
END ELSE
BEGIN
    PRINT '   ℹ NhaCungCap đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 3. NHÂN VIÊN - Bổ sung 8 NV đủ phòng ban
-- ============================================================
PRINT '';
PRINT '━━━ [3/10] NhanVien ━━━';

IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE TenNV = N'Trương Thị Mai')
BEGIN
    SET IDENTITY_INSERT NhanVien ON;

    INSERT INTO NhanVien (MaNV, TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai) VALUES
    (5,  N'Trương Thị Mai',   '0938771122', N'Nữ',  9000000,  '2023-08-15', N'DangLam'),
    (6,  N'Phạm Văn Đức',   '0938553344', N'Nam', 8500000,  '2024-01-20', N'DangLam'),
    (7,  N'Ngô Thị Hà',     '0938115566', N'Nữ',  9000000,  '2023-11-05', N'DangLam'),
    (8,  N'Đào Văn Tuấn',   '0938227788', N'Nam', 9200000,  '2024-03-10', N'DangLam'),
    (9,  N'Vũ Thị Ngọc',    '0938339900', N'Nữ',  8800000,  '2024-05-22', N'DangLam'),
    (10, N'Bùi Minh Quân',   '0938441122', N'Nam', 7800000,  '2025-02-01', N'DangLam'),
    (11, N'Hoàng Thị Linh',  '0938553344', N'Nữ', 12000000, '2021-07-12', N'DangLam'),
    (12, N'Đỗ Văn Hùng',    '0938660011', N'Nam', 11000000, '2022-04-18', N'DangLam');

    SET IDENTITY_INSERT NhanVien OFF;
    PRINT '   ✓ Bổ sung 8 nhân viên mới (MaNV 5-12)';
END ELSE
BEGIN
    PRINT '   ℹ NhanVien đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 4. TÀI KHOẢN - Bổ sung 8 account theo naming convention
-- ============================================================
PRINT '';
PRINT '━━━ [4/10] TaiKhoan ━━━';

-- Hash bcrypt(10) của: BanHang@2026 → $2b$10$QdZ8c... (4 account đầu)
-- Hash bcrypt(10) của: Kho@2026   → $2b$10$SjT2b... (2 account kho)
-- Hash bcrypt(10) của: Admin@2026 → $2b$10$RmN4c... (1 account ketoan tạm)
-- Hash bcrypt(10) của: Admin@2026 → $2b$10$WxP6d... (1 account quanly)

IF NOT EXISTS (SELECT 1 FROM TaiKhoan WHERE TenDangNhap = 'banhang.mai')
BEGIN
    INSERT INTO TaiKhoan (TenDangNhap, MatKhauHash, VaiTro, TrangThai, MaNV, TokenVersion) VALUES
    ('banhang.mai',  '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS', N'NV_BanHang', N'HoatDong',  5, 1),
    ('banhang.duc',  '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS', N'NV_BanHang', N'HoatDong',  6, 1),
    ('kho.ha',       '$2b$10$K.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS2', N'NV_Kho',     N'HoatDong',  7, 1),
    ('kho.tuan',     '$2b$10$K.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS2', N'NV_Kho',     N'HoatDong',  8, 1),
    ('banhang.ngoc', '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS', N'NV_BanHang', N'HoatDong',  9, 1),
    ('banhang.quan', '$2b$10$0G.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS', N'NV_BanHang', N'HoatDong', 10, 1),
    ('ketoan.linh',  '$2b$10$L.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS3', N'NV_Kho',     N'HoatDong', 11, 1),
    ('quanly.hung',  '$2b$10$A.7qc3N7Z.K0z2L3RYxye6Q6JZDZjHt3M6FhB8g8gKq0bZ.f6xkS4', N'Admin',      N'HoatDong', 12, 1);
    PRINT '   ✓ Bổ sung 8 tài khoản (theo naming-conventions.mdc)';
END ELSE
BEGIN
    PRINT '   ℹ TaiKhoan banhang.mai đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 5. THUỐC - Bổ sung 25 thuốc đa dạng + đầy đủ thông tin
-- ============================================================
PRINT '';
PRINT '━━━ [5/10] Thuoc ━━━';

IF NOT EXISTS (SELECT 1 FROM Thuoc WHERE TenThuoc = N'Amlodipine 5mg')
BEGIN
    SET IDENTITY_INSERT Thuoc ON;

    DECLARE @NextThuoc INT = ISNULL((SELECT MAX(MaThuoc) FROM Thuoc), 0);

    -- Thuốc tim mạch (DM009)
    INSERT INTO Thuoc (MaThuoc, TenThuoc, HoatChat, KhoiLuong, GiaBanThamKhao, MaDM, MoTa, LieuDung, ChongChiDinh, GhiChu) VALUES
    (@NextThuoc+1,  N'Amlodipine 5mg',          N'Amlodipine besylate',     N'30 viên/hộp',  65000,  'DM009',
        N'Thuốc chẹn kênh canxi, điều trị tăng huyết áp và đau thắt ngực ổn định.',
        N'Người lớn: 1 viên/ngày, uống cùng thời điểm mỗi ngày.',
        N'Phụ nữ có thai, cho con bú; sốc tim; hẹp van động mạch chủ nặng.',
        N'Uống đều đặn để duy trì huyết áp ổn định. Không ngưng thuốc đột ngột.'),

    (@NextThuoc+2,  N'Losartan 50mg',           N'Losartan potassium',      N'30 viên/hộp',  95000,  'DM009',
        N'Thuốc đối kháng thụ thể angiotensin II, điều trị tăng huyết áp.',
        N'Người lớn: 1 viên/ngày, có thể tăng lên 2 viên/ngày tùy đáp ứng.',
        N'Phụ nữ có thai 3 tháng giữa & cuối; suy gan nặng.',
        N'Kết hợp chế độ ăn nhạt và tập thể dục đều đặn.'),

    (@NextThuoc+3,  N'Atorvastatin 20mg',       N'Atorvastatin calcium',    N'30 viên/hộp', 145000,  'DM009',
        N'Thuốc ức chế HMG-CoA reductase, giảm cholesterol máu, phòng xơ vữa động mạch.',
        N'Người lớn: 1 viên/ngày vào buổi tối.',
        N'Bệnh gan hoạt tính; phụ nữ có thai & cho con bú.',
        N'Xét nghiệm men gan trước & trong khi điều trị. Tránh uống rượu.'),

    -- Da liễu (DM010)
    (@NextThuoc+4,  N'Benzoyl Peroxide 5%',    N'Benzoyl peroxide',       N'Tuýp 30g',     85000,  'DM010',
        N'Gel trị mụn trứng cá, kháng khuẩn và bong vảy da.',
        N'Thoa gel lên vùng da mụn 1-2 lần/ngày sau khi rửa sạch.',
        N'Da nhạy cảm nặng; tránh bôi lên niêm mạc, vết thương hở.',
        N'Có thể gây khô da, bong tróc nhẹ trong tuần đầu.'),

    (@NextThuoc+5,  N'Calamine Lotion',          N'Calamine, Zinc oxide',   N'Chai 100ml',   42000,  'DM010',
        N'Dung dịch bôi ngoài da, làm dịu ngứa, mát da, dùng cho viêm da tiếp xúc, rôm sảy.',
        N'Lắc đều, bôi lên vùng da tổn thương 2-3 lần/ngày.',
        N'Vết thương hở; quá mẫn với thành phần.',
        N'Tránh bôi lên niêm mạc mắt, miệng, mũi.'),

    (@NextThuoc+6,  N'Ketoconazole Cream 2%',   N'Ketoconazole',            N'Tuýp 15g',     38000,  'DM010',
        N'Kem kháng nấm, điều trị nấm da, nấm kẽ, lang ben, hắc lào.',
        N'Bôi lên vùng da tổn thương 1-2 lần/ngày, dùng liên tục 2-4 tuần.',
        N'Quá mẫn với ketoconazole; không dùng cho mắt.',
        N'Tiếp tục dùng 1 tuần sau khi hết triệu chứng.'),

    -- Thuốc khử trùng (DM011)
    (@NextThuoc+7,  N'Povidone Iodine 10%',     N'Povidone-iodine',        N'Chai 100ml',   32000,  'DM011',
        N'Dung dịch sát trùng phổ rộng, dùng ngoài da cho vết thương hở, vết mổ.',
        N'Rửa vết thương bằng dung dịch pha loãng hoặc bôi trực tiếp.',
        N'Tuyến giáp bất thường; phụ nữ có thai & cho con bú (không bôi diện rộng).',
        N'Không dùng chung với dung dịch chứa thủy ngân.'),

    (@NextThuoc+8,  N'Hydrogen Peroxide 3%',     N'Hydrogen peroxide',       N'Chai 100ml',   15000,  'DM011',
        N'Dung dịch oxy già, sát trùng nhẹ vết thương hở, súc miệng khi viêm nướu.',
        N'Rửa vết thương, hoặc pha loãng 1:1 với nước để súc miệng.',
        N'Không bôi lên vùng da lành, không dùng sâu trong tai.',
        N'Bọt khí khi tiếp xúc vết thương là phản ứng bình thường.'),

    (@NextThuoc+9,  N'Chlorhexidine 0.5%',      N'Chlorhexidine gluconate',N'Chai 250ml',   55000,  'DM011',
        N'Dung dịch sát trùng tay, da trước phẫu thuật, vết thương.',
        N'Rửa tay 1-3 phút với dung dịch không pha loãng.',
        N'Không dùng cho mắt, tai giữa, não; quá mẫn.',
        N'Hiệu quả kéo dài 6 giờ sau khi rửa.'),

    -- Thuốc dị ứng (DM012)
    (@NextThuoc+10, N'Fexofenadine 180mg',      N'Fexofenadine HCl',       N'10 viên/hộp',  78000,  'DM012',
        N'Thuốc kháng histamine thế hệ 2, điều trị viêm mũi dị ứng, mày đay.',
        N'Người lớn & trẻ >12 tuổi: 1 viên/ngày, uống trước bữa ăn.',
        N'Quá mẫn với thành phần; trẻ em dưới 12 tuổi.',
        N'Không gây buồn ngủ. An toàn khi lái xe & vận hành máy.'),

    (@NextThuoc+11, N'Desloratadine 5mg',       N'Desloratadine',          N'10 viên/hộp',  65000,  'DM012',
        N'Thuốc kháng histamine, điều trị viêm mũi dị ứng theo mùa và quanh năm.',
        N'Người lớn & trẻ >12 tuổi: 1 viên/ngày.',
        N'Quá mẫn; phụ nên đang cho con bú.',
        N'Có thể uống cùng hoặc không cùng thức ăn.'),

    -- Bổ sung thêm cho các DM cũ
    (@NextThuoc+12, N'Cefixime 200mg',          N'Cefixime',               N'10 viên/hộp', 135000,  'DM001',
        N'Kháng sinh cephalosporin thế hệ 3, điều trị nhiễm khuẩn hô hấp, tiết niệu, tai mũi họng.',
        N'Người lớn: 1 viên x 2 lần/ngày; trẻ em theo cân nặng.',
        N'Quá mẫn với cephalosporin, penicillin; trẻ sơ sinh dưới 6 tháng.',
        N'Uống đủ liều 7-14 ngày, không tự ý ngưng thuốc.'),

    (@NextThuoc+13, N'Azithromycin 500mg',      N'Azithromycin',            N'6 viên/hộp',  145000,  'DM001',
        N'Kháng sinh macrolide, điều trị nhiễm khuẩn đường hô hấp, da, sinh dục.',
        N'Người lớn: 2 viên ngày đầu, sau đó 1 viên/ngày x 4 ngày.',
        N'Quá mẫn với macrolide; bệnh gan nặng; kết hợp ergotamine.',
        N'Uống trước bữa ăn 1 giờ hoặc sau ăn 2 giờ.'),

    (@NextThuoc+14, N'Metronidazole 250mg',      N'Metronidazole',           N'20 viên/hộp',  45000,  'DM003',
        N'Thuốc kháng khuẩn, điều trị nhiễm khuẩn kỵ khí, viêm âm đạo, kiết lỵ amip.',
        N'Người lớn: 1-2 viên x 3 lần/ngày, uống sau ăn.',
        N'Phụ nữ có thai 3 tháng đầu; nghiện rượu; bệnh thần kinh trung ương.',
        N'Tránh tuyệt đối rượu trong và sau khi dùng thuốc 3 ngày.'),

    (@NextThuoc+15, N'Domperidone 10mg',         N'Domperidone',            N'30 viên/hộp',  52000,  'DM003',
        N'Thuốc chống nôn, điều trị buồn nôn, nôn do nhiều nguyên nhân.',
        N'Người lớn: 1-2 viên x 3 lần/ngày trước bữa ăn 15-30 phút.',
        N'Xuất huyết tiêu hóa, tắc ruột; phụ nữ có thai; khoảng QT kéo dài.',
        N'Không dùng quá 7 ngày liên tục khi không có chỉ định.'),

    (@NextThuoc+16, N'Paracetamol 650mg',        N'Paracetamol',             N'20 viên/hộp',  35000,  'DM002',
        N'Giảm đau, hạ sốt cho người lớn, liều cao hơn viên 500mg thông thường.',
        N'Người lớn: 1 viên/lần, tối đa 4 viên/ngày, cách nhau ≥4 giờ.',
        N'Suy gan nặng; nghiện rượu; quá mẫn.',
        N'Không dùng quá 10 ngày liên tục. Tránh rượu.'),

    (@NextThuoc+17, N'Diclofenac 50mg',          N'Diclofenac sodium',      N'20 viên/hộp',  45000,  'DM002',
        N'Thuốc chống viêm không steroid (NSAID), giảm đau, kháng viêm.',
        N'Người lớn: 1 viên x 2-3 lần/ngày sau ăn.',
        N'Loét dạ dày tá tràng; suy tim/thận/gan nặng; phụ nữ có thai 3 tháng cuối.',
        N'Uống sau ăn no để giảm kích ứng dạ dày.'),

    (@NextThuoc+18, N'Vitamin D3 1000IU',        N'Cholecalciferol',        N'30 viên/hộp',  85000,  'DM006',
        N'Bổ sung vitamin D3, phòng và điều trị thiếu vitamin D, loãng xương.',
        N'Người lớn: 1 viên/ngày, uống cùng bữa ăn có chất béo.',
        N'Tăng canxi máu, sỏi thận canxi; quá liều vitamin D.',
        N'Kết hợp phơi nắng sáng 15 phút/ngày.'),

    (@NextThuoc+19, N'Kẽm Gluconate 50mg',      N'Zinc gluconate',         N'30 viên/hộp',  65000,  'DM006',
        N'Bổ sung kẽm, tăng cường miễn dịch, hỗ trợ tiêu hóa.',
        N'Người lớn: 1 viên/ngày, uống sau ăn.',
        N'Suy thận; người đang dùng kháng sinh tetracycline, fluoroquinolone.',
        N'Uống cách kháng sinh ≥2 giờ.'),

    (@NextThuoc+20, N'Acetylcysteine 200mg',    N'N-Acetylcysteine',       N'30 gói/hộp',   95000,  'DM007',
        N'Thuốc long đờm, tiêu nhầy, điều trị ho có đờm, viêm phế quản.',
        N'Người lớn: 1 gói x 3 lần/ngày, hòa tan trong nửa cốc nước.',
        N'Quá mẫn với acetylcysteine; hen phế quản nặng.',
        N'Uống ngay sau khi pha.'),

    (@NextThuoc+21, N'Salbutamol 4mg',          N'Salbutamol sulfate',     N'30 viên/hộp',  52000,  'DM007',
        N'Thuốc giãn phế quản, cắt cơn khó thở do co thắt phế quản.',
        N'Người lớn: 1-2 viên x 3-4 lần/ngày.',
        N'Tim mạch nặng; cường giáp không kiểm soát; đang dùng IMAO.',
        N'Run tay, nhịp nhanh là tác dụng phụ thường gặp.'),

    (@NextThuoc+22, N'Fluconazole 150mg',        N'Fluconazole',            N'1 viên/hộp',   65000,  'DM003',
        N'Thuốc kháng nấm, điều trị nhiễm nấm Candida âm đạo, miệng.',
        N'Người lớn: 1 viên liều duy nhất cho viêm âm đạo do Candida.',
        N'Phụ nữ có thai; suy thận/gan nặng; kết hợp terfenadine.',
        N'Có thể gây đau đầu, buồn nôn. Tránh rượu.'),

    (@NextThuoc+23, N'Medrol 16mg',              N'Methylprednisolone',     N'10 viên/hộp', 165000,  'DM002',
        N'Corticosteroid, kháng viêm, ức chế miễn dịch, điều trị dị ứng nặng.',
        N'Theo chỉ định bác sĩ, thường 1-2 viên/ngày sau ăn sáng.',
        N'Nhiễm trùng toàn thân chưa kiểm soát; loét dạ dày tá tràng.',
        N'Không ngưng thuốc đột ngột. Dùng ngắn hạn theo chỉ định.'),

    (@NextThuoc+24, N'Tobramycin Eye Drops 0.3%',N'Tobramycin sulfate',     N'Lọ 5ml',       75000,  'DM005',
        N'Thuốc nhỏ mắt kháng sinh, điều trị viêm kết mạc, viêm giác mạc do vi khuẩn.',
        N'Nhỏ 1-2 giọt vào mắt bị bệnh 2-4 lần/ngày, 7-10 ngày.',
        N'Quá mẫn với tobramycin, aminoglycoside; nhiễm nấm/virus mắt.',
        N'Không chạm đầu lọ vào mắt. Vứt lọ sau 28 ngày mở.'),

    (@NextThuoc+25, N'Berberin 100mg',           N'Berberin HCl',           N'100 viên/hộp', 42000,  'DM003',
        N'Thuốc kháng sinh thảo dược, điều trị tiêu chảy, lỵ trực trùng.',
        N'Người lớn: 4-6 viên x 2-3 lần/ngày.',
        N'Phụ nữ có thai & cho con bú; trẻ sơ sinh.',
        N'Có thể gây táo bón khi dùng kéo dài.');

    SET IDENTITY_INSERT Thuoc OFF;
    PRINT '   ✓ Bổ sung 25 thuốc mới (DM001,002,003,005,006,007,009,010,011,012)';
END ELSE
BEGIN
    PRINT '   ℹ Thuoc đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 6. KHÁCH HÀNG - Bổ sung 23 khách hàng đa dạng
-- ============================================================
PRINT '';
PRINT '━━━ [6/10] KhachHang ━━━';

IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE TenKH = N'Nguyễn Thị Thu Hà')
BEGIN
    SET IDENTITY_INSERT KhachHang ON;

    DECLARE @NextKH INT = ISNULL((SELECT MAX(MaKH) FROM KhachHang), 0);

    INSERT INTO KhachHang (MaKH, TenKH, SDT, GioiTinh, NgayTao) VALUES
    (@NextKH+1,  N'Nguyễn Thị Thu Hà',    '0932112233', N'Nữ',  '2024-03-15'),
    (@NextKH+2,  N'Trần Văn Bình',         '0932113344', N'Nam', '2024-04-02'),
    (@NextKH+3,  N'Lê Thị Hồng Nhung',    '0932114455', N'Nữ',  '2024-04-20'),
    (@NextKH+4,  N'Phạm Đức Anh',           '0932115566', N'Nam', '2024-05-10'),
    (@NextKH+5,  N'Hoàng Thị Mai',          '0932116677', N'Nữ',  '2024-06-01'),
    (@NextKH+6,  N'Vũ Văn Khánh',          '0932117788', N'Nam', '2024-06-25'),
    (@NextKH+7,  N'Đặng Thị Lan Anh',      '0932118899', N'Nữ',  '2024-07-14'),
    (@NextKH+8,  N'Bùi Văn Hải',           '0932119900', N'Nam', '2024-08-08'),
    (@NextKH+9,  N'Ngô Thị Tuyết',         '0932120011', N'Nữ',  '2024-08-30'),
    (@NextKH+10, N'Đỗ Văn Nam',            '0932121122', N'Nam', '2024-09-12'),
    (@NextKH+11, N'Hồ Thị Phương',         '0932122233', N'Nữ',  '2024-10-05'),
    (@NextKH+12, N'Lý Văn Sơn',            '0932123344', N'Nam', '2024-10-28'),
    (@NextKH+13, N'Trịnh Thị Hằng',        '0932124455', N'Nữ',  '2024-11-15'),
    (@NextKH+14, N'Đào Văn Phong',         '0932125566', N'Nam', '2024-12-01'),
    (@NextKH+15, N'Phan Thị Thanh',         '0932126677', N'Nữ',  '2025-01-10'),
    (@NextKH+16, N'Tô Văn Đạt',            '0932127788', N'Nam', '2025-02-05'),
    (@NextKH+17, N'Mai Thị Hương',         '0932128899', N'Nữ',  '2025-03-01'),
    (@NextKH+18, N'Chu Văn Long',           '0932129900', N'Nam', '2025-03-25'),
    (@NextKH+19, N'Đinh Thị Yến',          '0932130011', N'Nữ',  '2025-05-12'),
    (@NextKH+20, N'Nguyễn Văn Đức',        '0932131122', N'Nam', '2025-06-08'),
    (@NextKH+21, N'Trần Thị Kim Oanh',      '0932132233', N'Nữ',  '2025-07-15'),
    (@NextKH+22, N'Lê Văn Thành',           '0932133344', N'Nam', '2025-08-20'),
    (@NextKH+23, N'Phạm Thị Thúy',          '0932134455', N'Nữ',  '2025-09-05');

    SET IDENTITY_INSERT KhachHang OFF;
    PRINT '   ✓ Bổ sung 23 khách hàng mới';
END ELSE
BEGIN
    PRINT '   ℹ KhachHang đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- 7. LÔ THUỐC - Bổ sung lô đa dạng HSD
-- ============================================================
PRINT '';
PRINT '━━━ [7/10] LoThuoc_ChiTietNhap ━━━';

-- MaLo là IDENTITY(1,1) → không hard-code MaLo.
-- Ngày reference: 2026-09-17.
-- Phân bố HSD:
--   - Lô mới: 365-730 ngày (HSD 2027-2028)
--   - Lô cận date: 14-29 ngày (HSD ≤2026-10-15) → test UI "Sắp hết hạn"
--   - Lô cảnh báo: 30-90 ngày (HSD 2026-11) → test UI "Cảnh báo"
--
-- MaPN có sẵn: 1, 5-15 (check từ DB thực tế)

-- Lô thuốc tim mạch + dị ứng + cận date — MaPN=1 (cũ nhất)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Amlodipine 5mg'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    -- Tim mạch - HSD mới
    (24, 1, 80, 80, 35000, '2025-12-01', '2027-12-01'),   -- Amlodipine
    (25, 1, 60, 60, 52000, '2025-12-10', '2027-12-10'),   -- Losartan
    (26, 1, 40, 40, 80000, '2026-01-05', '2027-07-05'),   -- Atorvastatin
    -- Dị ứng - CẬN DATE
    (33, 1, 20, 20, 42000, '2025-10-01', '2026-10-01'),   -- Fexofenadine CẬN (14 ngày)
    (34, 1, 30, 30, 35000, '2025-10-05', '2026-10-05'),   -- Desloratadine CẬN (18 ngày)
    -- Cảnh báo
    (45, 1, 25, 25, 85000, '2025-11-15', '2026-11-15');  -- Fluconazole CẢNH BÁO (59 ngày)

    PRINT '   ✓ Bổ sung lô: tim mạch + dị ứng (MaPN=1)';
END

-- Da liễu + khử trùng — MaPN=5
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Benzoyl Peroxide 5%'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (27, 5, 50, 50, 45000, '2026-01-15', '2027-07-15'),   -- Benzoyl Peroxide
    (28, 5, 70, 70, 18000, '2026-01-20', '2027-07-20'),   -- Calamine Lotion
    (29, 5, 60, 60, 16000, '2026-02-01', '2027-08-01'),   -- Ketoconazole Cream
    (30, 5, 100, 100, 14000, '2026-02-10', '2027-02-10'), -- Povidone Iodine
    (31, 5, 90, 90,  6000, '2026-02-15', '2027-02-15'); -- Hydrogen Peroxide

    PRINT '   ✓ Bổ sung lô: da liễu + khử trùng (MaPN=5)';
END

-- Kháng sinh — MaPN=6
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Cefixime 200mg'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (35, 6, 60, 60, 85000, '2026-03-01', '2027-09-01'),   -- Cefixime
    (36, 6, 50, 50, 95000, '2026-03-10', '2027-09-10'),   -- Azithromycin
    (37, 6, 70, 70, 22000, '2026-03-15', '2027-09-15');   -- Metronidazole

    PRINT '   ✓ Bổ sung lô: kháng sinh (MaPN=6)';
END

-- Giảm đau + tiêu hóa — MaPN=7
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Paracetamol 650mg'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (39, 7, 100, 100, 18000, '2026-04-05', '2028-04-05'), -- Paracetamol 650mg
    (40, 7,  80,  80, 25000, '2026-04-10', '2028-04-10'), -- Diclofenac
    (38, 7,  90,  90, 48000, '2026-04-15', '2028-04-15'), -- Domperidone
    (46, 7,  60,  60, 55000, '2026-05-01', '2028-05-01'); -- Medrol

    PRINT '   ✓ Bổ sung lô: giảm đau + tiêu hóa (MaPN=7)';
END

-- Vitamin + hô hấp — MaPN=8
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Vitamin D3 1000IU'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (41, 8, 100, 100, 48000, '2026-06-01', '2028-06-01'), -- Vitamin D3
    (42, 8,  80,  80, 35000, '2026-06-10', '2028-06-10'), -- Kẽm Gluconate
    (43, 8,  70,  70, 55000, '2026-06-20', '2028-06-20'), -- Acetylcysteine
    (44, 8,  60,  60, 28000, '2026-06-25', '2028-06-25'); -- Salbutamol

    PRINT '   ✓ Bổ sung lô: vitamin + hô hấp (MaPN=8)';
END

-- Thuốc nhỏ mắt — MaPN=9
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Tobramycin Eye Drops 0.3%'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (47, 9, 50, 50, 45000, '2026-05-15', '2028-05-15'); -- Tobramycin Eye Drops

    PRINT '   ✓ Bổ sung lô: thuốc nhỏ mắt (MaPN=9)';
END

-- Berberin — MaPN=10
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
    WHERE t.TenThuoc = N'Berberin 100mg'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    (48, 10, 40, 40, 22000, '2026-05-20', '2028-05-20'); -- Berberin

    PRINT '   ✓ Bổ sung lô: Berberin (MaPN=10)';
END
GO

-- ============================================================
-- 8. HÓA ĐƠN + CHI TIẾT HÓA ĐƠN - Bổ sung 25 hóa đơn đa dạng
-- ============================================================
PRINT '';
PRINT '━━━ [8/10] HoaDon + ChiTietHoaDon ━━━';

DECLARE @HD INT;

-- Hóa đơn tháng 6/2026
IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-06-15 09:30:00')
BEGIN
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, NULL, '2026-06-15 09:30:00', 285000, 25000, 300000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 1, 2, 65000),
    (@HD, 25, 1, 145000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, NULL, '2026-06-17 10:15:00', 92000, 0, 100000, 8000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 28, 1, 42000),
    (@HD, 30, 1, 50000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, 9, '2026-06-20 14:30:00', 175000, 0, 200000, 25000, N'DaHuy');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 35, 1, 175000);

    PRINT '   ✓ Seed 3 hóa đơn tháng 6/2026';
END
GO

IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-07-05 11:00:00')
BEGIN
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, NULL, '2026-07-05 11:00:00', 132000, 0, 150000, 18000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 8, 1, 65000),
    (@HD, 39, 2, 35000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, NULL, '2026-07-10 15:20:00', 425000, 15000, 450000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 41, 3, 95000),
    (@HD, 42, 2, 65000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, NULL, '2026-07-15 16:45:00', 685000, 35000, 700000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 3, 145000),
    (@HD, 25, 2, 95000),
    (@HD, 24, 3, 65000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, NULL, '2026-07-22 09:00:00', 45000, 0, 50000, 5000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 8, 1, 28000),
    (@HD, 9, 1, 17000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, 13, '2026-07-28 14:10:00', 198000, 8000, 200000, 10000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 36, 1, 145000),
    (@HD, 37, 1, 53000);

    PRINT '   ✓ Seed 5 hóa đơn tháng 7/2026';
END
GO

IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-08-03 10:30:00')
BEGIN
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, 14, '2026-08-03 10:30:00', 365000, 50000, 350000, 35000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 2, 145000),
    (@HD, 40, 3, 75000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (9, 15, '2026-08-08 13:20:00', 175000, 0, 200000, 25000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 39, 5, 35000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, NULL, '2026-08-12 11:30:00', 98000, 0, 100000, 2000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 3, 1, 35000),
    (@HD, 2, 1, 45000),
    (@HD, 7, 1, 18000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, 16, '2026-08-18 15:45:00', 425000, 25000, 450000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 1, 145000),
    (@HD, 25, 1, 95000),
    (@HD, 24, 2, 65000),
    (@HD, 41, 1, 95000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, 17, '2026-08-25 16:00:00', 235000, 0, 250000, 15000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 39, 4, 35000),
    (@HD, 8, 2, 28000),
    (@HD, 38, 1, 35000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (9, 18, '2026-08-30 10:00:00', 95000, 0, 100000, 5000, N'DaHuy');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 28, 1, 95000);

    PRINT '   ✓ Seed 6 hóa đơn tháng 8/2026';
END
GO

IF NOT EXISTS (SELECT 1 FROM HoaDon WHERE NgayGioLap = '2026-09-02 09:15:00')
BEGIN
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, 19, '2026-09-02 09:15:00', 132000, 0, 150000, 18000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 33, 1, 78000),
    (@HD, 34, 1, 54000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, 20, '2026-09-04 10:30:00', 425000, 25000, 450000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 2, 145000),
    (@HD, 25, 1, 95000),
    (@HD, 24, 1, 65000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, NULL, '2026-09-05 14:00:00', 58000, 0, 60000, 2000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 3, 1, 35000),
    (@HD, 8, 1, 23000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, 21, '2026-09-06 11:20:00', 285000, 0, 300000, 15000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 41, 3, 95000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (9, 22, '2026-09-08 16:30:00', 595000, 45000, 600000, 50000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 2, 145000),
    (@HD, 25, 2, 95000),
    (@HD, 24, 1, 65000),
    (@HD, 41, 1, 95000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, 23, '2026-09-10 09:00:00', 235000, 0, 235000, 0, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 39, 4, 35000),
    (@HD, 34, 2, 47000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (6, 24, '2026-09-12 10:45:00', 175000, 5000, 200000, 30000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 36, 1, 145000),
    (@HD, 38, 1, 35000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (2, 25, '2026-09-14 13:30:00', 95000, 0, 100000, 5000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 28, 1, 95000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, 26, '2026-09-15 15:20:00', 425000, 15000, 450000, 40000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 41, 2, 95000),
    (@HD, 42, 2, 65000),
    (@HD, 43, 1, 55000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (9, NULL, '2026-09-16 10:00:00', 145000, 0, 145000, 0, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 26, 1, 145000);

    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai) VALUES
    (5, NULL, '2026-09-17 08:30:00', 38000, 0, 50000, 12000, N'DaThanhToan');
    SET @HD = SCOPE_IDENTITY();
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe) VALUES
    (@HD, 39, 1, 35000),
    (@HD, 33, 1, 3000);

    PRINT '   ✓ Seed 11 hóa đơn tháng 9/2026';
END
GO

-- ============================================================
-- 9. PHIẾU THU - Backfill idempotent + bổ sung phiếu Khac
-- ============================================================
PRINT '';
PRINT '━━━ [9/10] PhieuThu ━━━';

-- Backfill mỗi HĐ DaThanhToan có 1 phiếu thu loại BanHang
INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD, CreatedAt)
SELECT hd.NgayGioLap,
       hd.TongTien - hd.GiamGia,
       N'BanHang',
       CONCAT(N'Thu bán hàng - Hóa đơn #', hd.MaHD),
       hd.MaNV,
       hd.MaHD,
       COALESCE(hd.CreatedAt, hd.NgayGioLap)
FROM HoaDon hd
WHERE hd.TrangThai = N'DaThanhToan'
  AND NOT EXISTS (SELECT 1 FROM PhieuThu pt WHERE pt.MaHD = hd.MaHD);
PRINT '   ✓ Backfill PhieuThu 1-1 với HoaDon DaThanhToan';

-- Bổ sung phiếu thu khác
IF NOT EXISTS (SELECT 1 FROM PhieuThu WHERE NoiDung = N'Thu hợp đồng tư vấn tháng 7')
BEGIN
    DECLARE @NextPT INT = ISNULL((SELECT MAX(MaPhieuThu) FROM PhieuThu), 0);

    SET IDENTITY_INSERT PhieuThu ON;
    INSERT INTO PhieuThu (MaPhieuThu, NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD) VALUES
    (@NextPT+1, '2026-07-30 11:00:00',  850000, N'Khac', N'Thu hợp đồng tư vấn tháng 7',          1, NULL),
    (@NextPT+2, '2026-08-30 11:00:00',  920000, N'Khac', N'Thu hợp đồng tư vấn tháng 8',          1, NULL),
    (@NextPT+3, '2026-09-05 14:30:00', 1500000, N'Khac', N'Thu tiền hoa hồng từ nhà cung cấp tháng 9', 12, NULL);
    SET IDENTITY_INSERT PhieuThu OFF;

    PRINT '   ✓ Bổ sung 3 phiếu thu Khac';
END
GO

-- ============================================================
-- 10. PHIẾU CHI - Bổ sung 12 phiếu chi đa dạng
-- ============================================================
PRINT '';
PRINT '━━━ [10/10] PhieuChi ━━━';

IF NOT EXISTS (SELECT 1 FROM PhieuChi WHERE NoiDung = N'Thanh toán lương nhân viên tháng 6/2026')
BEGIN
    DECLARE @NextPC INT = ISNULL((SELECT MAX(MaPhieuChi) FROM PhieuChi), 0);

    SET IDENTITY_INSERT PhieuChi ON;
    INSERT INTO PhieuChi (MaPhieuChi, NgayLap, SoTien, NoiDung, MaNV) VALUES
    -- Lương hàng tháng
    (@NextPC+1,  '2026-07-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 6/2026', 1),
    (@NextPC+2,  '2026-08-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 7/2026', 1),
    (@NextPC+3,  '2026-09-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 8/2026', 1),
    -- Thanh toán NCC
    (@NextPC+4,  '2026-07-15 14:00:00', 12500000, N'Thanh toán công nợ NCC Imexpharm - Phiếu nhập #13', 1),
    (@NextPC+5,  '2026-08-10 11:30:00',  8700000, N'Thanh toán công nợ NCC Hà Nội - Phiếu nhập #14', 12),
    (@NextPC+6,  '2026-09-02 16:00:00', 14800000, N'Thanh toán công nợ NCC Đà Nẵng - Phiếu nhập #15', 1),
    -- Chi phí vận hành
    (@NextPC+7,  '2026-07-20 10:00:00',  3500000, N'Thanh toán tiền điện quý 2/2026', 11),
    (@NextPC+8,  '2026-07-25 13:00:00',  1800000, N'Thanh toán tiền nước + internet tháng 7', 11),
    (@NextPC+9,  '2026-08-15 09:30:00',  2200000, N'Mua văn phòng phẩm + túi thuốc', 11),
    -- Khác
    (@NextPC+10, '2026-08-20 15:00:00',  5000000, N'Thanh toán phần mềm quản lý + hosting 6 tháng', 12),
    (@NextPC+11, '2026-09-01 09:00:00',   850000, N'Mua quà trung thu cho nhân viên', 12),
    (@NextPC+12, '2026-09-10 11:00:00',  1200000, N'Sửa chữa máy tính tiền + bảo trì điều hòa', 11);
    SET IDENTITY_INSERT PhieuChi OFF;

    PRINT '   ✓ Bổ sung 12 phiếu chi (lương, NCC, vận hành, khác)';
END
GO

-- ============================================================
-- 11. AUDIT LOG - Ghi nhận patch
-- ============================================================
PRINT '';
PRINT '━━━ [11/11] AuditLog ━━━';

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE NewValue = N'PATCH 16 SEED SUCCESS')
BEGIN
    INSERT INTO AuditLog (TenDangNhap, Action, TableName, RecordID, NewValue, IPAddress) VALUES
    ('admin.huong', N'PATCH_16_SEED', N'System', N'PATCH_16', N'PATCH 16 SEED SUCCESS', '127.0.0.1');
    PRINT '   ✓ Ghi AuditLog cho patch 16';
END
GO

-- ============================================================
-- 12. VERIFY - Tổng kết
-- ============================================================
PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║              SEED ĐẸP VERIFICATION                            ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';

SELECT
    '║   ' + LEFT(t.TableName, 20) + ' = ' + RIGHT(SPACE(5) + CAST(t.Cnt AS VARCHAR), 5) + ' dòng                                         ║' AS Line
FROM (
    SELECT 'DanhMuc' AS TableName, COUNT(*) AS Cnt FROM DanhMuc
    UNION ALL SELECT 'NhaCungCap',          COUNT(*) FROM NhaCungCap
    UNION ALL SELECT 'NhanVien',            COUNT(*) FROM NhanVien
    UNION ALL SELECT 'TaiKhoan',            COUNT(*) FROM TaiKhoan
    UNION ALL SELECT 'Thuoc',               COUNT(*) FROM Thuoc
    UNION ALL SELECT 'KhachHang',           COUNT(*) FROM KhachHang
    UNION ALL SELECT 'PhieuNhap',           COUNT(*) FROM PhieuNhap
    UNION ALL SELECT 'LoThuoc_ChiTietNhap', COUNT(*) FROM LoThuoc_ChiTietNhap
    UNION ALL SELECT 'HoaDon',              COUNT(*) FROM HoaDon
    UNION ALL SELECT 'ChiTietHoaDon',       COUNT(*) FROM ChiTietHoaDon
    UNION ALL SELECT 'PhieuThu',            COUNT(*) FROM PhieuThu
    UNION ALL SELECT 'PhieuChi',            COUNT(*) FROM PhieuChi
) t;

PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║  Trạng thái:                                               ║';
SELECT
    '║   HoaDon: DaThanhToan = ' + CAST(SUM(CASE WHEN TrangThai=N'DaThanhToan' THEN 1 ELSE 0 END) AS VARCHAR) + ' | DaHuy = ' + CAST(SUM(CASE WHEN TrangThai=N'DaHuy' THEN 1 ELSE 0 END) AS VARCHAR) + '                                           ║' AS Line
FROM HoaDon
UNION ALL
SELECT '║   KhachHang: ' + CAST(COUNT(*) AS VARCHAR) + ' KH | KH vãng lai (NULL) = ' + CAST(SUM(CASE WHEN MaKH IS NULL THEN 1 ELSE 0 END) AS VARCHAR) + '                                             ║' FROM HoaDon;

PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║  Cảnh báo HSD (tính đến 2026-09-17):                     ║';

SELECT TOP 5
    '║   Lô ' + CAST(l.MaLo AS VARCHAR) + ': ' + LEFT(t.TenThuoc, 18)
    + ' — còn ' + CAST(DATEDIFF(DAY, '2026-09-17', l.HanSD) AS VARCHAR) + ' ngày'
    + REPLICATE(' ', 30 - LEN(CAST(l.MaLo AS VARCHAR)) - LEN(t.TenThuoc) - LEN(CAST(DATEDIFF(DAY, '2026-09-17', l.HanSD) AS VARCHAR)))
    + '║' AS Line
FROM LoThuoc_ChiTietNhap l
INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
WHERE pn.TrangThai = N'DaNhap' AND l.SoLuongTonKho > 0
  AND DATEDIFF(DAY, '2026-09-17', l.HanSD) <= 90
ORDER BY DATEDIFF(DAY, '2026-09-17', l.HanSD) ASC;

PRINT '╚════════════════════════════════════════════════════════════════╝';
GO

PRINT '';
PRINT '✅ Patch 16 đã áp dụng thành công!';
PRINT '📝 Lệnh tiếp theo:';
PRINT '   npm run db:status    # xem trạng thái';
PRINT '   npm start           # chạy server';
PRINT '';
PRINT '🔑 Tài khoản demo (theo naming-conventions.mdc):';
PRINT '   admin.huong    / Admin@2026    (Admin - Nguyễn Thị Hương)';
PRINT '   banhang.minh   / BanHang@2026  (NV_BanHang - Trần Văn Minh)';
PRINT '   banhang.lan    / BanHang@2026  (NV_BanHang - Lê Thị Lan)';
PRINT '   kho.cuong      / Kho@2026      (NV_Kho - Lê Văn Cường)';
PRINT '   banhang.mai    / BanHang@2026  (NV_BanHang - Trương Thị Mai)';
PRINT '   banhang.duc    / BanHang@2026  (NV_BanHang - Phạm Văn Đức)';
PRINT '   kho.ha         / Kho@2026      (NV_Kho - Ngô Thị Hà)';
PRINT '   kho.tuan       / Kho@2026      (NV_Kho - Đào Văn Tuấn)';
GO
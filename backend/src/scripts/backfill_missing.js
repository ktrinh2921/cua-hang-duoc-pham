/**
 * Script backfill dữ liệu thiếu cho SecurePharmaDB
 * Chạy: node src/scripts/backfill_missing.js
 *
 * Vấn đề:
 * 1. Thuoc (1-23): 23 dòng NULL MoTa, LieuDung, ChongChiDinh, GhiChu
 * 2. PhieuChi: chỉ 7 dòng, cần thêm 12 dòng từ patch 16
 */
require('dotenv').config();
const sql = require('mssql');

async function backfill() {
    const pool = await sql.connect({
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT) || 1433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'SecurePharmaDB',
        options: { encrypt: false, trustServerCertificate: true }
    });

    console.log('🔄 Bắt đầu backfill dữ liệu...\n');

    // ============================================================
    // 1. Backfill Thuoc MoTa, LieuDung, ChongChiDinh, GhiChu
    // ============================================================
    console.log('━━━ [1] Backfill Thuoc (1-23) MoTa ━━━');

    const thuocData = {
        1:  { moTa: 'Thuốc giảm đau, hạ sốt phổ biến nhất. Hoạt chất paracetamol ức chế tổng hợp prostaglandin ở trung khu thần kinh trung ương.',
              lieu: 'Người lớn: 1-2 viên x 3-4 lần/ngày, tối đa 8 viên/ngày. Trẻ em theo cân nặng.',
              chong: 'Quá mẫn với paracetamol; suy gan nặng; nghiện rượu nặng.',
              ghiChu: 'Không uống rượu khi dùng thuốc. Dùng đúng liều, không quá 10 ngày liên tục.' },
        2:  { moTa: 'Kháng sinh penicillin bán tổng hợp, diệt khuẩn bằng cách ức chế tổng hợp thành tế bào vi khuẩn.',
              lieu: 'Người lớn: 1 viên x 3 lần/ngày; trẻ em: 25-50mg/kg/ngày chia 3 lần.',
              chong: 'Quá mẫn với penicillin; bệnh nhân có tiền sử dị ứng kháng sinh beta-lactam.',
              ghiChu: 'Uống đủ liều 7-14 ngày kể cả khi hết triệu chứng. Có thể gây tiêu chảy nhẹ.' },
        3:  { moTa: 'Thuốc chống viêm không steroid (NSAID), giảm đau, hạ sốt và kháng viêm. Ức chế cyclooxygenase.',
              lieu: 'Người lớn: 1 viên x 3 lần/ngày sau ăn. Tối đa 3 viên/ngày.',
              chong: 'Loét dạ dày tá tràng; suy thận/gan nặng; phụ nữ có thai 3 tháng cuối; quá mẫn NSAID.',
              ghiChu: 'Uống sau ăn no để giảm kích ứng dạ dày. Không kết hợp aspirin hoặc NSAID khác.' },
        4:  { moTa: 'Vitamin C tổng hợp, bổ sung vitamin C, chống oxy hóa, tăng cường miễn dịch, phòng và điều trị scurvy.',
              lieu: 'Người lớn: 1 viên/ngày. Có thể tăng 2-3 viên/ngày khi thiếu vitamin C nặng.',
              chong: 'Sỏi thận oxalat; người có tiền sử sỏi thận; quá mẫn.',
              ghiChu: 'Uống sau bữa ăn để giảm kích ứng dạ dày. Tránh uống vào buổi tối muộn.' },
        5:  { moTa: 'Thuốc ức chế bơm proton (PPI), giảm tiết acid dạ dày, điều trị loét dạ dày tá tràng, GERD, H.pylori.',
              lieu: 'Người lớn: 1 viên/ngày trước bữa sáng 30 phút. Liều tăng gấp đôi khi cần.',
              chong: 'Quá mẫn với omeprazole; dùng chung với nelfinavir.',
              ghiChu: 'Uống nguyên viên, không nhai. Liều duy trì sau 4-8 tuần theo chỉ định.' },
        6:  { moTa: 'Thuốc điều trị đái tháo đường type 2. Giảm đường huyết bằng cách giảm sản xuất glucose gan và tăng nhạy cảm insulin.',
              lieu: 'Người lớn: 1 viên x 2 lần/ngày với bữa ăn. Có thể tăng lên 2 viên x 2 lần/ngày.',
              chong: 'Đái tháo đường type 1; toan ceton do đái tháo đường; suy thận nặng; quá mẫn.',
              ghiChu: 'Kết hợp chế độ ăn kiêng và tập thể dục. Theo dõi đường huyết định kỳ.' },
        7:  { moTa: 'Thuốc trị tiêu chảy cấp, ức chế nhu động ruột, kéo dài thời gian vận chuyển ruột.',
              lieu: 'Người lớn: 1 viên sau mỗi lần tiêu chảy, tối đa 4 viên/ngày. Không dùng quá 2 ngày.',
              chong: 'Tiêu chảy do nhiễm khuẩn hoặc ký sinh trùng; viêm đại tràng loét; tắc ruột.',
              ghiChu: 'Ngưng thuốc khi hết tiêu chảy. Bù nước và điện giải đường uống kết hợp.' },
        8:  { moTa: 'Thuốc kháng histamine thế hệ 1, điều trị viêm mũi dị ứng, mày đay, ngứa, dị ứng da.',
              lieu: 'Người lớn: 1 viên x 1-2 lần/ngày. Trẻ em 6-12 tuổi: 1/2 viên x 2 lần/ngày.',
              chong: 'Quá mẫn; glaucoma góc đóng; phì đại tuyến tiền liệt; trẻ em dưới 6 tuổi.',
              ghiChu: 'Có thể gây buồn ngủ. Không dùng khi lái xe hoặc vận hành máy nếu bị buồn ngủ.' },
        9:  { moTa: 'Thuốc kháng histamine thế hệ 2, điều trị viêm mũi dị ứng, mày đay mãn tính. Ít gây buồn ngủ hơn thế hệ 1.',
              lieu: 'Người lớn & trẻ >12 tuổi: 1 viên/ngày. Trẻ 6-12 tuổi: 1/2 viên x 2 lần/ngày.',
              chong: 'Quá mẫn; suy thận nặng (cần giảm liều); trẻ em dưới 6 tuổi.',
              ghiChu: 'Có thể dùng khi lái xe vì ít gây buồn ngủ. Uống với hoặc không với thức ăn.' },
        10: { moTa: 'Viên uống tổng hợp vitamin nhóm B (B1, B6, B12), hỗ trợ chuyển hóa năng lượng, tăng cường thần kinh.',
              lieu: 'Người lớn: 1 viên/ngày sau bữa ăn sáng.',
              chong: 'Quá mẫn với vitamin nhóm B.',
              ghiChu: 'Nên uống vào buổi sáng, tránh buổi tối vì có thể gây khó ngủ. Màu nước tiểu vàng là bình thường.' },
        11: { moTa: 'Viên nén bổ sung canxi carbonate và vitamin D3, phòng và điều trị thiếu canxi, loãng xương, còi xương.',
              lieu: 'Người lớn: 1 viên x 2 lần/ngày sau ăn hoặc theo chỉ định bác sĩ.',
              chong: 'Tăng canxi máu; sỏi thận canxi; suy thận nặng; quá mẫn.',
              ghiChu: 'Uống với nhiều nước. Không uống chung với sữa hoặc thực phẩm giàu canxi khác.' },
        12: { moTa: 'Nước muối sinh lý 0.9%, dùng rửa vết thương, rửa mắt, rửa mũi, súc họng.',
              lieu: 'Rửa vết thương: dùng trực tiếp. Rửa mũi: nghiêng đầu, bơm nhẹ vào lỗ mũi.',
              chong: 'Không tiêm truyền tĩnh mạch; không dùng cho mắt có lens contact.',
              ghiChu: 'Vứt bỏ sau khi mở nắp. Không dùng nếu dung dịch đổi màu hoặc có cặn.' },
        13: { moTa: 'Thuốc nhỏ mũi co mạch, điều trị nghẹt mũi do cảm cúm, viêm mũi dị ứng, viêm xoang.',
              lieu: 'Người lớn & trẻ >6 tuổi: nhỏ 1-2 giọt vào mỗi lỗ mũi, 2-3 lần/ngày. Không quá 5 ngày.',
              chong: 'Glaucoma góc đóng; viêm mũi khô nặng; trẻ dưới 6 tuổi; dùng ức chế MAO.',
              ghiChu: 'Không dùng quá 5 ngày liên tục để tránh viêm mũi thuốc (thuốc không còn hiệu quả).' },
        14: { moTa: 'Thuốc nhỏ mắt kháng sinh, điều trị viêm kết mạc, viêm bờ mi, nhiễm trùng mắt nhẹ do vi khuẩn nhạy cảm.',
              lieu: 'Nhỏ 1-2 giọt vào mắt bị bệnh 2-4 lần/ngày, 7-10 ngày.',
              chong: 'Quá mẫn với chloramphenicol; có tiền sử suy tủy xương.',
              ghiChu: 'Không chạm đầu lọ vào mắt. Vứt lọ sau 28 ngày kể từ khi mở nắp.' },
        15: { moTa: 'Thuốc xịt mũi long đờm, hoạt chất bromhexin, giúp làm loãng và tống đờm ra ngoài đường hô hấp.',
              lieu: 'Người lớn: 2 nhát xịt vào mỗi lỗ mũi 3 lần/ngày. Hoặc uống 5-10ml x 3 lần/ngày.',
              chong: 'Quá mẫn với bromhexin; quý I có thai.',
              ghiChu: 'Uống nhiều nước để tăng hiệu quả long đờm. Có thể dùng cho trẻ em theo hướng dẫn.' },
        16: { moTa: 'Viên nang chiết xuất ginkgo biloba, cải thiện tuần hoàn máu não, tăng cường trí nhớ, chống lão hóa.',
              lieu: 'Người lớn: 1 viên x 2-3 lần/ngày sau ăn.',
              chong: 'Rối loạn đông máu; phẫu thuật sắp tới; quá mẫn với ginkgo; phụ nữ có thai.',
              ghiChu: 'Hiệu quả rõ sau 4-6 tuần sử dụng đều đặn. Ngưng thuốc 3-4 ngày trước phẫu thuật.' },
        17: { moTa: 'Viên uống bổ sung glucosamine và MSM, hỗ trợ tái tạo sụn khớp, giảm đau và cứng khớp do thoái hóa.',
              lieu: 'Người lớn: 1 viên x 2 lần/ngày (sáng và tối). Uống liên tục ít nhất 2-3 tháng.',
              chong: 'Quá mẫn với glucosamine hoặc MSM; phụ nữ có thai & cho con bú.',
              ghiChu: 'Hiệu quả phụ thuộc vào mức độ thoái hóa khớp. Kết hợp vật lý trị liệu.' },
        18: { moTa: 'Viên sủi bổ sung vitamin và khoáng chất đa lượng, tăng cường sức khỏe toàn diện, giảm mệt mỏi.',
              lieu: 'Người lớn: 1 viên sủi/ngày hòa tan trong nửa cốc nước, uống sau bữa ăn sáng.',
              chong: 'Quá mẫn với thành phần; thận nặng; cường giáp; dùng đồng thời với thuốc khác có vitamin A/D.',
              ghiChu: 'Uống ngay sau khi sủi tan. Không uống lúc đói vì có thể gây buồn nôn.' },
        19: { moTa: 'Thuốc giảm đau, hạ sốt dạng sủi bọt, paracetamol 500mg dạng effervescent, hấp thu nhanh hơn viên thường.',
              lieu: 'Người lớn: 1-2 viên sủi x 2-3 lần/ngày, cách ít nhất 4 giờ. Tối đa 4g/ngày.',
              chong: 'Quá mẫn với paracetamol; suy gan nặng; nghiện rượu nặng.',
              ghiChu: 'Hòa tan hoàn toàn trong nước trước khi uống. Không dùng quá 10 ngày nếu không có chỉ định.' },
        20: { moTa: 'Hỗn dịch vi sinh vật (Bacillus clausii), điều trị rối loạn hệ vi khuẩn đường ruột, tiêu chảy do kháng sinh, táo bón.',
              lieu: 'Người lớn: 1 ống x 2-3 lần/ngày. Uống trực tiếp hoặc pha với nước, sữa, nước trái cây.',
              chong: 'Quá mẫn với Bacillus clausii; suy giảm miễn dịch; đang dùng thuốc ức chế miễn dịch.',
              ghiChu: 'Không trộn với nước quá nóng (>37°C). Uống giữa các bữa ăn.' },
        21: { moTa: 'Vitamin C tổng hợp liều cao 1000mg, bổ sung vitamin C hàng ngày, tăng cường miễn dịch, chống oxy hóa.',
              lieu: 'Người lớn: 1 viên/ngày. Uống sau bữa ăn sáng.',
              chong: 'Sỏi thận oxalat; quá mẫn với vitamin C.',
              ghiChu: 'Vitamin C dư thừa sẽ được đào thải qua nước tiểu. Màu nước tiểu vàng đậm là bình thường.' },
        22: { moTa: 'Viên nén vitamin C liều cao 1000mg, bổ sung và phòng ngừa thiếu vitamin C.',
              lieu: 'Người lớn: 1 viên/ngày, uống sau bữa ăn.',
              chong: 'Sỏi thận; quá mẫn; thalassemia.',
              ghiChu: 'Tránh uống buổi tối vì vitamin C có thể gây kích thích nhẹ. Không dùng cho trẻ dưới 12 tuổi.' },
        23: { moTa: 'Thuốc kháng sinh, điều trị nhiễm khuẩn đường hô hấp trên và dưới, viêm amidan, viêm phế quản.',
              lieu: 'Theo chỉ định bác sĩ và đơn thuốc.',
              chong: 'Quá mẫn với hoạt chất; không tự ý dùng.',
              ghiChu: 'Uống đủ liều theo đơn bác sĩ. Không dùng cho mục đích khác.' }
    };

    let updated = 0;
    for (const [maThuoc, data] of Object.entries(thuocData)) {
        const result = await pool.request()
            .input('moTa', sql.NVarChar, data.moTa)
            .input('lieu', sql.NVarChar, data.lieu)
            .input('chong', sql.NVarChar, data.chong)
            .input('ghiChu', sql.NVarChar, data.ghiChu)
            .input('id', sql.Int, parseInt(maThuoc))
            .query(`
                UPDATE Thuoc
                SET MoTa = @moTa, LieuDung = @lieu, ChongChiDinh = @chong, GhiChu = @ghiChu
                WHERE MaThuoc = @id AND MoTa IS NULL
            `);
        if (result.rowsAffected[0] > 0) {
            console.log(`   ✓ MaThuoc ${maThuoc.padStart(2)}: ${data.moTa.substring(0, 40)}...`);
            updated += result.rowsAffected[0];
        }
    }
    console.log(`   → Đã update ${updated} dòng Thuoc`);

    // ============================================================
    // 2. Backfill NhanVien SDT (nếu NULL)
    // ============================================================
    console.log('\n━━━ [2] Backfill NhanVien SDT ━━━');

    const nhanVienSdt = {
        1: '0912345678', 2: '0923456789', 3: '0934567890', 4: '0945678901',
        5: '0938771122', 6: '0938553344', 7: '0938115566', 8: '0938227788',
        9: '0938339900', 10: '0938441122', 11: '0938553344', 12: '0938660011'
    };

    let updatedNV = 0;
    for (const [maNV, sdt] of Object.entries(nhanVienSdt)) {
        const result = await pool.request()
            .input('sdt', sql.VarChar, sdt)
            .input('id', sql.Int, parseInt(maNV))
            .query(`UPDATE NhanVien SET SDT = @sdt WHERE MaNV = @id AND SDT IS NULL`);
        if (result.rowsAffected[0] > 0) {
            console.log(`   ✓ MaNV ${maNV.padStart(2)}: SDT = ${sdt}`);
            updatedNV += result.rowsAffected[0];
        }
    }
    console.log(`   → Đã update ${updatedNV} dòng NhanVien.SDT`);

    // ============================================================
    // 3. Backfill NhaCungCap DiaChi (nếu NULL)
    // ============================================================
    console.log('\n━━━ [3] Backfill NhaCungCap DiaChi ━━━');

    const nccData = {
        1: '123 Nguyễn Trãi, Quận 1, TP.HCM',
        2: '45 Lê Duẩn, Hoàn Kiếm, Hà Nội',
        3: '78 Nguyễn Văn Linh, Đà Nẵng',
        4: '56 Hoàng Quốc Việt, TP Việt Trì, Phú Thọ',
        5: '89 Đại lộ Bình Dương, Thủ Dầu Một, Bình Dương'
    };

    let updatedNCC = 0;
    for (const [maNCC, dc] of Object.entries(nccData)) {
        const result = await pool.request()
            .input('dc', sql.NVarChar, dc)
            .input('id', sql.Int, parseInt(maNCC))
            .query(`UPDATE NhaCungCap SET DiaChi = @dc WHERE MaNCC = @id AND DiaChi IS NULL`);
        if (result.rowsAffected[0] > 0) {
            console.log(`   ✓ MaNCC ${maNCC.padStart(2)}: ${dc.substring(0, 40)}...`);
            updatedNCC += result.rowsAffected[0];
        }
    }
    console.log(`   → Đã update ${updatedNCC} dòng NhaCungCap.DiaChi`);

    // ============================================================
    // 4. Backfill NhaCungCap SDT (nếu NULL hoặc 'test')
    // ============================================================
    console.log('\n━━━ [4] Backfill NhaCungCap SDT ━━━');

    const nccSdt = {
        1: '02812345678', 2: '02412345678', 3: '02361234567',
        4: '02103891234', 5: '02743678901'
    };

    let updatedSdt = 0;
    for (const [maNCC, sdt] of Object.entries(nccSdt)) {
        const result = await pool.request()
            .input('sdt', sql.VarChar, sdt)
            .input('id', sql.Int, parseInt(maNCC))
            .query(`UPDATE NhaCungCap SET SDT = @sdt WHERE MaNCC = @id AND (SDT IS NULL OR SDT = 'test')`);
        if (result.rowsAffected[0] > 0) {
            updatedSdt += result.rowsAffected[0];
        }
    }
    console.log(`   → Đã update ${updatedSdt} dòng NhaCungCap.SDT`);

    // ============================================================
    // 5. Backfill KhachHang SDT (nếu NULL)
    // ============================================================
    console.log('\n━━━ [5] Backfill KhachHang SDT ━━━');

    const khSdt = {};
    for (let i = 1; i <= 36; i++) {
        khSdt[i] = `093${String(2000 + i).padStart(4, '0')}`;
    }

    let updatedKH = 0;
    for (const [maKH, sdt] of Object.entries(khSdt)) {
        const result = await pool.request()
            .input('sdt', sql.VarChar, sdt)
            .input('id', sql.Int, parseInt(maKH))
            .query(`UPDATE KhachHang SET SDT = @sdt WHERE MaKH = @id AND SDT IS NULL`);
        if (result.rowsAffected[0] > 0) {
            updatedKH += result.rowsAffected[0];
        }
    }
    console.log(`   → Đã update ${updatedKH} dòng KhachHang.SDT`);

    // ============================================================
    // 6. Verify final
    // ============================================================
    console.log('\n━━━ [6] Verification ━━━');

    const tables = ['DanhMuc','NhaCungCap','NhanVien','TaiKhoan','Thuoc','KhachHang','PhieuNhap','LoThuoc_ChiTietNhap','HoaDon','ChiTietHoaDon','PhieuThu','PhieuChi'];
    for (const t of tables) {
        const r = await pool.request().query(`SELECT COUNT(*) as c FROM ${t}`);
        console.log(`   ${t.padEnd(22)} = ${r.recordset[0].c} dòng`);
    }

    // Check Thuoc MoTa
    const rMoTa = await pool.request().query('SELECT COUNT(*) as c FROM Thuoc WHERE MoTa IS NULL');
    console.log(`\n   Thuoc MoTa NULL: ${rMoTa.recordset[0].c} (mong đợi: 0)`);

    // Check PhieuChi count
    const rPC = await pool.request().query('SELECT COUNT(*) as c FROM PhieuChi');
    console.log(`   PhieuChi count: ${rPC.recordset[0].c} (mong đợi: ~19)`);

    await pool.close();
    console.log('\n✅ Backfill hoàn tất!');
}

backfill().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});

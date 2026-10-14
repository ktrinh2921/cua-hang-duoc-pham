/**
 * Seed HoaDon bổ sung + PhieuThu backfill
 * Chạy: node src/scripts/seed_hoadon_extra.js
 */
require('dotenv').config();
const sql = require('mssql');

async function seed() {
    const pool = await sql.connect({
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT) || 1433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'SecurePharmaDB',
        options: { encrypt: false, trustServerCertificate: true }
    });

    console.log('=== SEED HOA DON BO SUNG ===\n');

    // Kiem tra count hien tai
    const cntR = await pool.request().query('SELECT COUNT(*) as c FROM HoaDon');
    const currentCount = cntR.recordset[0].c;
    console.log(`HoaDon hien tai: ${currentCount} dong`);

    // Lay lo hop le (con ton kho)
    const loR = await pool.request().query(`
        SELECT l.MaLo, l.SoLuongTonKho, l.GiaNhap, t.GiaBanThamKhao
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE pn.TrangThai = N'DaNhap' AND l.SoLuongTonKho > 0
    `);
    const lots = loR.recordset;
    console.log(`Lo hop le: ${lots.length} lo\n`);

    // Danh sach HD moi (MaKH = NULL)
    const hoaDonMoi = [
        { ngay: '2026-06-15T09:30:00', nv: 2 },
        { ngay: '2026-06-17T10:15:00', nv: 5 },
        { ngay: '2026-06-20T14:30:00', nv: 6 },
        { ngay: '2026-07-05T11:00:00', nv: 2 },
        { ngay: '2026-07-10T15:20:00', nv: 5 },
        { ngay: '2026-07-15T16:45:00', nv: 6 },
        { ngay: '2026-07-22T09:00:00', nv: 2 },
        { ngay: '2026-07-28T14:10:00', nv: 5 },
        { ngay: '2026-08-03T10:30:00', nv: 6 },
        { ngay: '2026-08-08T13:20:00', nv: 9 },
        { ngay: '2026-08-12T11:30:00', nv: 5 },
        { ngay: '2026-08-18T15:45:00', nv: 2 },
        { ngay: '2026-08-25T16:00:00', nv: 6 },
        { ngay: '2026-08-30T10:00:00', nv: 9 },
        { ngay: '2026-09-02T09:15:00', nv: 5 },
        { ngay: '2026-09-04T10:30:00', nv: 6 },
        { ngay: '2026-09-05T14:00:00', nv: 2 },
        { ngay: '2026-09-06T11:20:00', nv: 5 },
        { ngay: '2026-09-08T16:30:00', nv: 9 },
        { ngay: '2026-09-10T09:00:00', nv: 5 },
    ];

    let inserted = 0;
    for (const hd of hoaDonMoi) {
        // Kiem tra da co chua
        const existR = await pool.request()
            .input('ngay', sql.DateTime2, new Date(hd.ngay))
            .query('SELECT MaHD FROM HoaDon WHERE NgayGioLap = @ngay');
        if (existR.recordset.length > 0) {
            console.log(`  skip  ${hd.ngay.substring(0,10)} (da co HD ${existR.recordset[0].MaHD})`);
            continue;
        }

        // Chon 2-3 lo khac nhau
        const usedLots = new Set();
        const selectedLots = [];
        for (let j = 0; j < 3; j++) {
            const idx = Math.floor(Math.random() * lots.length);
            const lot = lots[idx];
            if (usedLots.has(lot.MaLo)) continue;
            usedLots.add(lot.MaLo);
            const giaBan = Math.round((lot.GiaBanThamKhao || lot.GiaNhap * 1.4) / 1000) * 1000;
            const soLuong = Math.floor(Math.random() * 2) + 1;
            selectedLots.push({ maLo: lot.MaLo, soLuong, giaBan });
            if (selectedLots.length >= 2 + Math.floor(Math.random() * 2)) break;
        }

        if (selectedLots.length === 0) {
            console.log(`  skip  ${hd.ngay.substring(0,10)} (khong co lo hop le)`);
            continue;
        }

        const tongTien = selectedLots.reduce((s, l) => s + l.soLuong * l.giaBan, 0);

        // Insert HoaDon
        const hdR = await pool.request()
            .input('ngay', sql.DateTime2, new Date(hd.ngay))
            .input('tong', sql.Decimal(18, 2), tongTien)
            .input('nv', sql.Int, hd.nv)
            .query(`
                INSERT INTO HoaDon (NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai, MaNV, MaKH)
                OUTPUT INSERTED.MaHD
                VALUES (@ngay, @tong, 0, @tong, 0, N'DaThanhToan', @nv, NULL)
            `);
        const maHD = hdR.recordset[0].MaHD;
        inserted++;

        // Insert ChiTietHoaDon
        for (const lot of selectedLots) {
            await pool.request()
                .input('maHD', sql.Int, maHD)
                .input('maLo', sql.Int, lot.maLo)
                .input('sl', sql.Int, lot.soLuong)
                .input('gia', sql.Decimal(18, 2), lot.giaBan)
                .query(`
                    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
                    VALUES (@maHD, @maLo, @sl, @gia)
                `);
        }

        console.log(`  ok     HD ${maHD} ${hd.ngay.substring(0,10)} NV${hd.nv} ${selectedLots.length}SP ${tongTien.toLocaleString()}d`);
    }

    console.log(`\nDa insert ${inserted} HoaDon moi\n`);

    // Backfill PhieuThu
    console.log('=== BACKFILL PHIEU THU ===');
    const ptR = await pool.request().query(`
        INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD, CreatedAt)
        OUTPUT INSERTED.MaPhieuThu
        SELECT
            hd.NgayGioLap,
            hd.TongTien,
            N'BanHang',
            CONCAT(N'Thu ban hang - Hoa don #', hd.MaHD),
            hd.MaNV,
            hd.MaHD,
            COALESCE(hd.CreatedAt, hd.NgayGioLap)
        FROM HoaDon hd
        WHERE hd.TrangThai = N'DaThanhToan'
          AND NOT EXISTS (SELECT 1 FROM PhieuThu pt WHERE pt.MaHD = hd.MaHD)
    `);
    console.log(`Da insert ${ptR.rowsAffected[0]} PhieuThu moi\n`);

    // Final verify
    console.log('=== VERIFY ===');
    const tables = ['DanhMuc','NhaCungCap','NhanVien','TaiKhoan','Thuoc','KhachHang','PhieuNhap','LoThuoc_ChiTietNhap','HoaDon','ChiTietHoaDon','PhieuThu','PhieuChi'];
    for (const t of tables) {
        const r = await pool.request().query(`SELECT COUNT(*) as c FROM ${t}`);
        console.log(`  ${t.padEnd(22)} = ${r.recordset[0].c}`);
    }

    await pool.close();
    console.log('\nXong!');
}

seed().catch(err => { console.error('Loi:', err.message); process.exit(1); });

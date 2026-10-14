require('dotenv').config();
const sql = require('mssql');
(async () => {
    const p = await sql.connect({
        server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT)||1433,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME||'SecurePharmaDB',
        options: { encrypt: false, trustServerCertificate: true }
    });

    console.log('=== PHIEU NHAP ===');
    const r = await p.request().query('SELECT MaPN,TrangThai,MaNCC,MaNV FROM PhieuNhap ORDER BY MaPN');
    r.recordset.forEach(x => console.log('  PN', x.MaPN, x.TrangThai, 'NCC:', x.MaNCC, 'NV:', x.MaNV));

    console.log('\n=== LO THUOC TON KHO ===');
    const r2 = await p.request().query('SELECT COUNT(*) as c, SUM(SoLuongTonKho) as ton FROM LoThuoc_ChiTietNhap');
    console.log('  Total lô:', r2.recordset[0].c, '| Tổng tồn:', r2.recordset[0].ton);

    console.log('\n=== HOA DON ===');
    const r3 = await p.request().query('SELECT COUNT(*) as c FROM HoaDon');
    console.log('  Total HoaDon:', r3.recordset[0].c);
    const r4 = await p.request().query("SELECT COUNT(*) as c, SUM(TongTien) as tong FROM HoaDon WHERE TrangThai=N'DaThanhToan'");
    console.log('  DaThanhToan:', r4.recordset[0].c, '| Tổng tiền:', r4.recordset[0].tong);

    console.log('\n=== KHACH HANG MAKH CHECK ===');
    const r5 = await p.request().query('SELECT COUNT(*) as c FROM HoaDon WHERE MaKH IS NOT NULL');
    console.log('  HoaDon có MaKH:', r5.recordset[0].c);

    console.log('\n=== PHIẾU THU ===');
    const r6 = await p.request().query('SELECT COUNT(*) as c FROM PhieuThu');
    console.log('  Total PhieuThu:', r6.recordset[0].c);

    console.log('\n=== PHIẾU CHI ===');
    const r7 = await p.request().query('SELECT COUNT(*) as c, SUM(SoTien) as tong FROM PhieuChi');
    console.log('  Total PhieuChi:', r7.recordset[0].c, '| Tổng chi:', r7.recordset[0].tong);

    console.log('\n=== HSD CANH BAO ===');
    const r8 = await p.request().query("SELECT TOP 5 l.MaLo, t.TenThuoc, l.HanSD, DATEDIFF(DAY, GETDATE(), l.HanSD) as conNgay, l.SoLuongTonKho FROM LoThuoc_ChiTietNhap l INNER JOIN Thuoc t ON l.MaThuoc=t.MaThuoc INNER JOIN PhieuNhap pn ON l.MaPN=pn.MaPN WHERE pn.TrangThai=N'DaNhap' AND DATEDIFF(DAY, GETDATE(), l.HanSD) <= 90 ORDER BY DATEDIFF(DAY, GETDATE(), l.HanSD) ASC");
    console.log('  Lô sắp hết hạn (≤90 ngày):');
    r8.recordset.forEach(x => console.log('    MaLo', x.MaLo, ':', x.TenThuoc.substring(0,20), '| còn', x.conNgay, 'ngày | tồn:', x.SoLuongTonKho));

    await p.close();
    console.log('\n✅ Kiểm tra hoàn tất');
})();

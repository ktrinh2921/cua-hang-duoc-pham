/**
 * Seed PhieuChi bổ sung (12 dòng)
 * Chạy: node src/scripts/seed_phieu_chi.js
 */
require('dotenv').config();
const sql = require('mssql');

async function seedPhieuChi() {
    const pool = await sql.connect({
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT) || 1433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'SecurePharmaDB',
        options: { encrypt: false, trustServerCertificate: true }
    });

    console.log('🔄 Seed bổ sung PhieuChi...\n');

    // Kiểm tra đã có chưa
    const existing = await pool.request().query(
        "SELECT COUNT(*) as c FROM PhieuChi WHERE NoiDung = N'Thanh toán lương nhân viên tháng 6/2026'"
    );

    if (existing.recordset[0].c > 0) {
        console.log('   ℹ PhieuChi đã tồn tại, kiểm tra count...');
        const count = await pool.request().query('SELECT COUNT(*) as c FROM PhieuChi');
        console.log(`   PhieuChi count: ${count.recordset[0].c}`);
        await pool.close();
        return;
    }

    const items = [
        // Lương hàng tháng (Admin Hương duyệt)
        { ngay: '2026-07-05', sotien: 56800000, nd: 'Thanh toán lương nhân viên tháng 6/2026',     maNV: 1 },
        { ngay: '2026-08-05', sotien: 56800000, nd: 'Thanh toán lương nhân viên tháng 7/2026',     maNV: 1 },
        { ngay: '2026-09-05', sotien: 56800000, nd: 'Thanh toán lương nhân viên tháng 8/2026',     maNV: 1 },
        // Thanh toán NCC
        { ngay: '2026-07-15', sotien: 12500000, nd: 'Thanh toán công nợ NCC Imexpharm - lô thuốc tháng 6',   maNV: 1 },
        { ngay: '2026-08-10', sotien:  8700000, nd: 'Thanh toán công nợ NCC Hà Nội - lô thuốc tháng 7',       maNV: 12 },
        { ngay: '2026-09-02', sotien: 14800000, nd: 'Thanh toán công nợ NCC Đà Nẵng - lô thuốc tháng 8',     maNV: 1 },
        // Chi phí vận hành
        { ngay: '2026-07-20', sotien:  3500000, nd: 'Thanh toán tiền điện quý 2/2026',                            maNV: 11 },
        { ngay: '2026-07-25', sotien:  1800000, nd: 'Thanh toán tiền nước + internet tháng 7/2026',             maNV: 11 },
        { ngay: '2026-08-15', sotien:  2200000, nd: 'Mua văn phòng phẩm + túi đựng thuốc',                      maNV: 11 },
        // Khác
        { ngay: '2026-08-20', sotien:  5000000, nd: 'Thanh toán phần mềm quản lý + hosting 6 tháng',            maNV: 12 },
        { ngay: '2026-09-01', sotien:   850000, nd: 'Mua quà trung thu tặng nhân viên',                         maNV: 12 },
        { ngay: '2026-09-10', sotien:  1200000, nd: 'Sửa chữa máy tính tiền + bảo trì điều hòa',              maNV: 11 },
    ];

    for (const item of items) {
        await pool.request()
            .input('ngay', sql.DateTime2, new Date(item.ngay))
            .input('sotien', sql.Decimal(18, 2), item.sotien)
            .input('nd', sql.NVarChar, item.nd)
            .input('maNV', sql.Int, item.maNV)
            .query(`
                INSERT INTO PhieuChi (NgayLap, SoTien, NoiDung, MaNV)
                VALUES (@ngay, @sotien, @nd, @maNV)
            `);
        console.log(`   ✓ ${item.nd.substring(0, 50)}...`);
    }

    const count = await pool.request().query('SELECT COUNT(*) as c FROM PhieuChi');
    console.log(`\n   Total PhieuChi: ${count.recordset[0].c} dòng`);
    await pool.close();
    console.log('✅ Seed PhieuChi hoàn tất!');
}

seedPhieuChi().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});

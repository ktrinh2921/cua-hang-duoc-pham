// Cleanup test record (NV #13 + banhang.trang)
const db = require('../config/db');

(async () => {
    try {
        const tk = await db.query(
            `DELETE FROM TaiKhoan WHERE TenDangNhap = @username`,
            { username: 'banhang.trang' }
        );
        console.log('Deleted TaiKhoan:', tk.rowsAffected[0]);

        const nv = await db.query(
            `DELETE FROM NhanVien WHERE TenNV = @tenNV`,
            { tenNV: 'Trần Thị Hương Trang' }
        );
        console.log('Deleted NhanVien:', nv.rowsAffected[0]);

        const nvCount = await db.query(`SELECT COUNT(*) AS total FROM NhanVien`);
        const tkCount = await db.query(`SELECT COUNT(*) AS total FROM TaiKhoan`);
        console.log('Sau cleanup: NV =', nvCount.recordset[0].total, ', TK =', tkCount.recordset[0].total);
    } catch (err) {
        console.error('Cleanup error:', err.message);
    }
    process.exit(0);
})();

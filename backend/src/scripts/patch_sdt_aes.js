// Apply AES SDT patch
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const sql = require('mssql');

(async () => {
    try {
        console.log('DB_SERVER:', process.env.DB_SERVER);
        await sql.connect({
            server: process.env.DB_SERVER,
            port: parseInt(process.env.DB_PORT) || 1433,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'SecurePharmaDB',
            options: { encrypt: false, trustServerCertificate: true }
        });
        console.log('Connected. Applying ALTER statements...');
        await sql.query("ALTER TABLE NhaCungCap ALTER COLUMN SDT VARCHAR(64)");
        console.log('ALTER NhaCungCap.SDT OK');
        await sql.query("ALTER TABLE KhachHang ALTER COLUMN SDT VARCHAR(64)");
        console.log('ALTER KhachHang.SDT OK');
        await sql.query("ALTER TABLE NhanVien ALTER COLUMN SDT VARCHAR(64)");
        console.log('ALTER NhanVien.SDT OK');
        await sql.close();
        console.log('Patch applied successfully');
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
})();

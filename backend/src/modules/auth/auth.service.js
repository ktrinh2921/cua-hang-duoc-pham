/**
 * Auth Service - Business logic cho authentication
 *
 * Bảo mật:
 *  - JWT access token có `type='access'`, refresh có `type='refresh'`
 *  - 2 secret RIÊNG (JWT_SECRET vs JWT_REFRESH_SECRET)
 *  - Login fail → bcrypt verify (chậm), rate-limit ở middleware
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { validatePassword } = require('../../utils/password');

const SALT_ROUNDS = 10;

/**
 * Generate access token ngắn hạn (15 phút mặc định, dùng cho authenticate)
 */
function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: user.TenDangNhap,
            role: user.VaiTro,
            maNV: user.MaNV,
            type: 'access',
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
}

/**
 * Generate refresh token (7d, secret RIÊNG, có type='refresh')
 * Dùng để cấp access token mới khi access hết hạn.
 * TokenVersion được embed vào token để có thể revoke khi cần.
 */
function generateRefreshToken(user) {
    return jwt.sign(
        {
            sub: user.TenDangNhap,
            maNV: user.MaNV,
            version: user.TokenVersion || 1,
            type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
}

/**
 * Login service
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object} Result with success status and data
 */
async function login(username, password) {
    try {
        // Find user by username - DUNG PARAMETERIZED QUERY
        const result = await db.query(
            `SELECT tk.*, nv.TrangThai AS NhanVienTrangThai
             FROM TaiKhoan tk
             INNER JOIN NhanVien nv ON nv.MaNV = tk.MaNV
             WHERE tk.TenDangNhap = @username`,
            { username }
        );
        
        const user = result.recordset[0];
        
        if (!user) {
            return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng' };
        }
        
        // Check if account is locked
        if (user.TrangThai === 'Khoa') {
            return { success: false, message: 'Tài khoản đã bị khóa' };
        }
        if (user.NhanVienTrangThai !== 'DangLam') {
            return { success: false, message: 'Nhân viên không còn hoạt động' };
        }
        
        // Check if account is locked due to failed attempts
        if (user.LockUntil && new Date(user.LockUntil) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.LockUntil) - new Date()) / 60000);
            return { 
                success: false, 
                message: `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút` 
            };
        }
        
        // Verify password using bcrypt
        const isValidPassword = await bcrypt.compare(password, user.MatKhauHash);
        
        if (!isValidPassword) {
            // Increment failed login count
            const failCount = (user.LoginFailCount || 0) + 1;
            let lockUntil = null;
            
            // Lock account after 5 failed attempts
            if (failCount >= 5) {
                const lockTime = new Date();
                lockTime.setMinutes(lockTime.getMinutes() + 15);
                lockUntil = lockTime;
            }
            
            await db.query(
                `UPDATE TaiKhoan 
                 SET LoginFailCount = @failCount, 
                     LockUntil = @lockUntil,
                     UpdatedAt = GETDATE()
                 WHERE TenDangNhap = @username`,
                { failCount, lockUntil: lockUntil ? lockUntil.toISOString() : null, username }
            );
            
            return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng' };
        }
        
        // Reset failed login count on successful login
        await db.query(
            `UPDATE TaiKhoan 
             SET LoginFailCount = 0, 
                 LockUntil = NULL,
                 LastLogin = GETDATE(),
                 UpdatedAt = GETDATE()
             WHERE TenDangNhap = @username`,
            { username }
        );
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Get employee info
        const employeeResult = await db.query(
            'SELECT MaNV, TenNV, SDT, GioiTinh FROM NhanVien WHERE MaNV = @maNV',
            { maNV: user.MaNV }
        );
        const employee = employeeResult.recordset[0];

        return {
            success: true,
            data: {
                token: accessToken,
                refreshToken,
                user: {
                    username: user.TenDangNhap,
                    role: user.VaiTro,
                    maNV: user.MaNV,
                    mustChangePassword: Boolean(user.MustChangePassword),
                    employee: employee ? {
                        maNV: employee.MaNV,
                        tenNV: employee.TenNV,
                        sdt: employee.SDT,
                        gioiTinh: employee.GioiTinh
                    } : null
                }
            }
        };
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, message: 'Đã xảy ra lỗi khi đăng nhập' };
    }
}

/**
 * Get user info by MaNV
 * @param {number} maNV - Employee ID
 * @returns {Object} User info (camelCase để FE dùng được)
 */
async function getUserInfo(maNV) {
    try {
        const result = await db.query(
            `SELECT tk.TenDangNhap, tk.VaiTro, tk.TrangThai,
                    nv.MaNV, nv.TenNV, nv.SDT, nv.GioiTinh, nv.NgayVaoLam
             FROM TaiKhoan tk
             JOIN NhanVien nv ON tk.MaNV = nv.MaNV
             WHERE tk.MaNV = @maNV`,
            { maNV }
        );

        const row = result.recordset[0];
        if (!row) return null;

        // Map PascalCase → camelCase để khớp với shape /auth/login trả về
        // Tránh bug: FE gọi /auth/me sẽ ghi đè user object từ login bằng raw row
        return {
            username: row.TenDangNhap,
            role: row.VaiTro,
            trangThai: row.TrangThai,
            maNV: row.MaNV,
            employee: {
                maNV: row.MaNV,
                tenNV: row.TenNV,
                sdt: row.SDT,
                gioiTinh: row.GioiTinh,
                ngayVaoLam: row.NgayVaoLam,
            },
        };
    } catch (err) {
        console.error('Get user info error:', err);
        return null;
    }
}

/**
 * Change password
 * @param {string} username - Username
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Result
 */
async function changePassword(username, currentPassword, newPassword) {
    try {
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return { success: false, message: passwordError };
        }
        if (newPassword === currentPassword) {
            return { success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' };
        }

        // Get current password hash
        const result = await db.query(
            'SELECT MatKhauHash FROM TaiKhoan WHERE TenDangNhap = @username',
            { username }
        );
        
        const user = result.recordset[0];
        
        if (!user) {
            return { success: false, message: 'Không tìm thấy tài khoản' };
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.MatKhauHash);
        
        if (!isValid) {
            return { success: false, message: 'Mật khẩu hiện tại không đúng' };
        }
        
        // Hash new password
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        // Update password + tăng TokenVersion để revoke refresh token cũ
        await db.query(
            `UPDATE TaiKhoan
             SET MatKhauHash = @newHash,
                 MustChangePassword = 0,
                 TokenVersion = ISNULL(TokenVersion, 1) + 1,
                 UpdatedAt = GETDATE()
             WHERE TenDangNhap = @username`,
            { newHash, username }
        );
        
        return { success: true };
    } catch (err) {
        console.error('Change password error:', err);
        return { success: false, message: 'Đã xảy ra lỗi khi đổi mật khẩu' };
    }
}

/**
 * Refresh token
 *
 * Chỉ chấp nhận refresh token hợp lệ:
 *  - Verify với JWT_REFRESH_SECRET (KHÔNG dùng chung access secret)
 *  - Phải có claim `type='refresh'`
 *  - User còn hoạt động
 *  - TokenVersion phải khớp với DB (để revoke được khi đổi password)
 *
 * Trả về accessToken mới + refreshToken mới (rotation).
 */
async function refreshToken(refreshToken) {
    let transaction;
    let transactionStarted = false;
    try {
        // Verify với refresh secret RIÊNG + check type='refresh'
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (decoded.type !== 'refresh') {
            return { success: false, message: 'Invalid token type' };
        }

        // Khóa row trong transaction: chỉ một request được dùng mỗi refresh token.
        transaction = new db.sql.Transaction(db.getPool());
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;
        const request = new db.sql.Request(transaction);
        request.input('username', db.sql.VarChar, decoded.sub);
        const result = await request.query(`
            SELECT * FROM TaiKhoan WITH (UPDLOCK, HOLDLOCK)
            WHERE TenDangNhap = @username AND TrangThai = N'HoatDong'
        `);
        const user = result.recordset[0];
        if (!user) {
            throw Object.assign(new Error('Invalid refresh token'), { isAuthError: true });
        }

        // Validate TokenVersion để revoke token cũ khi đổi password
        const tokenVersion = decoded.version || 1;
        const currentVersion = user.TokenVersion || 1;
        if (tokenVersion !== currentVersion) {
            throw Object.assign(new Error('Token đã bị revoke hoặc đã được sử dụng'), { isAuthError: true });
        }

        // Rotation thật: tăng version trước khi cấp token mới, token cũ hết hiệu lực ngay.
        const nextVersion = currentVersion + 1;
        await new db.sql.Request(transaction)
            .input('username', db.sql.VarChar, decoded.sub)
            .input('nextVersion', db.sql.Int, nextVersion)
            .query(`
                UPDATE TaiKhoan
                SET TokenVersion = @nextVersion, UpdatedAt = GETDATE()
                WHERE TenDangNhap = @username
            `);
        await transaction.commit();
        transactionStarted = false;
        user.TokenVersion = nextVersion;

        return {
            success: true,
            data: {
                token: generateAccessToken(user),
                refreshToken: generateRefreshToken(user),
            },
        };
    } catch (err) {
        if (transactionStarted) {
            try { await transaction.rollback(); } catch (rollbackError) {
                console.error('Refresh token rollback failed:', rollbackError.message);
            }
        }
        return {
            success: false,
            message: err.isAuthError ? err.message : 'Invalid or expired refresh token',
        };
    }
}

/** Thu hồi mọi refresh token hiện tại của tài khoản. */
async function revokeRefreshTokens(username) {
    await db.query(`
        UPDATE TaiKhoan
        SET TokenVersion = ISNULL(TokenVersion, 1) + 1, UpdatedAt = GETDATE()
        WHERE TenDangNhap = @username
    `, { username });
}

module.exports = {
    login,
    getUserInfo,
    changePassword,
    refreshToken,
    generateAccessToken,
    generateRefreshToken,
    revokeRefreshTokens,
};

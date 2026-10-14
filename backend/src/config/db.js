/**
 * Database Configuration - Ket noi SQL Server
 * Su dung mssql package (Connection Pool)
 *
 * Ho tro 2 cach auth (doc tu .env):
 *  1. Windows Authentication  (DB_TRUSTED_CONNECTION=true)
 *  2. SQL Server Authentication (DB_TRUSTED_CONNECTION=false)
 *
 * Style: EAGER-CONNECT (giống mẫu hướng dẫn)
 *  - Tao ConnectionPool ngay khi require module.
 *  - poolConnect() chạy nền; cac request se doi pool san sang truoc khi query.
 *  - Loi connect KHONG lam crash process; cac helper (testConnection, getPool)
 *    se surface loi ro rang cho noi goi.
 */
require('dotenv').config();
const sql = require('mssql');

/**
 * Tao config object tu .env
 * @param {string|null} databaseName - Ten DB (null = chua chon DB cu the)
 * @returns {Object} config truyen vao sql.ConnectionPool
 */
function buildConfig(databaseName = null) {
    const config = {
        server: process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: true,
            enableArithAbort: true,
            // Database DATETIME/DATETIME2 columns use GETDATE() and therefore
            // contain Vietnam wall-clock time, not UTC. Without this option,
            // tedious treats those values as UTC and the browser adds another
            // seven hours when displaying an invoice timestamp.
            useUTC: false,
            connectionTimeout: 30000,
            requestTimeout: 30000,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };

    // Neu co ten database thi them vao
    if (databaseName) {
        config.database = databaseName;
    }

    // Neu dung Windows Auth -> khong can user/password
    if (process.env.DB_TRUSTED_CONNECTION === 'true') {
        config.options.trustedConnection = true;
    } else {
        config.user = process.env.DB_USER || 'sa';
        config.password = process.env.DB_PASSWORD;
    }

    return config;
}

// ============================================================
// EAGER-CONNECT: Tao pool + bat dau connect ngay khi require
// ============================================================
const pool = new sql.ConnectionPool(buildConfig(process.env.DB_NAME || 'SecurePharmaDB'));
const poolConnect = pool.connect();

// Background event: loi runtime cua pool (khong phai loi luc connect())
// Neu khong co handler, error se chuyen thanh unhandledRejection.
pool.on('error', (err) => {
    console.error('❌ [db] ConnectionPool error:', err.message);
});

// Log trang thai connect khi startup
poolConnect
    .then(() => {
        console.log('✅ Database connected successfully');
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err.message);
        console.error('   → Kiem tra .env: DB_SERVER, DB_NAME, DB_USER/DB_PASSWORD hoac DB_TRUSTED_CONNECTION');
    });

/**
 * Lay pool instance (cho code muon lam viec truc tiep voi pool neu can)
 * @returns {sql.ConnectionPool}
 */
function getPool() {
    return pool;
}

/**
 * Doi pool san sang (wrapper cua poolConnect, tra Promise)
 * @returns {Promise<sql.ConnectionPool>}
 */
function waitForPool() {
    return poolConnect;
}

/**
 * Execute a query with parameterized values
 * @param {string} queryString - SQL query string
 * @param {Object} params - Parameters object (key -> value)
 * @returns {Promise<sql.RecordSet>}
 */
async function query(queryString, params = {}) {
    await poolConnect; // dam bao pool da san sang truoc khi query
    const request = pool.request();

    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }

    return await request.query(queryString);
}

/**
 * Execute a stored procedure
 * @param {string} procedureName - Ten stored procedure
 * @param {Object} params - Parameters object (key -> value)
 * @returns {Promise<sql.RecordSet>}
 */
async function execute(procedureName, params = {}) {
    await poolConnect;
    const request = pool.request();

    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }

    return await request.execute(procedureName);
}

/**
 * Close the database connection pool (graceful shutdown)
 */
async function closePool() {
    try {
        if (pool.connected) {
            await pool.close();
            console.log('Database connection closed');
        }
    } catch (err) {
        console.error('❌ [db] Error while closing pool:', err.message);
    }
}

/**
 * Test connection - goi SELECT GETDATE() de xac nhan DB alive
 * @returns {Promise<boolean>}
 */
async function testConnection() {
    try {
        const result = await query('SELECT GETDATE() AS CurrentTime');
        console.log('✅ Database query test passed:', result.recordset[0].CurrentTime);
        return true;
    } catch (err) {
        console.error('❌ Database query test failed:', err.message);
        return false;
    }
}

module.exports = {
    sql,          // Export sql types (dung trong services/seed/migrate)
    pool,         // Pool instance (cho ai muon dung truc tiep)
    poolConnect,  // Promise connect (cho ai muon await)
    waitForPool,  // Wrapper cua poolConnect
    getPool,
    query,
    execute,
    closePool,
    testConnection,
    buildConfig,  // export cho migrate.js (tao pool rieng neu can)
};

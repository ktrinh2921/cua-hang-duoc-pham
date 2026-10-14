/**
 * ============================================================
 * generate_tables_sql.js
 * ============================================================
 * Generate script CREATE TABLE hoàn chỉnh từ SQL Server đang chạy.
 * Đảm bảo khớp 100% với DB thật (schema, FK, index, CHECK, default).
 *
 * Cách dùng:
 *   node src/scripts/generate_tables_sql.js
 *   node src/scripts/generate_tables_sql.js --output ../database/02_generated_tables.sql
 *   node src/scripts/generate_tables_sql.js --db SecurePharmaDB
 *
 * Output:
 *   - File .sql chứa: CREATE DATABASE + CREATE TABLE đúng thứ tự FK + IF EXISTS
 *   - Mặc định in ra console; dùng --output <path> để ghi file
 *
 * Style: EAGER-CONNECT (giống migrate.js / config/db.js)
 * ============================================================
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// ============================================================
// CLI args
// ============================================================
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
        argMap[args[i].slice(2)] = args[i + 1] || true;
        i++;
    }
}

const targetDb = argMap.db || process.env.DB_NAME || 'SecurePharmaDB';
const outputPath = argMap.output || null;
const server = process.env.DB_SERVER || 'localhost';
const port = parseInt(process.env.DB_PORT) || 1433;
const useWindowsAuth = process.env.DB_TRUSTED_CONNECTION === 'true';

// ============================================================
// Kết nối KHÔNG cần chỉ định database (vì có thể DB chưa tồn tại)
// ============================================================
const masterConfig = {
    server,
    port,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    },
};
if (!useWindowsAuth) {
    masterConfig.user = process.env.DB_USER || 'sa';
    masterConfig.password = process.env.DB_PASSWORD;
} else {
    masterConfig.options.trustedConnection = true;
}

// ============================================================
// Helpers: format kiểu dữ liệu
// ============================================================
function mapDataType(column) {
    const type = column.data_type.toLowerCase();
    const length = column.max_length;
    const precision = column.precision;
    const scale = column.scale;

    switch (type) {
        case 'nvarchar':
        case 'varchar':
        case 'char':
        case 'nchar': {
            const prefix = type.startsWith('n') ? 'NVARCHAR' : 'VARCHAR';
            if (length === -1) return `${prefix}(MAX)`;
            if (type.startsWith('n')) return `${prefix}(${length / 2})`;
            return `${prefix}(${length})`;
        }
        case 'decimal':
        case 'numeric':
            return `DECIMAL(${precision},${scale})`;
        case 'int':
            return 'INT';
        case 'bigint':
            return 'BIGINT';
        case 'smallint':
            return 'SMALLINT';
        case 'tinyint':
            return 'TINYINT';
        case 'bit':
            return 'BIT';
        case 'datetime':
            return 'DATETIME';
        case 'datetime2':
            // DATETIME2 yêu cầu precision 0-7, NULL hoặc invalid -> dùng 7
            return `DATETIME2(${scale !== null && scale !== undefined && scale >= 0 && scale <= 7 ? scale : 7})`;
        case 'date':
            return 'DATE';
        case 'time':
            return `TIME(${scale !== null && scale !== undefined && scale >= 0 && scale <= 7 ? scale : 7})`;
        case 'float':
            return precision ? `FLOAT(${precision})` : 'FLOAT';
        case 'real':
            return 'REAL';
        case 'money':
            return 'MONEY';
        case 'smallmoney':
            return 'SMALLMONEY';
        case 'text':
            return 'TEXT';
        case 'ntext':
            return 'NTEXT';
        case 'binary':
        case 'varbinary':
            return length === -1 ? 'VARBINARY(MAX)' : `VARBINARY(${length})`;
        case 'uniqueidentifier':
            return 'UNIQUEIDENTIFIER';
        case 'xml':
            return 'XML';
        default:
            return type.toUpperCase();
    }
}

function formatDefault(defaultValue, dataType) {
    if (defaultValue === null) return '';
    let trimmed = String(defaultValue).trim();

    // sys.default_constraints.definition trả về "((value))" — strip 2 lớp ngoặc ngoài
    while (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        trimmed = trimmed.slice(1, -1).trim();
    }

    if (trimmed === '') return '';

    // Nếu là số (vd 0, 1, 3.14) -> giữ nguyên
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `DEFAULT ${trimmed}`;

    // Nếu là hàm SQL (getdate(), newid(), sysutcdatetime(), ...) -> giữ nguyên
    if (/^\w+\s*\(/.test(trimmed)) return `DEFAULT ${trimmed}`;

    // Nếu đã là SQL literal (N'...' hoặc '...' không chứa ngoặc tròn đầu) -> giữ nguyên
    // Detect: bắt đầu bằng N' hoặc ', kết thúc bằng '
    if (/^N?'.*'$/i.test(trimmed)) return `DEFAULT ${trimmed}`;

    // Chuỗi thường (không có prefix N, không phải literal) -> bọc N'...', escape nháy đơn
    return `DEFAULT N'${trimmed.replace(/'/g, "''")}'`;
}

function escapeIdentifier(name) {
    return `[${String(name).replace(/]/g, ']]')}]`;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    // Connect TRỰC TIẾP vào target DB (không phải master) để OBJECT_NAME() và
    // sys.* catalogs tham chiếu đúng bảng trong SecurePharmaDB.
    const targetConfig = { ...masterConfig, database: targetDb };
    const pool = await sql.connect(targetConfig);

    try {
        console.log(`\n🔍 Đang đọc schema từ: ${server}.${targetDb}\n`);

        // 1. Nếu connect thất bại vì DB không tồn tại, fallback sang master rồi tạo DB
        const dbAlive = await pool.request().query('SELECT 1 AS ok')
            .then(() => true)
            .catch(() => false);

        if (!dbAlive) {
            console.error(`❌ Không thể kết nối vào database "${targetDb}".`);
            console.error(`   → Chạy \`npm run db:setup\` trước, hoặc đổi DB_NAME trong .env.`);
            await pool.close().catch(() => {});
            process.exit(1);
        }

        // 2. Lấy danh sách tables (bỏ qua system tables)
        const tables = await pool.request()
            .query(`
                SELECT TABLE_SCHEMA, TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
                  AND TABLE_SCHEMA = 'dbo'
                  AND TABLE_NAME NOT IN ('sysdiagrams', 'dtproperties')
                ORDER BY TABLE_NAME
            `);

        if (tables.recordset.length === 0) {
            console.error(`❌ Không tìm thấy bảng nào trong schema 'dbo' của "${targetDb}".`);
            process.exit(1);
        }

        console.log(`📋 Tìm thấy ${tables.recordset.length} bảng.\n`);

        // 3. Lấy FK relationships để sort theo thứ tự dependency
        const fkRelations = await pool.request()
            .query(`
                SELECT
                    fk.name AS FK_NAME,
                    OBJECT_NAME(fk.parent_object_id) AS ChildTable,
                    OBJECT_NAME(fk.referenced_object_id) AS ParentTable
                FROM sys.foreign_keys fk
                WHERE fk.is_disabled = 0
            `);

        // Topological sort (đơn giản: thử nhiều lần, nếu FK chưa có parent thì đặt cuối)
        const tableNames = tables.recordset.map(t => t.TABLE_NAME);
        const sorted = topologicalSort(tableNames, fkRelations.recordset);

        // 4. Build script
        const out = [];
        const today = new Date().toISOString().slice(0, 19).replace('T', ' ');

        out.push('-- ============================================================');
        out.push('-- SCRIPT GENERATED TỰ ĐỘNG - KHÔNG SỬA TAY');
        out.push(`-- Ngày tạo: ${today} UTC`);
        out.push(`-- Server:  ${server}:${port}`);
        out.push(`-- Database: ${targetDb}`);
        out.push(`-- Tool:    node src/scripts/generate_tables_sql.js`);
        out.push('-- ============================================================');
        out.push('');
        out.push('USE [master];');
        out.push('GO');
        out.push('');
        out.push(`IF DB_ID(N'${targetDb}') IS NULL`);
        out.push('BEGIN');
        out.push(`    CREATE DATABASE [${targetDb}]`);
        out.push(`    COLLATE SQL_Latin1_General_CP1_CI_AS;`);
        out.push('END');
        out.push('GO');
        out.push('');
        out.push(`USE [${targetDb}];`);
        out.push('GO');
        out.push('');

        // 5. Render từng bảng theo thứ tự dependency
        for (const tableName of sorted) {
            out.push(...(await renderTable(pool, targetDb, tableName)));
            out.push('');
        }

        // 6. Footer: thông báo + gợi ý
        out.push('-- ============================================================');
        out.push('-- HẾT. Import file này vào SQL Server Management Studio để');
        out.push('-- reproduce toàn bộ schema.');
        out.push('-- ============================================================');

        const finalSql = out.join('\n');

        // 7. Output
        if (outputPath) {
            const absPath = path.resolve(outputPath);
            fs.writeFileSync(absPath, finalSql, 'utf8');
            console.log(`✅ Đã ghi ${(finalSql.length / 1024).toFixed(1)} KB vào:`);
            console.log(`   ${absPath}\n`);
        } else {
            console.log('─'.repeat(70));
            console.log(finalSql);
            console.log('─'.repeat(70));
            console.log(`\n💡 Gợi ý: ghi ra file bằng --output <path>`);
            console.log(`   vd: node src/scripts/generate_tables_sql.js --output ../database/02_generated_tables.sql\n`);
        }

    } finally {
        await pool.close();
    }
}

// ============================================================
// Render 1 bảng: CREATE TABLE đầy đủ cột, FK inline, PK, UNIQUE, CHECK
// ============================================================
async function renderTable(pool, dbName, tableName) {
    const lines = [];
    lines.push(`-- ============================================================`);
    lines.push(`-- Table: ${tableName}`);
    lines.push(`-- ============================================================`);

    // 5.1. Cột
    const columns = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.CHARACTER_MAXIMUM_LENGTH,
                c.NUMERIC_PRECISION,
                c.NUMERIC_SCALE,
                c.COLUMN_DEFAULT,
                c.ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS c
            WHERE c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME = @table
            ORDER BY c.ORDINAL_POSITION
        `)).recordset;

    // 5.2. PK
    const pkInfo = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT kcu.COLUMN_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = @table
              AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ORDER BY kcu.ORDINAL_POSITION
        `)).recordset.map(r => r.COLUMN_NAME);

    // 5.3. UNIQUE
    const uniques = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT
                tc.CONSTRAINT_NAME,
                STRING_AGG(kcu.COLUMN_NAME, ', ') WITHIN GROUP (ORDER BY kcu.ORDINAL_POSITION) AS Cols
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            WHERE tc.TABLE_NAME = @table
              AND tc.CONSTRAINT_TYPE = 'UNIQUE'
            GROUP BY tc.CONSTRAINT_NAME
        `)).recordset;

    // 5.4. CHECK — gom theo CONSTRAINT_NAME (mỗi constraint 1 dòng, kể cả multi-column)
    const checkRows = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT
                cc.CONSTRAINT_NAME,
                cc.CHECK_CLAUSE
            FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
            JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE ccu.TABLE_NAME = @table
            GROUP BY cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
        `)).recordset;
    const checks = checkRows.filter((ck, idx, arr) =>
        arr.findIndex(x => x.CONSTRAINT_NAME === ck.CONSTRAINT_NAME) === idx
    );

    // 5.5. FK (gộp các column trong composite FK thành 1 dòng mỗi constraint)
    const fkRows = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT
                fk.name AS FK_NAME,
                STRING_AGG('[' + c1.name + ']', ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ChildCols,
                STRING_AGG('[' + c2.name + ']', ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ParentCols,
                OBJECT_NAME(fk.referenced_object_id) AS ParentTable,
                fk.delete_referential_action_desc AS OnDelete,
                fk.update_referential_action_desc AS OnUpdate
            FROM sys.foreign_keys fk
            JOIN sys.foreign_key_columns fkc
                ON fk.object_id = fkc.constraint_object_id
            JOIN sys.columns c1
                ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
            JOIN sys.columns c2
                ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
            WHERE OBJECT_NAME(fk.parent_object_id) = @table
            GROUP BY fk.name, fk.referenced_object_id,
                     fk.delete_referential_action_desc, fk.update_referential_action_desc
        `)).recordset;

    // 5.6. Index (không tính index do PK/UNIQUE tạo ra)
    const indexes = (await pool.request()
        .input('table', sql.NVarChar, tableName)
        .query(`
            SELECT
                i.name AS IndexName,
                i.is_unique,
                i.type_desc,
                STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS Cols
            FROM sys.indexes i
            JOIN sys.index_columns ic
                ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c
                ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE i.object_id = OBJECT_ID(@table)
              AND i.is_primary_key = 0
              AND i.is_unique_constraint = 0
              AND i.name IS NOT NULL
            GROUP BY i.name, i.is_unique, i.type_desc
        `)).recordset;

    // 5.7. Render CREATE TABLE
    lines.push(`IF OBJECT_ID(N'[${tableName}]', 'U') IS NOT NULL`);
    lines.push(`    DROP TABLE [${tableName}];`);
    lines.push('GO');
    lines.push('');
    lines.push(`CREATE TABLE [${tableName}] (`);

    const colDefs = columns.map(col => {
        const dataType = mapDataType({
            data_type: col.DATA_TYPE,
            max_length: col.CHARACTER_MAXIMUM_LENGTH || 0,
            precision: col.NUMERIC_PRECISION,
            scale: col.NUMERIC_SCALE,
        });
        const nullClause = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const defClause = col.COLUMN_DEFAULT ? ' ' + formatDefault(col.COLUMN_DEFAULT, col.DATA_TYPE) : '';
        return `    [${col.COLUMN_NAME}] ${dataType} ${nullClause}${defClause}`;
    }).map(line => line + ','); // append comma AFTER the data type, BEFORE the trailing newline in the join

    const constraintDefs = [];

    if (pkInfo.length > 0) {
        const pkCols = pkInfo.map(c => '[' + c + ']').join(', ');
        constraintDefs.push(`    CONSTRAINT [PK_${tableName}] PRIMARY KEY CLUSTERED (${pkCols})`);
    }

    for (const u of uniques) {
        const uCols = u.Cols.split(', ').map(c => '[' + c + ']').join(', ');
        constraintDefs.push(`    CONSTRAINT [${u.CONSTRAINT_NAME}] UNIQUE (${uCols})`);
    }

    for (const ck of checks) {
        constraintDefs.push(`    CONSTRAINT [${ck.CONSTRAINT_NAME}] CHECK ${ck.CHECK_CLAUSE}`);
    }

    for (const fk of fkRows) {
        const onDelete = fk.OnDelete && fk.OnDelete !== 'NO_ACTION' ? ` ON DELETE ${fk.OnDelete.replace(/_/g, ' ')}` : '';
        const onUpdate = fk.OnUpdate && fk.OnUpdate !== 'NO_ACTION' ? ` ON UPDATE ${fk.OnUpdate.replace(/_/g, ' ')}` : '';
        constraintDefs.push(`    CONSTRAINT [${fk.FK_NAME}] FOREIGN KEY (${fk.ChildCols}) REFERENCES [${fk.ParentTable}](${fk.ParentCols})${onDelete}${onUpdate}`);
    }

    // SQL Server: cột cuối / constraint cuối KHÔNG có dấu phẩy. Thêm ',' vào tất cả
    // rồi bỏ dấu ',' ở dòng cuối cùng.
    const wrappedConstraints = constraintDefs.map(c => c + ',');
    const finalDefs = colDefs.concat(wrappedConstraints);
    if (finalDefs.length > 0 && finalDefs[finalDefs.length - 1].endsWith(',')) {
        finalDefs[finalDefs.length - 1] = finalDefs[finalDefs.length - 1].slice(0, -1);
    }

    // CREATE TABLE phải có dấu '(' ngay sau tên bảng, KHÔNG xuống dòng riêng
    lines[lines.length - 1] = `CREATE TABLE [${tableName}] (`;
    lines.push(finalDefs.join('\n'));
    lines.push(');');
    lines.push('GO');

    // 5.8. Indexes (sau CREATE TABLE)
    for (const idx of indexes) {
        const unique = idx.is_unique ? 'UNIQUE ' : '';
        const clustered = idx.type_desc === 'CLUSTERED' ? 'CLUSTERED' : 'NONCLUSTERED';
        const cols = idx.Cols.split(', ').map(c => `[${c}]`).join(', ');
        lines.push('');
        lines.push(`CREATE ${unique}${clustered} INDEX [${idx.IndexName}] ON [${tableName}] (${cols});`);
        lines.push('GO');
    }

    return lines;
}

// ============================================================
// Topological sort: bảng không phụ thuộc đi trước
// ============================================================
function topologicalSort(tables, fkRelations) {
    const inDegree = {};
    const adj = {};

    for (const t of tables) {
        inDegree[t] = 0;
        adj[t] = [];
    }

    for (const fk of fkRelations) {
        // Lưu ý: phải dùng 'in' (kiểm tra key có tồn tại) chứ KHÔNG dùng !inDegree (vì inDegree=0 là falsy)
        if (!(fk.ChildTable in inDegree) || !(fk.ParentTable in inDegree)) continue;
        adj[fk.ParentTable].push(fk.ChildTable);
        inDegree[fk.ChildTable]++;
    }

    const queue = tables.filter(t => inDegree[t] === 0);
    const result = [];

    while (queue.length > 0) {
        const t = queue.shift();
        result.push(t);
        for (const child of adj[t]) {
            inDegree[child]--;
            if (inDegree[child] === 0) queue.push(child);
        }
    }

    // Nếu có cycle (hiếm), append các bảng còn lại
    if (result.length < tables.length) {
        for (const t of tables) {
            if (!result.includes(t)) result.push(t);
        }
    }

    return result;
}

// ============================================================
// RUN
// ============================================================
main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('\n❌ Lỗi:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
            console.error('   → SQL Server chưa bật, hoặc DB_SERVER/DB_PORT trong .env sai.');
        } else if (err.message.includes('Login failed')) {
            console.error('   → Sai DB_USER/DB_PASSWORD, hoặc cần đổi DB_TRUSTED_CONNECTION=true.');
        } else if (err.message.includes('Invalid object name')) {
            console.error('   → DB_NAME trong .env không tồn tại. Chạy `npm run db:setup` trước.');
        }
        process.exit(1);
    });

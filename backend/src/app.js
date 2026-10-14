/**
 * Express Application Setup
 *
 * Phase 1: Foundation (health check, DB connection)
 * Phase 2: Auth (login/logout/me/change-password)
 * Phase 3A-D: Danh mục, Thuốc, NCC, Khách hàng, Nhân viên
 * Phase 3E-H: Kho, Bán hàng, Tài chính, Thống kê (TODO)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { xssSanitize } = require('./middleware/xss');
const { writeLimiter } = require('./middleware/rateLimit');

const app = express();

// Security middleware
// Lưu ý: PHẢI allow tài nguyên tĩnh của swagger-ui (script/style từ unpkg.com + fonts),
// nếu không swagger UI sẽ load bị trắng trang (CSP frame-ancestors + script-src chặn inline).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:', 'https://unpkg.com'],
      'connect-src': ["'self'", 'https://unpkg.com'],
      // Cho phép nhúng vào iframe trên FE dev server (localhost)
      // 'frame-ancestors' KHÔNG có useDefaults — phải set thủ công
      'frame-ancestors': [
        "'self'",
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:4444',
        'http://127.0.0.1:4444',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Tắt X-Frame-Options mặc định của Helmet — đã có CSP frame-ancestors rồi
  frameguard: false
}));

// CORS - cho phép FE dev server
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS Protection - Deep recursive sanitize (nested objects, arrays)
app.use(xssSanitize);

// ========== Swagger UI / OpenAPI ==========
// Mount thủ công ở đây (không qua helmet chặn / tài nguyên tĩnh swagger-ui)
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// OpenAPI JSON spec — để Swagger Hub / Postman import cũng được
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SecurePharma API Docs',
  customCss: '.swagger-ui .topbar { display: none }', // ẩn thanh topbar mặc định
  swaggerOptions: {
    persistAuthorization: true, // giữ Bearer JWT sau khi "Authorize"
    displayRequestDuration: true,
    docExpansion: 'none' // gọn giao diện, click để mở rộng từng tag
  }
}));

// Redirect tiện: /docs -> /api/docs (ai gõ thiếu /api vẫn vào được)
// và /api-docs -> /api/docs (ai gõ dấu gạch ngang vẫn vào được)
app.get('/docs', (req, res) => res.redirect('/api/docs'));
app.get('/api-docs', (req, res) => res.redirect('/api/docs'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
        message: 'Server is running'
    });
});

// Welcome endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'SecurePharma API',
            version: '1.0.0',
            phase: '3H',
            description: 'Quản lý cửa hàng dược phẩm',
            endpoints: {
                health: `/api/health`,
                docs: `/api/docs`,
                openApiSpec: `/api/docs.json`
            }
        },
        message: 'Welcome to SecurePharma API'
    });
});

// Import routers
const authRouter = require('./modules/auth/auth.routes');
const danhMucRouter = require('./modules/danhMuc/danhMuc.routes');
const thuocRouter = require('./modules/thuoc/thuoc.routes');
const nhaCungCapRouter = require('./modules/nhaCungCap/nhaCungCap.routes');
const khachHangRouter = require('./modules/khachHang/khachHang.routes');
const nhanVienRouter = require('./modules/nhanVien/nhanVien.routes');
const khoRouter = require('./modules/kho/kho.routes');
const phieuNhapRouter = require('./modules/phieuNhap/phieuNhap.routes');
const banHangRouter = require('./modules/banHang/banHang.routes');
const hoaDonRouter = require('./modules/banHang/hoaDon.routes');
const phieuChiRouter = require('./modules/phieuChi/phieuChi.routes');
const phieuThuRouter = require('./modules/phieuThu/phieuThu.routes');
const thongKeRouter = require('./modules/thongKe/thongKe.routes');
const auditLogRouter = require('./modules/auditLog/auditLog.routes');
const systemConfigRouter = require('./modules/systemConfig/systemConfig.routes');

// ========== API Routes (Phase 2) ==========
app.use('/api/auth', authRouter);

// ========== API Routes (Phase 3A - Danh mục & Thuốc) ==========
app.use('/api/danh-muc', danhMucRouter);
app.use('/api/thuoc', thuocRouter);

// ========== API Routes (Phase 3B - Nhà cung cấp) ==========
app.use('/api/nha-cung-cap', nhaCungCapRouter);

// ========== API Routes (Phase 3C - Khách hàng) ==========
app.use('/api/khach-hang', khachHangRouter);

// ========== API Routes (Phase 3D - Nhân viên) ==========
app.use('/api/nhan-vien', nhanVienRouter);

// ========== API Routes (Phase 3E - Kho & Lô thuốc) ==========
app.use('/api/kho', khoRouter);
app.use('/api/phieu-nhap', phieuNhapRouter);

// ========== API Routes (Phase 3F - Bán hàng) ==========
// /api/ban-hang: action tạo hóa đơn (POST)
// /api/hoa-don: resource collection (GET, PUT /:id/huy)
app.use('/api/ban-hang', banHangRouter);
app.use('/api/hoa-don', hoaDonRouter);

// ========== API Routes (Phase 3G - Tài chính) ==========
app.use('/api/phieu-chi', phieuChiRouter);
app.use('/api/phieu-thu', phieuThuRouter);

// ========== API Routes (Phase 3H - Thống kê) ==========
app.use('/api/thong-ke', thongKeRouter);

// ========== Admin Routes ==========
app.use('/api/audit-log', auditLogRouter);
app.use('/api/system-config', systemConfigRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

/**
 * Swagger / OpenAPI Configuration
 *
 * Dùng swagger-jsdoc để auto-generate OpenAPI spec từ JSDoc trong các file route.
 * Khi cần mở rộng documentation cho một endpoint, thêm JSDoc ngay phía trên
 * `router.METHOD('/path', ...)` trong file `*.routes.js` theo cấu trúc ở
 * docs/SECURITY.md (TODO viết sau) hoặc xem ví dụ tại modules/auth/auth.routes.js.
 */
const swaggerJsdoc = require('swagger-jsdoc');
const baseComponents = require('./schemas');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SecurePharma API',
      version: '1.0.0',
      description:
        'REST API cho hệ thống quản lý cửa hàng dược phẩm SecurePharma.\n\n' +
        '**Phân quyền chính:**\n' +
        '- `Admin` — toàn quyền\n' +
        '- `NV_BanHang` — bán hàng + xem khách hàng\n' +
        '- `NV_Kho` — quản lý kho + nhập thuốc\n\n' +
        '**Auth:** Bearer JWT trong header `Authorization`. Refresh token dùng endpoint `/api/auth/refresh`.'
    },
    servers: [
      // Server mặc định hiển thị trong Swagger UI = port BE đang chạy (PORT env, mặc định 8080).
      // Giữ nguyên URL người dùng nhập — KHÔNG ép redirect về 8080/5000.
      { url: '/', description: 'Same origin (khuyến nghị — dùng URL trên thanh trình duyệt)' },
      { url: 'http://localhost:8080', description: 'Development (local, port mặc định)' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: baseComponents
    },
    tags: [
      { name: 'Auth', description: 'Đăng nhập / phiên làm việc' },
      { name: 'Bán hàng', description: 'Tạo hóa đơn bán hàng' },
      { name: 'Hóa đơn', description: 'Quản lý hóa đơn' },
      { name: 'Thuốc', description: 'Danh mục thuốc' },
      { name: 'Danh mục', description: 'Danh mục thuốc (nhóm cha)' },
      { name: 'Kho', description: 'Tồn kho, lô thuốc, điều chỉnh' },
      { name: 'Phiếu nhập', description: 'Nhập kho từ nhà cung cấp' },
      { name: 'Khách hàng', description: 'Quản lý khách hàng' },
      { name: 'Nhà cung cấp', description: 'Nhà cung cấp thuốc' },
      { name: 'Nhân viên', description: 'Quản lý nhân viên + tài khoản' },
      { name: 'Phiếu chi', description: 'Phiếu chi (tiền ra)' },
      { name: 'Phiếu thu', description: 'Phiếu thu (tiền vào)' },
      { name: 'Thống kê', description: 'Báo cáo kho / hóa đơn / tài chính' },
      { name: 'Audit Log', description: 'Nhật ký hệ thống (Admin only)' },
      { name: 'System Config', description: 'Cấu hình hệ thống (Admin only)' }
    ]
  },
  apis: [
    // Dùng glob TƯƠNG ĐỐI + option cwd. Tuyệt đối KHÔNG dùng path.join(__dirname, ...)
    // — glob v11 trên Windows không match được pattern có absolute path.
    './src/modules/**/*.routes.js'
  ]
};

// Resolve từ thư mục backend root (mặc định process.cwd() khi chạy server.js)
options.basedir = process.cwd();

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

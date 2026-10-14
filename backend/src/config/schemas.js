/**
 * OpenAPI Components Schema — định nghĩa các DTO phức tạp dùng chung
 *
 * Mục đích: tránh phải inline những object nested dài trong JSDoc của từng route.
 * Khi cần tham chiếu: $ref: '#/components/schemas/<TenSchema>'.
 */
module.exports = {
  // ========== AUTH ==========
  LoginRequest: {
    type: 'object',
    required: ['tenDangNhap', 'matKhau'],
    properties: {
      tenDangNhap: { type: 'string', example: 'admin.huong' },
      matKhau: { type: 'string', format: 'password', example: 'Admin@2026' }
    }
  },
  LoginResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT access token' },
          refreshToken: { type: 'string' },
          nhanVien: { $ref: '#/components/schemas/NhanVien' }
        }
      }
    }
  },

  // ========== NHÂN VIÊN ==========
  NhanVien: {
    type: 'object',
    properties: {
      maNV: { type: 'integer', example: 1 },
      tenNV: { type: 'string', example: 'Nguyễn Thị Hương' },
      tenDangNhap: { type: 'string', example: 'admin.huong' },
      vaiTro: { type: 'string', enum: ['Admin', 'NV_BanHang', 'NV_Kho'], example: 'Admin' },
      email: { type: 'string', format: 'email', nullable: true },
      sdt: { type: 'string', nullable: true, example: '0901234567' },
      trangThai: { type: 'string', example: 'DangLamViec' }
    }
  },

  // ========== RESPONSE WRAPPER ==========
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'object', nullable: true },
      message: { type: 'string', nullable: true }
    }
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          total: { type: 'integer', example: 42 },
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 20 }
        }
      }
    }
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Token không hợp lệ hoặc đã hết hạn' },
      code: { type: 'string', example: 'UNAUTHORIZED' }
    }
  }
};

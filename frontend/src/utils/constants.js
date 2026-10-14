/**
 * Constants used across the app
 */

// User roles (theo naming-conventions.mdc và plan mục 4.1.2)
export const ROLES = {
    ADMIN: 'Admin',
    NV_BANHANG: 'NV_BanHang',
    NV_KHO: 'NV_Kho'
};

// Label tiếng Việt hiển thị cho từng role
export const ROLE_LABELS = {
    Admin: 'Quản lý',
    NV_BanHang: 'Nhân viên bán hàng',
    NV_Kho: 'Thủ kho'
};

// Menu items - roles chứa các role được phép thấy mục đó
// Theo plan mục 8.2 (ma trận phân quyền)
export const MENU_ITEMS = [
    {
        key: 'dashboard',
        label: 'Trang chủ',
        icon: 'Home',
        path: '/dashboard',
        roles: ['Admin', 'NV_BanHang', 'NV_Kho']
    },
    {
        key: 'banhang',
        label: 'Bán thuốc',
        icon: 'ShoppingCart',
        path: '/ban-hang',
        roles: ['Admin', 'NV_BanHang']          // NV_Kho không được bán
    },
    {
        key: 'thuoc',
        label: 'Quản lý thuốc',
        icon: 'Pill',
        path: '/thuoc',
        roles: ['Admin', 'NV_BanHang', 'NV_Kho'] // Ai cũng xem được
    },
    {
        key: 'kho',
        label: 'Quản lý kho',
        icon: 'Warehouse',
        path: '/kho',
        roles: ['Admin', 'NV_Kho']               // NV_BanHang chỉ xem tồn qua thống kê
    },
    {
        key: 'khachhang',
        label: 'Khách hàng',
        icon: 'Users',
        path: '/khach-hang',
        roles: ['Admin', 'NV_BanHang']
    },
    {
        key: 'nhacungcap',
        label: 'Nhà cung cấp',
        icon: 'Truck',
        path: '/nha-cung-cap',
        roles: ['Admin', 'NV_BanHang', 'NV_Kho']
    },
    {
        key: 'nhanvien',
        label: 'Nhân viên',
        icon: 'UserCog',
        path: '/nhan-vien',
        roles: ['Admin']                         // Chỉ Admin
    },
    {
        key: 'taichinh',
        label: 'Tài chính',
        icon: 'Wallet',
        path: '/tai-chinh',
        roles: ['Admin'],                        // Chỉ Admin — phân tách trách nhiệm kế toán
        // Highlight sidebar khi vào sub-page
        activeMatch: ['/tai-chinh', '/phieu-chi', '/phieu-thu'],
    },
    {
        key: 'thongke',
        label: 'Thống kê',
        icon: 'BarChart',
        path: '/thong-ke',
        roles: ['Admin', 'NV_BanHang', 'NV_Kho']
    },
    {
        key: 'change-password',
        label: 'Đổi mật khẩu',
        icon: 'KeyRound',
        path: '/change-password',
        roles: ['Admin', 'NV_BanHang', 'NV_Kho'] // Tất cả user đều đổi được MK
    },
    {
        key: 'api-docs',
        label: 'Tài liệu API',
        icon: 'BookOpen',
        path: '/api-docs',
        roles: ['Admin']                         // Chỉ Admin — Swagger nội bộ
    },
    {
        key: 'audit-log',
        label: 'Nhật ký hệ thống',
        icon: 'ScrollText',
        path: '/audit-log',
        roles: ['Admin']
    },
    {
        key: 'system-config',
        label: 'Cấu hình',
        icon: 'Settings',
        path: '/system-config',
        roles: ['Admin']
    }
];

// Currency format
export const CURRENCY = '₫';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;

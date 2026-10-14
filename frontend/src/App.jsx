/**
 * App Router Configuration
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './router/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';

// Phase 3A
import ThuocListPage from './pages/thuoc/ThuocListPage';
import ThuocDetailPage from './pages/thuoc/ThuocDetailPage';
import DanhMucPage from './pages/thuoc/DanhMucPage';

// Phase 3B
import NhaCungCapPage from './pages/nhacungcap/NhaCungCapPage';

// Phase 3C
import KhachHangPage from './pages/khachhang/KhachHangPage';

// Phase 3D
import NhanVienPage from './pages/nhanvien/NhanVienPage';

// Phase 3E - Kho & Lô thuốc
import KhoPage from './pages/kho/KhoPage';
import TonKhoPage from './pages/kho/TonKhoPage';
import SapHetHangPage from './pages/kho/SapHetHangPage';
import SapHetHanPage from './pages/kho/SapHetHanPage';
import PhieuNhapListPage from './pages/kho/PhieuNhapListPage';
import PhieuNhapCreatePage from './pages/kho/PhieuNhapCreatePage';
import LichSuDieuChinhPage from './pages/kho/LichSuDieuChinhPage';

// Phase 3F - Bán hàng
import BanHangPage from './pages/banhang/BanHangPage';
import HoaDonListPage from './pages/banhang/HoaDonListPage';

// Phase 3G - Tài chính
import TaiChinhPage from './pages/taichinh/TaiChinhPage';
import PhieuChiListPage from './pages/taichinh/PhieuChiListPage';
import PhieuThuListPage from './pages/taichinh/PhieuThuListPage';

// Phase 3H - Thống kê
import ThongKePage from './pages/thongke/ThongKePage';

// Admin - Tài liệu API (Swagger UI)
import ApiDocsPage from './pages/admin/ApiDocsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemConfigPage from './pages/admin/SystemConfigPage';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forbidden" element={<ForbiddenPage />} />

                    <Route
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/change-password" element={<ChangePasswordPage />} />

                        {/* Phase 3A - Danh mục & Thuốc */}
                        <Route path="/thuoc" element={<ThuocListPage />} />
                        <Route path="/thuoc/:id" element={<ThuocDetailPage />} />
                        <Route path="/danh-muc" element={<DanhMucPage />} />

                        {/* Phase 3B - Nhà cung cấp */}
                        <Route
                            path="/nha-cung-cap"
                            element={
                                <ProtectedRoute roles={['Admin', 'NV_BanHang', 'NV_Kho']}>
                                    <NhaCungCapPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Phase 3C - Khách hàng */}
                        <Route path="/khach-hang" element={<KhachHangPage />} />

                        {/* Phase 3D - Nhân viên */}
                        <Route path="/nhan-vien" element={<NhanVienPage />} />

                        {/* Phase 3E - Kho & Lô thuốc */}
                        <Route path="/kho" element={<KhoPage />} />
                        <Route path="/kho/ton-kho" element={<TonKhoPage />} />
                        <Route path="/kho/sap-het-hang" element={<SapHetHangPage />} />
                        <Route path="/kho/sap-het-han" element={<SapHetHanPage />} />
                        <Route
                            path="/kho/nhap"
                            element={
                                <ProtectedRoute roles={['Admin', 'NV_Kho']}>
                                    <PhieuNhapCreatePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/kho/phieu-nhap"
                            element={
                                <ProtectedRoute roles={['Admin', 'NV_Kho']}>
                                    <PhieuNhapListPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/kho/lich-su-dieu-chinh" element={
                            <ProtectedRoute roles={['Admin', 'NV_Kho']}>
                                <LichSuDieuChinhPage />
                            </ProtectedRoute>
                        } />

                        {/* Phase 3F - Bán hàng */}
                        <Route path="/ban-hang" element={<BanHangPage />} />
                        <Route path="/hoa-don" element={<HoaDonListPage />} />

                        {/* Phase 3G - Tài chính (Admin only) */}
                        <Route path="/tai-chinh" element={
                            <ProtectedRoute roles={['Admin']}>
                                <TaiChinhPage />
                            </ProtectedRoute>
                        } />
                        {/* Redirect route cũ → trang Tài chính */}
                        <Route path="/phieu-thu" element={<Navigate to="/tai-chinh" replace />} />
                        <Route path="/phieu-chi" element={<Navigate to="/tai-chinh" replace />} />
                        <Route path="/phieu-chi/:id" element={<Navigate to="/tai-chinh" replace />} />
                        <Route path="/tai-chinh/phieu-thu" element={<Navigate to="/tai-chinh" replace />} />
                        <Route path="/tai-chinh/phieu-chi" element={<Navigate to="/tai-chinh" replace />} />

                        {/* Phase 3H - Thống kê (All roles - Admin-only tabs sẽ tự ẩn) */}
                        <Route path="/thong-ke" element={<ThongKePage />} />

                        {/* Admin - Tài liệu API (Swagger UI nhúng iframe trỏ về BE) */}
                        <Route path="/api-docs" element={<ApiDocsPage />} />

                        {/* Admin - Nhật ký hệ thống */}
                        <Route path="/audit-log" element={
                            <ProtectedRoute roles={['Admin']}>
                                <AuditLogPage />
                            </ProtectedRoute>
                        } />

                        {/* Admin - Cấu hình hệ thống */}
                        <Route path="/system-config" element={
                            <ProtectedRoute roles={['Admin']}>
                                <SystemConfigPage />
                            </ProtectedRoute>
                        } />
                    </Route>

                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

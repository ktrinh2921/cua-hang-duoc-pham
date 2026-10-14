/**
 * RoleGuard - Ẩn/hiện UI element theo role của user hiện tại
 *
 * Cách dùng:
 *   <RoleGuard roles={['Admin']}>
 *     <Button onClick={handleDelete}>Xóa nhân viên</Button>
 *   </RoleGuard>
 *
 *   <RoleGuard roles={['Admin', 'NV_BanHang']} fallback={<p>Không có quyền</p>}>
 *     <BanHangButton />
 *   </RoleGuard>
 */
import { useAuth } from '../../contexts/AuthContext';

function RoleGuard({ roles, fallback = null, children }) {
    const { hasRole, user } = useAuth();

    // Chưa đăng nhập → không hiện gì
    if (!user) return fallback;

    // Không truyền roles → mặc định hiện
    if (!roles || roles.length === 0) return children;

    // Check role
    return hasRole(roles) ? children : fallback;
}

export default RoleGuard;

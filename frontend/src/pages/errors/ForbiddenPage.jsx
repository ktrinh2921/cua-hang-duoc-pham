/**
 * ForbiddenPage (403) - User truy cập route không thuộc role
 *
 * Refactored với design system mới.
 */
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

function ForbiddenPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleBackToDashboard = () => navigate('/dashboard', { replace: true });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : 'Không xác định';

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-50 to-warning-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10" aria-hidden="true" />
          </div>

          <h1 className="text-display text-neutral-900">403</h1>
          <h2 className="text-h2 text-neutral-700 mt-2 mb-4">Không có quyền truy cập</h2>

          <p className="text-body text-neutral-600 mb-2">
            Tài khoản <span className="font-semibold">{user?.username}</span> với vai trò{' '}
            <Badge variant="danger" size="sm">{roleLabel}</Badge>
          </p>
          <p className="text-caption text-neutral-500 mb-8 max-w-md">
            Tài khoản của bạn không được phép truy cập chức năng này. Vui lòng liên hệ quản lý nếu
            bạn cần được cấp quyền.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" onClick={handleBackToDashboard} icon={<Home className="w-4 h-4" />}>
              Về trang chủ
            </Button>
            <Button variant="secondary" onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ForbiddenPage;

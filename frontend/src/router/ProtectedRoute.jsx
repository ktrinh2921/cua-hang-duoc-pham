/**
 * Protected Route - Yêu cầu đăng nhập
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, roles = null }) {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    // Still loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Not logged in
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role check
    if (roles && roles.length > 0) {
        if (!roles.includes(user.role)) {
            return <Navigate to="/forbidden" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;

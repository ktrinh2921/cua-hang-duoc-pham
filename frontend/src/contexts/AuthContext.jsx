/**
 * Auth Context - Quản lý authentication state
 */
import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Check if user is logged in on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                    setToken(storedToken);

                    // Verify token is still valid
                    try {
                        const response = await authService.me();
                        if (response.success) {
                            setUser(response.data);
                        }
                    } catch (err) {
                        // Token invalid, clear
                        logout();
                    }
                } catch (err) {
                    console.error('Auth init error:', err);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    /**
     * Login function
     * @param {string} username
     * @param {string} password
     */
    const login = async (username, password) => {
        try {
            const response = await authService.login(username, password);

            if (response.success) {
                const { token: newToken, refreshToken: newRefresh, user: userData } = response.data;

                // Save to localStorage
                localStorage.setItem('token', newToken);
                localStorage.setItem('refreshToken', newRefresh);
                localStorage.setItem('user', JSON.stringify(userData));

                setToken(newToken);
                setUser(userData);

                return { success: true };
            }
            return { success: false, message: response.error?.message || 'Đăng nhập thất bại' };
        } catch (err) {
            const errorMessage = err.response?.data?.error?.message || 'Đã xảy ra lỗi khi đăng nhập';
            return { success: false, message: errorMessage };
        }
    };

    /**
     * Logout function
     */
    const logout = async () => {
        try {
            if (token) {
                await authService.logout();
            }
        } catch (err) {
            console.error('Logout API error:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        }
    };

    /**
     * Check if user has specific role
     * @param {string|string[]} roles
     */
    const hasRole = (roles) => {
        if (!user) return false;
        if (typeof roles === 'string') {
            return user.role === roles;
        }
        return roles.includes(user.role);
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        hasRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * useAuth Hook
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;

/**
 * Auth Service - Authentication API calls
 */
import api from '../api/axiosClient';

const authService = {
    /**
     * Login
     * @param {string} username
     * @param {string} password
     */
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        return response.data;
    },

    /**
     * Logout
     */
    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    /**
     * Get current user info
     */
    me: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    /**
     * Change password
     * @param {string} currentPassword
     * @param {string} newPassword
     * @param {string} confirmPassword
     */
    changePassword: async (currentPassword, newPassword, confirmPassword) => {
        const response = await api.post('/auth/change-password', {
            currentPassword,
            newPassword,
            confirmPassword
        });
        return response.data;
    }
};

export default authService;

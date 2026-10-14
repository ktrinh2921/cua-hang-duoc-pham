/**
 * Axios Client with interceptors
 */
import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api', // Using Vite proxy
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let refreshPromise = null;

function clearSessionAndRedirect() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

async function rotateTokens() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('Missing refresh token');

    // Dùng axios gốc để request refresh không đi qua interceptor này.
    const response = await axios.post('/api/auth/refresh', { refreshToken }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
    });
    const tokens = response.data?.data;
    if (!tokens?.token || !tokens?.refreshToken) throw new Error('Invalid refresh response');
    localStorage.setItem('token', tokens.token);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens.token;
}

// Response interceptor - tự refresh một lần rồi retry request ban đầu.
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        // Handle network errors
        if (!error.response) {
            console.error('Network error:', error.message);
            return Promise.reject({
                response: {
                    status: 0,
                    data: {
                        success: false,
                        error: {
                            code: 'NETWORK_ERROR',
                            message: 'Không thể kết nối đến server'
                        }
                    }
                }
            });
        }

        const originalRequest = error.config;
        const isAuthRequest = originalRequest?.url?.includes('/auth/login')
            || originalRequest?.url?.includes('/auth/refresh');

        if (error.response.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;
            try {
                if (!refreshPromise) {
                    refreshPromise = rotateTokens().finally(() => { refreshPromise = null; });
                }
                const accessToken = await refreshPromise;
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearSessionAndRedirect();
                return Promise.reject(refreshError);
            }
        }

        if (error.response.status === 401 && !isAuthRequest) {
            clearSessionAndRedirect();
        }

        return Promise.reject(error);
    }
);

export default api;

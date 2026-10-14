/**
 * KhachHang Service
 *
 * Endpoints:
 *  GET    /api/khach-hang           - Danh sách + filter (keyword, segment, gioiTinh)
 *  GET    /api/khach-hang/stats    - Thống kê tổng quan (4 stat cards)
 *  GET    /api/khach-hang/:id      - Chi tiết + stats aggregate
 *  GET    /api/khach-hang/:id/hoa-don - Lịch sử hóa đơn (đã thanh toán)
 *  POST   /api/khach-hang          - Tạo mới
 *  PUT    /api/khach-hang/:id      - Cập nhật
 *  DELETE /api/khach-hang/:id      - Xóa
 */
import api from '../api/axiosClient';

const khachHangService = {
    /**
     * Danh sách khách hàng với filter.
     * @param {{ keyword?: string, segment?: string, gioiTinh?: string, page?: number, limit?: number }} params
     */
    getAll: async ({ keyword = '', segment = '', gioiTinh = '', page = 1, limit = 10 } = {}) => {
        const params = { page, limit };
        if (keyword) params.keyword = keyword;
        if (segment) params.segment = segment;
        if (gioiTinh) params.gioiTinh = gioiTinh;
        const response = await api.get('/khach-hang', { params });
        return response.data;
    },

    /** Thống kê tổng quan cho stat cards đầu trang */
    getStats: async () => {
        const response = await api.get('/khach-hang/stats');
        return response.data;
    },

    /** Chi tiết 1 khách hàng (kèm stats tích lũy) */
    getById: async (id) => {
        const response = await api.get(`/khach-hang/${id}`);
        return response.data;
    },

    /** Lịch sử hóa đơn đã thanh toán */
    getHoaDonByKhachHang: async (id, limit = 10) => {
        const response = await api.get(`/khach-hang/${id}/hoa-don`, {
            params: { limit },
        });
        return response.data;
    },

    /** Tạo khách hàng mới */
    create: async (data) => {
        const response = await api.post('/khach-hang', data);
        return response.data;
    },

    /** Cập nhật thông tin */
    update: async (id, data) => {
        const response = await api.put(`/khach-hang/${id}`, data);
        return response.data;
    },

    /** Xóa khách hàng */
    remove: async (id) => {
        const response = await api.delete(`/khach-hang/${id}`);
        return response.data;
    },
};

export default khachHangService;

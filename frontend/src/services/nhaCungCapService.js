/**
 * NhaCungCap Service
 *
 * Endpoints:
 *  GET    /api/nha-cung-cap           - Danh sách + filter (keyword, segment)
 *  GET    /api/nha-cung-cap/stats    - Thống kê tổng quan (4 stat cards)
 *  GET    /api/nha-cung-cap/:id      - Chi tiết + stats aggregate
 *  GET    /api/nha-cung-cap/:id/phieu-nhap - Lịch sử phiếu nhập (đã nhập)
 *  POST   /api/nha-cung-cap          - Tạo mới
 *  PUT    /api/nha-cung-cap/:id      - Cập nhật
 *  DELETE /api/nha-cung-cap/:id      - Xóa
 */
import api from '../api/axiosClient';

const nhaCungCapService = {
    /**
     * Danh sách nhà cung cấp với filter.
     * @param {{ keyword?: string, segment?: string, page?: number, limit?: number }} params
     */
    getAll: async ({ keyword = '', segment = '', page = 1, limit = 10 } = {}) => {
        const params = { page, limit };
        if (keyword) params.keyword = keyword;
        if (segment) params.segment = segment;
        const response = await api.get('/nha-cung-cap', { params });
        return response.data;
    },

    /** Thống kê tổng quan cho stat cards đầu trang */
    getStats: async () => {
        const response = await api.get('/nha-cung-cap/stats');
        return response.data;
    },

    /** Chi tiết 1 nhà cung cấp (kèm stats tích lũy) */
    getById: async (id) => {
        const response = await api.get(`/nha-cung-cap/${id}`);
        return response.data;
    },

    /** Lịch sử phiếu nhập đã nhập */
    getPhieuNhapByNCC: async (id, limit = 10) => {
        const response = await api.get(`/nha-cung-cap/${id}/phieu-nhap`, {
            params: { limit },
        });
        return response.data;
    },

    /** Tạo nhà cung cấp mới */
    create: async (data) => {
        const response = await api.post('/nha-cung-cap', data);
        return response.data;
    },

    /** Cập nhật thông tin */
    update: async (id, data) => {
        const response = await api.put(`/nha-cung-cap/${id}`, data);
        return response.data;
    },

    /** Xóa nhà cung cấp */
    remove: async (id) => {
        const response = await api.delete(`/nha-cung-cap/${id}`);
        return response.data;
    },
};

export default nhaCungCapService;

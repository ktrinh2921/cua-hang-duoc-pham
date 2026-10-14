/**
 * BanHang Service
 *
 * banHang(cart) → Tao hoa don + tru ton kho
 * getAll({keyword, page, limit, from, to}) → Danh sach hoa don
 * getById(maHD) → Chi tiet hoa don
 * cancel(maHD) → Huy hoa don
 */
import api from '../api/axiosClient';

const banHangService = {
    /**
     * Tạo hóa đơn + trừ tồn kho FIFO
     * @param {Object} data - { maKH?, tienKhachDua, items: [{ maThuoc, soLuong }] }
     */
    banHang: async (data) => {
        const response = await api.post('/ban-hang', data);
        return response.data;
    },

    /**
     * Lay danh sach hoa don
     */
    getAll: async ({ keyword = '', page = 1, limit = 10, from, to } = {}) => {
        const params = {};
        if (keyword) params.keyword = keyword;
        params.page = page;
        params.limit = limit;
        if (from) params.from = from;
        if (to) params.to = to;
        const response = await api.get('/hoa-don', { params });
        return response.data;
    },

    /**
     * Lay chi tiet hoa don
     */
    getById: async (maHD) => {
        const response = await api.get(`/hoa-don/${maHD}`);
        return response.data;
    },

    /**
     * Huy hoa don
     */
    cancel: async (maHD) => {
        const response = await api.put(`/hoa-don/${maHD}/huy`);
        return response.data;
    },
};

export default banHangService;

/**
 * Thuoc Service - Gọi API thuốc
 */
import api from '../api/axiosClient';

const thuocService = {
    /**
     * @param {Object} opts - { keyword, maDM, trangThaiTon, sort, page, limit }
     *   trangThaiTon: 'all' | 'inStock' | 'low' | 'out'
     *   sort: 'ma_desc' | 'ten_asc' | 'ten_desc' | 'gia_asc' | 'gia_desc' | 'ton_desc' | 'hsd_asc'
     */
    getAll: async ({ keyword = '', maDM = null, trangThaiTon = 'all', sort = 'ma_desc', page = 1, limit = 10 } = {}) => {
        const params = {};
        if (keyword) params.keyword = keyword;
        if (maDM) params.maDM = maDM;
        if (trangThaiTon && trangThaiTon !== 'all') params.trangThaiTon = trangThaiTon;
        if (sort && sort !== 'ma_desc') params.sort = sort;
        if (page) params.page = page;
        if (limit) params.limit = limit;

        const response = await api.get('/thuoc', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/thuoc/${id}`);
        return response.data;
    },

    /** Lấy thuốc cùng hoạt chất (sản phẩm thay thế khi thuốc nguồn hết hàng)
     * @param {number} id - MaThuoc nguồn
     * @param {Object} opts - { limit?: number = 5, inStockOnly?: boolean = true }
     */
    getSimilar: async (id, { limit = 5, inStockOnly = true } = {}) => {
        const response = await api.get(`/thuoc/${id}/similar`, {
            params: { limit, inStockOnly },
        });
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/thuoc', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/thuoc/${id}`, data);
        return response.data;
    },

    remove: async (id) => {
        const response = await api.delete(`/thuoc/${id}`);
        return response.data;
    }
};

export default thuocService;

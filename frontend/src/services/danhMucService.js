/**
 * DanhMuc Service - Gọi API danh mục thuốc
 */
import api from '../api/axiosClient';

const danhMucService = {
    getAll: async () => {
        const response = await api.get('/danh-muc');
        return response.data;
    },

    getById: async (maDM) => {
        const response = await api.get(`/danh-muc/${encodeURIComponent(maDM)}`);
        return response.data;
    },

    create: async ({ maDM, tenDM }) => {
        const response = await api.post('/danh-muc', { maDM, tenDM });
        return response.data;
    },

    update: async (maDM, { tenDM }) => {
        const response = await api.put(`/danh-muc/${encodeURIComponent(maDM)}`, { tenDM });
        return response.data;
    },

    remove: async (maDM) => {
        const response = await api.delete(`/danh-muc/${encodeURIComponent(maDM)}`);
        return response.data;
    }
};

export default danhMucService;

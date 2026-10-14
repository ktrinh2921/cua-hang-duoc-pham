/**
 * PhieuNhap Service - Quản lý phiếu nhập thuốc
 *
 *  - getAll({ keyword, page, limit })
 *  - getById(maPN)
 *  - create(data) - Tao phieu nhap + nhieu lo
 *  - cancel(maPN)  - Huy phieu nhap
 */
import api from '../api/axiosClient';

const phieuNhapService = {
    /**
     * Lay danh sach phieu nhap (co JOIN NCC, NV, COUNT lo, SUM tien)
     */
    getAll: async ({ keyword = '', page = 1, limit = 10 } = {}) => {
        const response = await api.get('/phieu-nhap', {
            params: { keyword, page, limit }
        });
        return response.data;
    },

    /**
     * Chi tiet 1 phieu nhap (kem danh sach lo)
     */
    getById: async (maPN) => {
        const response = await api.get(`/phieu-nhap/${maPN}`);
        return response.data;
    },

    /**
     * Tao phieu nhap + nhieu lo (transaction)
     * @param {Object} data
     * @param {number} data.maNCC
     * @param {Array} data.chiTiet - [{ maThuoc, soLuongNhap, ngaySX, hanSD, giaNhap }]
     */
    create: async (data) => {
        const response = await api.post('/phieu-nhap', data);
        return response.data;
    },

    /**
     * Huy phieu nhap (doi TrangThai = 'Huy')
     */
    cancel: async (maPN) => {
        const response = await api.put(`/phieu-nhap/${maPN}/huy`);
        return response.data;
    }
};

export default phieuNhapService;

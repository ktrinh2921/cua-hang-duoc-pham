/**
 * PhieuChi Service - Admin only
 *
 * getSoDu()         → { tongThu, tongChi, soDu }
 * getStats({days})  → stats cho dashboard TaiChinh: chart, top, recent
 * getAll({...})     → list phân trang
 * getById(id)       → chi tiết
 * create(payload)   → tạo phiếu chi
 */
import api from '../api/axiosClient';

const phieuChiService = {
  getSoDu: async () => {
    const res = await api.get('/phieu-chi/so-du');
    return res.data;
  },

  /**
   * Stats cho trang Tài chính.
   * @param {{ days?: number }} params - days: số ngày cho chart (1-365, default 30)
   */
  getStats: async ({ days = 30 } = {}) => {
    const res = await api.get('/phieu-chi/stats', { params: { days } });
    return res.data;
  },

  getAll: async ({ keyword = '', page = 1, limit = 10, from, to } = {}) => {
    const params = { page, limit };
    if (keyword) params.keyword = keyword;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/phieu-chi', { params });
    return res.data;
  },

  getById: async (maPhieuChi) => {
    const res = await api.get(`/phieu-chi/${maPhieuChi}`);
    return res.data;
  },

  create: async ({ soTien, noiDung }) => {
    const res = await api.post('/phieu-chi', { soTien, noiDung });
    return res.data;
  },
};

export default phieuChiService;

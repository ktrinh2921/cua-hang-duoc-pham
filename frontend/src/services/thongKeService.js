/**
 * ThongKe Service - 3 dashboard tổng hợp
 *
 * getKho()             → Tồn kho + cảnh báo (All roles)
 * getHoaDon(from, to)  → Doanh thu + top thuốc (All roles)
 * getTaiChinh(from,to) → Tổng thu/chi/lợi nhuận (Admin only)
 */
import api from '../api/axiosClient';

const thongKeService = {
  getKho: async () => {
    const res = await api.get('/thong-ke/kho');
    return res.data;
  },

  getHoaDon: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/thong-ke/hoa-don', { params });
    return res.data;
  },

  /** Danh sách hóa đơn chi tiết trong kỳ (phân trang) — dùng cho tab Thống kê */
  getHoaDonList: async ({ from, to, page = 1, limit = 20 } = {}) => {
    const params = { page, limit };
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/thong-ke/hoa-don/list', { params });
    return res.data;
  },

  getTaiChinh: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/thong-ke/tai-chinh', { params });
    return res.data;
  },
};

export default thongKeService;

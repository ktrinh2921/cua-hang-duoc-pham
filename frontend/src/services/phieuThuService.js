import api from '../api/axiosClient';

const phieuThuService = {
  getAll: async ({ keyword = '', page = 1, limit = 10, from, to, loaiPhieu } = {}) => {
    const params = { keyword, page, limit };
    if (from) params.from = from;
    if (to) params.to = to;
    if (loaiPhieu) params.loaiPhieu = loaiPhieu;
    const response = await api.get('/phieu-thu', { params });
    return response.data;
  },
  create: async ({ soTien, noiDung }) => {
    const response = await api.post('/phieu-thu', { soTien, noiDung });
    return response.data;
  },
  getById: async (maPhieuThu) => {
    const response = await api.get(`/phieu-thu/${maPhieuThu}`);
    return response.data;
  },
};

export default phieuThuService;

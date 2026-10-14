/**
 * Kho Service - Quản lý tồn kho + cảnh báo
 *
 *  - getThongKeTong(): tổng quan cho Hub Kho (tổng tồn, giá trị tồn, số thuốc, số lô)
 *  - getTonKho({ keyword, page, limit })
 *  - getSapHetHang(nguong)
 *  - getSapHetHan(days)
 *  - getLoByThuoc(maThuoc): drill-down lô FIFO + adjustments
 *  - adjustLotStock(maLo, { soLuongMoi, lyDo }): điều chỉnh tồn sau kiểm kê
 */
import api from '../api/axiosClient';

const khoService = {
    /**
     * Lấy thống kê tổng quan cho Hub Kho.
     * @returns {Promise<{data: {tongTon, giaTriTonKho, soThuocCoTon, tongSoLo}}>}
     */
    getThongKeTong: async () => {
        const response = await api.get('/kho/thong-ke-tong');
        return response.data;
    },

    /**
     * Lấy tồn kho theo thuốc (phân trang + search)
     * @param {Object} params
     * @param {string} [params.keyword] - Tìm theo tên thuốc hoặc mã thuốc
     * @param {number} [params.page=1]
     * @param {number} [params.limit=10]
     */
    getTonKho: async ({ keyword = '', page = 1, limit = 10 } = {}) => {
        const response = await api.get('/kho/ton-kho', {
            params: { keyword, page, limit }
        });
        return response.data;
    },

    /**
     * Danh sách thuốc sắp hết hàng (tồn ≤ nguong)
     * @param {number} nguong - Ngưỡng (mặc định 10)
     */
    getSapHetHang: async (nguong = 10) => {
        const response = await api.get('/kho/sap-het-hang', {
            params: { nguong }
        });
        return response.data;
    },

    /**
     * Danh sách lô thuốc sắp hết hạn (trong N ngày tới)
     * @param {number} days - Số ngày (mặc định 30)
     */
    getSapHetHan: async (days = 30) => {
        const response = await api.get('/kho/sap-het-han', {
            params: { days }
        });
        return response.data;
    },

    /**
     * Lấy danh sách lô còn hàng của 1 thuốc (FIFO: lô cũ nhất lên đầu)
     * Dùng cho trang Bán hàng — hiển thị lô/HSD khi thêm vào giỏ
     * @param {number} maThuoc
     */
    getLoByThuoc: async (maThuoc) => {
        const response = await api.get(`/kho/lo/${maThuoc}`);
        return response.data;
    },

    /**
     * Điều chỉnh tồn thực tế của một lô sau kiểm kê.
     */
    adjustLotStock: async (maLo, { soLuongMoi, lyDo }) => {
        const response = await api.patch(`/kho/lo/${maLo}/ton-kho`, {
            soLuongMoi,
            lyDo,
        });
        return response.data;
    },

    /**
     * Lịch sử điều chỉnh tồn kho (audit trail) — Admin + NV_Kho.
     * @param {Object} params
     * @param {string} [params.keyword] - tìm theo TenThuoc hoặc LyDo
     * @param {string|number} [params.maNV] - filter theo nhân viên thực hiện
     * @param {string} [params.from] - yyyy-mm-dd
     * @param {string} [params.to] - yyyy-mm-dd
     * @param {number} [params.page=1]
     * @param {number} [params.limit=10]
     */
    getDieuChinhList: async ({
        keyword = '',
        maNV = '',
        from = '',
        to = '',
        page = 1,
        limit = 10,
    } = {}) => {
        const response = await api.get('/kho/dieu-chinh', {
            params: { keyword, maNV, from, to, page, limit },
        });
        return response.data;
    }
};

export default khoService;

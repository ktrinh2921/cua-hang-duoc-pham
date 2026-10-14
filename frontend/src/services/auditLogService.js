/**
 * AuditLog Service — API wrapper cho /api/audit-log
 */
import api from '../api/axiosClient';

export default {
    /**
     * Lay danh sach audit log
     * @param {Object} params - filter params
     */
    getAuditLogs(params = {}) {
        return api.get('/audit-log', { params });
    },

    /** Thong ke tong quan (7 ngay) */
    getStats() {
        return api.get('/audit-log/stats');
    },

    /** Danh sach action types */
    getActionTypes() {
        return api.get('/audit-log/actions');
    },

    /** Danh sach bang duoc ghi */
    getTableNames() {
        return api.get('/audit-log/tables');
    },

    /** Chi tiet 1 ban ghi */
    getById(id) {
        return api.get(`/audit-log/${id}`);
    },
};

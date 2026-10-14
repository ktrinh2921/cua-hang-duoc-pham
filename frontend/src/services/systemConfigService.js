/**
 * SystemConfig Service — API wrapper cho /api/system-config
 */
import api from '../api/axiosClient';

export default {
    /** Lay tat ca cau hinh */
    getAll() {
        return api.get('/system-config');
    },

    /** Lay 1 cau hinh theo key */
    getByKey(key) {
        return api.get(`/system-config/${key}`);
    },

    /** Cap nhat 1 cau hinh */
    set(key, value) {
        return api.put(`/system-config/${key}`, { value });
    },

    /** Cap nhat nhieu cau hinh cung luc */
    setMany(configs) {
        return api.put('/system-config', { configs });
    },

    /** Xoa 1 cau hinh */
    remove(key) {
        return api.delete(`/system-config/${key}`);
    },
};

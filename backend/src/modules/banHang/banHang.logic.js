function domainError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function normalizeCart(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw domainError('Giỏ hàng trống');
    }

    const quantities = new Map();
    for (const item of items) {
        const maThuoc = Number(item.maThuoc);
        const soLuong = Number(item.soLuong);
        if (!Number.isInteger(maThuoc) || maThuoc <= 0) {
            throw domainError('Mã thuốc không hợp lệ');
        }
        if (!Number.isInteger(soLuong) || soLuong <= 0) {
            throw domainError(`Số lượng bán của thuốc #${maThuoc} phải là số nguyên > 0`);
        }
        quantities.set(maThuoc, (quantities.get(maThuoc) || 0) + soLuong);
    }

    return Array.from(quantities, ([maThuoc, soLuong]) => ({ maThuoc, soLuong }));
}

function calculateInvoiceTotals(cartDetail, discountInput = 0, cashInput = 0) {
    const tamTinh = cartDetail.reduce(
        (sum, item) => sum + Number(item.soLuong) * Number(item.giaBan),
        0
    );
    const giamGia = Number(discountInput) || 0;
    const tienKhachDua = Number(cashInput) || 0;

    if (!Number.isFinite(giamGia) || giamGia < 0) {
        throw domainError('Giảm giá phải là số không âm');
    }
    if (giamGia > tamTinh) {
        throw domainError('Giảm giá không được vượt quá tạm tính');
    }

    const tongTien = tamTinh - giamGia;
    if (!Number.isFinite(tienKhachDua) || tienKhachDua < tongTien) {
        throw domainError(
            `Tiền khách đưa (${tienKhachDua.toLocaleString('vi-VN')}đ) không đủ. Cần ít nhất ${tongTien.toLocaleString('vi-VN')}đ`
        );
    }

    return {
        tamTinh,
        giamGia,
        tongTien,
        tienKhachDua,
        tienTraLai: tienKhachDua - tongTien,
    };
}

module.exports = { normalizeCart, calculateInvoiceTotals };


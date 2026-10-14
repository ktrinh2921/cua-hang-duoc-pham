/**
 * Pagination helpers - Chuẩn hóa cách validate page/limit cho TẤT CẢ service.
 *
 * Ưu tiên an toàn:
 *  - Reject nếu input không phải integer (không phải NaN-fallback-thành-1)
 *  - Clamp vào range [1, 100]
 *
 * Sử dụng:
 *   const { page, limit, offset } = parsePagination(req.query);
 */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Parse + validate page/limit từ input bất kỳ (string | number)
 *
 * @param {*} rawPage - input từ FE (req.query.page)
 * @param {*} rawLimit - input từ FE (req.query.limit)
 * @returns {{ page: number, limit: number, offset: number }}
 * @throws Error nếu input invalid (NaN, < 1, > MAX)
 */
function parsePagination(rawPage, rawLimit) {
    // parseInt trả NaN với input invalid (string 'abc', object, ...) → throw
    const pageNum = Number(rawPage);
    const limitNum = Number(rawLimit);

    if (!Number.isFinite(pageNum) || pageNum < 1) {
        const err = new Error(`Invalid page: ${rawPage}`);
        err.statusCode = 400;
        throw err;
    }

    // Limit: nếu không truyền → default; nếu truyền invalid → throw
    let limit;
    if (rawLimit === undefined || rawLimit === '' || rawLimit === null) {
        limit = DEFAULT_PAGE_SIZE;
    } else if (!Number.isFinite(limitNum) || limitNum < 1) {
        const err = new Error(`Invalid limit: ${rawLimit}`);
        err.statusCode = 400;
        throw err;
    } else {
        limit = Math.min(MAX_PAGE_SIZE, Math.floor(limitNum));
    }

    const page = Math.floor(pageNum);
    return { page, limit, offset: (page - 1) * limit };
}

module.exports = {
    parsePagination,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
};

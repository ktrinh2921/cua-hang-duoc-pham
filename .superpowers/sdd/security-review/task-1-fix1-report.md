# Task 1 — Fix Round 1 Report

## Status: **DONE**

## Summary

Resolved the Minor inconsistency found by the security reviewer:
`PUT /api/phieu-nhap/:id/huy` (cancel phiếu nhập) was missing the
`writeLimiter` middleware that every other write route in the module
(and the analogous `hoaDon.routes.js`) already enforces.

## Commit

- `521bd18` — `security(task-1): add writeLimiter to PUT /api/phieu-nhap/:id/huy`
  - File: `backend/src/modules/phieuNhap/phieuNhap.routes.js`
  - Change: 1 file, +1 / −1
  ```diff
  - router.put('/:id/huy', ctrl.cancel);
  + router.put('/:id/huy', writeLimiter, ctrl.cancel);
  ```

## Files Changed

- `backend/src/modules/phieuNhap/phieuNhap.routes.js`
  - `writeLimiter` was already imported (used on `POST /`) — no new
    import needed.
  - Added `writeLimiter` to `PUT /:id/huy` **before** the route handler,
    matching the pattern in `banHang/hoaDon.routes.js`.

## Verification

| Step | Expected | Actual |
|---|---|---|
| Backend starts | DB connected, listens on 8080 | `✅ Database connected successfully` (port 8080 reachable) |
| Login as Admin (`admin.huong / Admin@2026`) | 200 + JWT | `200` ✅ |
| `GET /api/phieu-nhap?page=1&pageSize=5` (baseline) | 200 | `200` ✅ |
| `PUT /api/phieu-nhap/1/huy` (1st attempt) | 200 or 409 | `409 INTERNAL_ERROR — Phiếu nhập đã bị hủy trước đó` ✅ (existing behavior preserved) |
| `GET /api/phieu-nhap` after cancel | 200 | `200` ✅ |
| 35 rapid `PUT /api/phieu-nhap/1/huy` (writeLimiter = 30/15min) | ≥1 × `429` | `29 × 4xx` + `6 × 429` ✅ — rate limit triggered correctly |
| `GET /api/phieu-nhap` after burst | 200 | `200` ✅ |
| `GET /api/phieu-nhap/1` after burst | 200 | `200` ✅ |

### Node syntax check

```
$ node -c backend/src/modules/phieuNhap/phieuNhap.routes.js
SYNTAX_OK
```

## Notes for the Reviewer

- `writeLimiter` is `30 requests / 15 minutes / IP`, shared across all
  write endpoints of the **process** (in-memory store). It is not per
  route, so the same 30-quota also covers `POST /api/phieu-nhap` and
  every other write — by design, same as the other modules.
- The `requireRole('Admin', 'NV_Kho')` middleware is applied
  `router.use(...)`-wide (not per-route) — preserved as-is. The fix
  only inserts `writeLimiter` between the router matching and the
  handler, matching `hoaDon.routes.js` style.
- The 6 × 429 in the burst test is the lower bound; depending on how
  the `skipSuccessfulRequests: false` flag counts the 29 business-error
  409s as "requests", the limiter may trigger as early as the 31st
  call. Either behavior is consistent with the documented config.

## No Further Action Required

This closes the only Minor finding from the Task-1 review. Re-run the
review checklist to confirm the change is in place:

```bash
grep -n "writeLimiter" backend/src/modules/phieuNhap/phieuNhap.routes.js
# 5: const { writeLimiter } = require('../../middleware/rateLimit');
# 21: router.post('/', writeLimiter, ctrl.create);
# 22: router.put('/:id/huy', writeLimiter, ctrl.cancel);
```

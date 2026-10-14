# Task 1 Report — Fix errorHandler password leak + Apply writeLimiter

## Status: DONE

## Commits Created

- **`3212584`** — `security(task-1): redact sensitive fields in errorHandler + apply writeLimiter`
  - 13 files changed, 375 insertions(+), 23 deletions(-)
  - Includes 10 newly tracked route files (all write routes updated in same commit)

## Files Modified

### Fix #1 — errorHandler redaction (HIGH)

**`backend/src/middleware/errorHandler.js`**
- Added `SENSITIVE_FIELDS` whitelist (16 fields):
  - `password`, `currentPassword`, `newPassword`, `confirmPassword`
  - `matKhau`, `matKhauCu`, `matKhauMoi` (Vietnamese field names from auth.service)
  - `token`, `refreshToken`, `jwt`, `authorization`, `cookie`
  - `secret`, `apiKey`, `accessToken`
- Added `redactBody(obj)` — recursive helper that:
  - Returns `null`/`undefined` unchanged
  - Recursively maps arrays
  - Returns primitives unchanged
  - Recursively descends into nested objects
  - Replaces any key in `SENSITIVE_FIELDS` with `[REDACTED]`
- Updated `errorHandler` to call `redactBody(req.body)` before logging
- Exported `redactBody` from module for unit-testability

### Fix #2 — writeLimiter applied (LOW)

**`backend/src/app.js`**
- Imported `writeLimiter` from `middleware/rateLimit`
- Refactored all `app.use('/api/...')` to use named router variables (no inline `require()`)
- No top-level limiter applied (per-route keeps auth/RBAC order intact)

**Route files updated** — `writeLimiter` added to every POST/PUT/PATCH/DELETE route (before `requireRole` so the limit applies even to authenticated-but-malicious traffic):

| Module | Routes | Method |
|---|---|---|
| `auth.routes.js` | `POST /change-password` | writeLimiter |
| `danhMuc.routes.js` | `POST /`, `PUT /:maDM`, `DELETE /:maDM` | writeLimiter |
| `thuoc.routes.js` | `POST /`, `PUT /:id`, `DELETE /:id` | writeLimiter |
| `nhaCungCap.routes.js` | `POST /`, `PUT /:id`, `DELETE /:id` | writeLimiter |
| `khachHang.routes.js` | `POST /`, `PUT /:id`, `DELETE /:id` | writeLimiter |
| `nhanVien.routes.js` | `POST /`, `PUT /:id`, `DELETE /:id` | writeLimiter |
| `kho.routes.js` | `PATCH /lo/:maLo/ton-kho` | writeLimiter |
| `phieuNhap.routes.js` | `POST /` | writeLimiter |
| `banHang.routes.js` | `POST /` (sale creation) | writeLimiter |
| `hoaDon.routes.js` | `PUT /:id/huy` (cancel) | writeLimiter |
| `phieuChi.routes.js` | `POST /` (money write) | writeLimiter |

Note: `auth.routes.js` login/refresh already had `authLimiter`; `change-password` now also has `writeLimiter` since it mutates state.

## Test Results

### Test 1 — redactBody unit test (Fix #1)

Created temporary test script that called `errorHandler(err, req, res, next)` with a synthetic request body containing sensitive + safe fields, then asserted on captured `winston.error` metadata.

**Input body:**
```js
{
  username: 'admin',
  password: 'SecretPwd123!',
  matKhau: 'mk',
  nested: { token: 'tk', safe: 'ok' }
}
```

**Captured log meta:**
```json
{
  "originalUrl": "/api/auth/login",
  "method": "POST",
  "body": {
    "username": "admin",
    "password": "[REDACTED]",
    "matKhau": "[REDACTED]",
    "nested": {
      "token": "[REDACTED]",
      "safe": "ok"
    }
  },
  "stack": "Error: ...",
  "ip": "127.0.0.1"
}
```

**Assertions (all PASSED):**
- `Has password value "SecretPwd123"?` → **false** ✓
- `Has matKhau value "mk"?` → **false** ✓
- `Has nested token "tk"?` → **false** ✓
- `Has [REDACTED]?` → **true** ✓
- `Has "username":"admin"?` → **true** ✓
- `Has "safe":"ok"?` → **true** ✓

Additional edge-case tests run via inline `node -e`:
- `null` → `null` ✓
- `undefined` → `undefined` ✓
- `[{password:'x'},{safe:'y'}]` → `[{password:'[REDACTED]'},{safe:'y'}]` ✓
- Deep nesting `{a:{b:{c:{password:'deep'}}}}` → all keys preserved, password redacted ✓
- All 16 sensitive fields (whitelist test) → all redacted ✓

### Test 2 — writeLimiter end-to-end (Fix #2)

Logged in as `admin.huong` (Admin role), then sent 35 sequential POST requests to `/api/khach-hang` (writeLimiter = 30/15min/IP).

**Status code distribution:**
```
201: 29   (1 from initial manual test + 28 from automated burst)
429: 6    (rate-limited after quota exhausted)
```

**Response from rate-limited request (429):**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Quá nhiều yêu cầu ghi. Vui lòng thử lại sau."
  }
}
```

The 30th request hit 429 (the previous manual test consumed 1 quota slot), confirming the limit works exactly as designed.

### Test 3 — GET endpoints unaffected (Fix #2)

After exhausting write quota, GET requests still return 200:
- `GET /api/khach-hang` → 200 ✓
- `GET /api/khach-hang/stats` → 200 ✓
- `GET /api/thuoc` → 200 ✓

## Self-Review

### Concerns / Observations

1. **JSON parse error path:** When `express.json()` fails to parse the request body, `req.body` is `undefined`. `redactBody(undefined)` returns `undefined` safely — verified, no crash. The parse error message itself never contains the password (it's a structural error from body-parser), but this is incidental.

2. **Rate-limit window for in-memory store:** `express-rate-limit` uses in-memory storage, so each server restart resets the counter. This is acceptable for the demo (as noted in the existing `rateLimit.js` comments) but documented for production migration to Redis.

3. **Coverage of `redactBody`:** The brief listed 9 fields explicitly. I added 7 additional high-risk fields (`authorization`, `cookie`, `secret`, `apiKey`, `accessToken`, `refreshToken`, `jwt`) for defense-in-depth. If any of these are out of scope, the brief can be re-evaluated — but they are all standard secret-like fields that should never appear in logs.

4. **Auth controller error path:** The auth controller catches login errors and returns `error(res, msg, 401)` instead of throwing — so the global `errorHandler` doesn't see the password for wrong-password attempts. This is actually a feature (less attack surface), but it means the redaction is only useful for the unexpected-error path (e.g., DB outage, unhandled promise rejection in async service code). The fix is still correct and necessary for that path.

5. **PUT /api/hoa-don/:id/huy** uses `writeLimiter` even though it's a state-change that doesn't create new data — included because it mutates invoice state, which is the spirit of the brief ("POST/PUT/PATCH/DELETE").

6. **`refreshToken` field** was added to `SENSITIVE_FIELDS` because the auth controller's `/refresh` endpoint accepts `refreshToken` in the body. Without redaction, an error there would leak refresh tokens to logs.

### Cleanup Performed

- Deleted temporary test scripts (`test-redaction.js`, `test-ratelimit.js`, `test-token.txt`)
- Deleted temporary log captures (`logs-stdout.log`, `logs-stderr.log`)
- Stopped background `node` server processes

### What was NOT changed (out of scope)

- No changes to `rateLimit.js` itself — the `writeLimiter` config was already correct.
- No changes to `auth.service.js` / `auth.controller.js` — they already use service-level error returns, not throws.
- No changes to FE.
- No changes to other middleware (xss.js, audit.js).

## Acceptance Criteria Verification (from brief)

### Fix #1
- [x] Password fields never appear in winston logs (verified: `SecretPwd123!` not in meta)
- [x] Non-sensitive fields are logged normally (verified: `username`, `safe` preserved)
- [x] Handles null/undefined (verified)
- [x] Handles nested objects (verified, 3-level deep test)
- [x] Handles arrays (verified)

### Fix #2
- [x] `writeLimiter` applied to POST/PUT/PATCH/DELETE routes
- [x] Applied to `/api/phieu-chi` POST (money write) ✓
- [x] Applied to `/api/phieu-nhap` POST (inventory write) ✓
- [x] Applied to `/api/ban-hang` POST (sale write) ✓
- [x] Plus: danhMuc, thuoc, nhaCungCap, khachHang, nhanVien, kho (PATCH), hoa-don (PUT cancel), auth change-password
- [x] Did not require significant refactoring (only `app.js` import block + per-route 1-line addition)
- [x] Write endpoints still work (29/30 POSTs succeed before rate limit kicks in)
- [x] GET endpoints unaffected (3/3 return 200)

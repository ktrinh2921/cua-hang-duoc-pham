# Task Brief: Fix errorHandler password leak + Add writeLimiter to routes

## Task Description

Fix TWO independent security issues in the SecurePharma backend.

---

### Fix #1: errorHandler redact password from logs (HIGH)

**File:** `backend/src/middleware/errorHandler.js`

**Problem:** The error handler logs `req.body` without redacting sensitive fields. When an error occurs on `/api/auth/login` or `/api/auth/change-password`, the password or new password ends up in the winston log file.

**Current code (line ~29):**
```javascript
winston.error(`${err.name}: ${err.message}`, {
    originalUrl: req.originalUrl,
    method: req.method,
    body: req.body,  // ← password can be here
    stack: err.stack,
    ip: req.ip
});
```

**Required fix:** Before logging `req.body`, redact these sensitive fields:
- `password`
- `currentPassword`
- `newPassword`
- `confirmPassword`
- `matKhau`, `matKhauCu`, `matKhauMoi`
- `token`, `refreshToken`, `jwt`

Create a `redactBody(obj)` function that returns a copy of the object with sensitive fields replaced by `[REDACTED]`.

**Acceptance criteria:**
- Password fields never appear in winston logs
- Non-sensitive fields are logged normally
- The redaction function handles null/undefined, nested objects, and arrays

---

### Fix #2: Apply writeLimiter to write operations (LOW)

**File:** `backend/src/app.js`

**Problem:** `writeLimiter` (30 requests / 15min / IP) is defined in `middleware/rateLimit.js` but never applied to any route.

**Required fix:** Apply `writeLimiter` to POST/PUT/PATCH/DELETE routes. Since all write routes go through `app.js` router mounting, the easiest approach is to apply it to the router level for routes that handle writes, or apply it selectively to specific high-write endpoints.

Consider applying to:
- `/api/phieu-chi` POST (money write)
- `/api/phieu-nhap` POST (inventory write)
- `/api/ban-hang` POST (sale write)

Note: This is LOW priority. Only implement if it doesn't require significant refactoring.

---

## Context

- Working directory: `d:\LibraryCode\SecurePharma`
- Backend: Node.js + Express
- Tests: Run backend and use curl to verify:
  1. Trigger an error on login → check logs don't contain password
  2. Verify write endpoints still work after adding rate limiter

## Report File

Write your full report to: `d:\LibraryCode\SecurePharma\.superpowers\sdd\security-review\task-1-report.md`

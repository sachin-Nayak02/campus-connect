# Security Architecture Document
## CampusConnect

---

## 1. Security Principles

1. **Defense in depth** — no single control is relied on alone.
2. **Least privilege** — students and admins get only the permissions their role needs.
3. **Fail securely** — errors never leak stack traces, DB errors, or internal paths to the client.
4. **Whitelist over blacklist** — registration itself is gated by an admin-approved roll number list, which is the platform's core access-control mechanism.

---

## 2. Authentication Security

| Control | Implementation |
|---|---|
| Password storage | `bcrypt` with a work factor of 10–12 — never store plaintext or use reversible encryption |
| Session tokens | JWT **access token** (short-lived, 15 min) + **refresh token** (7 days, stored as httpOnly, Secure, SameSite=Strict cookie) |
| Token rotation | Refresh token rotated on each use; old one invalidated (detect reuse = possible theft → revoke all sessions) |
| Brute-force protection | Rate limit `/auth/login` (e.g. 5 attempts / 15 min per IP+account) via `express-rate-limit` + Redis store |
| Admin login | Separate, more tightly rate-limited login path; consider requiring 2FA for the admin account |
| Roll-number gate | Signup blocked entirely unless the submitted roll number exists in `allowed_roll_numbers` and `is_used = false` — prevents unauthorized sign-ups even if someone guesses the form URL |

---

## 3. OTP Security

- 6-digit numeric OTP, generated with a cryptographically secure random generator (not `Math.random()`).
- Stored **hashed** in `otp_verifications` (not plaintext) with an `expires_at` (5–10 min) and `is_used` flag.
- Rate-limited: max 3 OTP requests per email per hour; max 5 verification attempts per OTP before it's invalidated.
- OTP is single-use — immediately marked `is_used = true` on successful verification.
- Delivered only over the college email address on file — never SMS unless a verified phone flow is added later.

---

## 4. Authorization & Access Control

- **Role-Based Access Control (RBAC):** `student` and `admin` roles enforced in a dedicated `role.middleware.js`, checked on every protected route — never trust a role claim without re-validating against the DB-backed JWT payload.
- **Resource-level checks:** e.g. only the post's author (or an admin) can delete/edit a post; only chat/group members can read that chat's messages — enforced in the service layer, not just the UI.
- **Admin routes** (`/admin/*`) are behind both JWT auth **and** the admin role check; consider IP allow-listing for the admin panel in production.

---

## 5. Input Validation & Injection Prevention

- All request bodies validated with **Joi/Zod schemas** at the route boundary — reject unknown/malformed fields before they reach business logic.
- **Parameterized queries only** — using an ORM (Prisma/Sequelize) inherently avoids raw string-concatenated SQL, preventing SQL injection.
- **Output encoding / React's default escaping** protects against stored XSS from post text and chat messages; additionally sanitize any user HTML input server-side (e.g. `DOMPurify` if rich text is ever allowed).
- **CSRF protection:** since JWT is sent via httpOnly cookie for refresh tokens, use `SameSite=Strict` + a CSRF token (`csurf` or double-submit cookie pattern) for state-changing requests.

---

## 6. File Upload Security

| Risk | Mitigation |
|---|---|
| Malicious file disguised as image/video | Validate MIME type **and** magic bytes server-side (not just file extension) |
| Oversized uploads / DoS | Enforce size limits at Nginx, Multer, and Cloudinary/S3 policy level (images ≤5MB, video ≤50MB & ≤30s) |
| Video duration bypass | Server-side duration check via `ffprobe`/Cloudinary metadata — never trust client-reported duration |
| Direct file execution | Uploaded files stored in Cloudinary/S3 (never in the app's own executable directory); served from a separate domain/CDN with no script execution context |
| EXIF/geolocation leakage | Strip EXIF metadata from uploaded images before storage |

---

## 7. Transport & Infrastructure Security

- **HTTPS everywhere** (TLS 1.2+), HTTP → HTTPS redirect at Nginx.
- **HSTS** header enabled.
- Security headers via `helmet` middleware: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`.
- **CORS** restricted to the known frontend origin only — no wildcard `*` in production.
- Database not publicly exposed — accessible only from the backend's private network/VPC; managed PostgreSQL with SSL-required connections.
- Environment secrets (`DB_URL`, `JWT_SECRET`, `CLOUDINARY_KEY`, `SMTP creds`) kept in environment variables / a secrets manager — never committed to source control.

---

## 8. Real-Time (Socket.io) Security

- Socket connections authenticated with the JWT at handshake (`socket.handshake.auth.token`) — unauthenticated sockets are rejected.
- A user can only `join` rooms (`chat:<id>`) they are verified members of — checked server-side against `group_members`/`chats` before allowing the join.
- Rate-limit message sends per socket to prevent chat spam/flooding.

---

## 9. Data Privacy & Retention

- Profile and post data visible only to authenticated, whitelisted college users — no public/anonymous read access.
- On admin-initiated user deletion: cascade-delete or anonymize associated posts/comments/messages per the policy decided in the PRD, inside a DB transaction so partial deletions can't leave orphaned data.
- Regular automated backups of PostgreSQL with encryption at rest.
- Audit log (recommended addition): record admin actions (roll number added, user deleted, account suspended) with timestamp + admin id, for accountability.

---

## 10. Logging & Monitoring

- Centralized error logging (e.g. Winston + a log aggregator) — logs exclude passwords, tokens, and OTPs.
- Failed login/OTP attempts logged and alertable if a threshold is exceeded (possible credential-stuffing attempt).
- Uptime/health-check endpoint (`/health`) for monitoring.

---

## 11. Security Checklist Summary

- [x] Passwords hashed with bcrypt
- [x] JWT access + refresh token with rotation
- [x] Rate limiting on auth & OTP endpoints
- [x] Roll-number whitelist gate on signup
- [x] RBAC middleware on every protected/admin route
- [x] Input validation (Joi/Zod) on all endpoints
- [x] Parameterized queries via ORM
- [x] File type/size/duration validated server-side
- [x] HTTPS, HSTS, helmet security headers
- [x] CORS locked to known origin
- [x] Socket.io handshake authentication
- [x] Secrets in environment variables, not source control

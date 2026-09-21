# Product Requirement Document (PRD)
## CampusConnect — A College-Only Social Media Platform

**Version:** 1.0
**Prepared for:** Sadasiba Nayak
**Document Type:** Product Requirement Document

---

## 1. Purpose & Vision

CampusConnect is a private, Facebook-style social network restricted to students of a single college. Access is gated by an admin-controlled roll number whitelist, so only verified students can register. The platform gives students a dedicated space to post, chat, form groups, and stay connected within their own campus community — without the noise of a public network.

**Scale target:** Small deployment — one college, a few hundred to a few thousand registered users, moderate concurrent chat load.

---

## 2. Goals & Objectives

| Goal | Description |
|---|---|
| Controlled access | Only students pre-approved by the admin (via roll number) can sign up |
| Rich social interaction | Posts (image/video), likes, comments, shares |
| Real-time communication | 1:1 chat and group chat |
| Social graph | Friend requests, friend list |
| Full account lifecycle | Signup, login, forgot password (OTP), profile with photo |
| Admin control | Admin can whitelist roll numbers, view/manage/delete any user and their data |
| Delightful UX | Smooth animations and transitions throughout |

---

## 3. Target Users

1. **Students** — primary users; create posts, chat, connect with peers.
2. **Admin (college staff / platform owner)** — manages who is allowed to register, moderates users, has full account deletion rights.

*(No "moderator" role in v1 — only Student and Admin. Can be added later.)*

---

## 4. User Roles & Permissions

| Capability | Student | Admin |
|---|---|---|
| Register/login | ✅ (only if roll number is pre-approved) | ✅ (separate admin login) |
| Create posts (image/video) | ✅ | ❌ (not a content role) |
| Like / comment / share | ✅ | ❌ |
| Send friend requests, chat, create groups | ✅ | ❌ |
| Add allowed roll numbers | ❌ | ✅ |
| View all users & their details | ❌ | ✅ |
| Delete any user (and cascade their data) | ❌ | ✅ |
| Suspend/ban a user | ❌ | ✅ |

---

## 5. Functional Requirements

### 5.1 Authentication & Onboarding
- FR1: Admin pre-registers allowed **roll numbers** (with optional name/branch/year) before a student can sign up.
- FR2: Signup form validates the entered roll number against the admin whitelist before allowing account creation.
- FR3: Signup collects: full name, roll number, college email, phone, password, date of birth, branch/department, year, gender, **profile photo**, cover photo (optional).
- FR4: Login via email/roll number + password.
- FR5: Forgot Password flow: user enters email → system emails a 6-digit OTP → OTP verified (expires in 5–10 minutes) → user sets a new password.
- FR6: JWT-based session (access token + refresh token).
- FR7: Email verification OTP at signup (optional but recommended, same OTP engine as password reset).

### 5.2 Profile
- FR8: Editable profile: photo, cover photo, bio, branch, year, contact info, social links.
- FR9: Public profile page viewable by other logged-in students, showing their posts, friends count, and basic info.

### 5.3 Posts / Feed
- FR10: Create a post with text, multiple images, and/or **one video up to 30 seconds**.
- FR11: Video upload is validated and, if longer than 30s, either rejected or auto-trimmed (decision needed — default: reject with a clear error).
- FR12: News-feed showing posts from friends, ranked by recency (simple reverse-chronological in v1).
- FR13: Like, comment (with nested replies optional), and share a post.
- FR14: Delete/edit own post; author-only edit window.
- FR15: Report a post (flag for admin review) — recommended addition.

### 5.4 Social Graph
- FR16: Send, accept, reject, and cancel friend requests.
- FR17: Friends list, mutual friends count.
- FR18: Unfriend / block a user.

### 5.5 Chat & Groups
- FR19: 1:1 real-time chat between friends.
- FR20: Create a group chat with multiple friends; add/remove members (admin-of-group only).
- FR21: Send text, images, and short video clips in chat.
- FR22: Online/offline presence indicator, "seen" / typing indicators.
- FR23: Chat history persisted and paginated.

### 5.6 Notifications
- FR24: In-app notifications for: friend request, request accepted, like, comment, mention, new chat message.

### 5.7 Admin Panel
- FR25: Admin dashboard listing all users with search/filter (by roll number, branch, year).
- FR26: Admin can add/remove allowed roll numbers (bulk CSV upload recommended).
- FR27: Admin can view full details of any user.
- FR28: Admin can delete a user entirely — cascades to their posts, comments, chats (or anonymizes, per policy decision), friend links.
- FR29: Admin can suspend/reactivate an account.
- FR30: Basic analytics: total users, daily active users, total posts (nice-to-have).

### 5.8 UX / Animation
- FR31: Smooth page transitions, skeleton loaders, like/heart micro-animations, toast notifications, animated modals (using Framer Motion).

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Feed loads < 2s on 4G; chat message delivery < 500ms |
| Scalability | Support a few thousand registered users, hundreds of concurrent chat sessions |
| Availability | 99% uptime target for a college-scale deployment |
| Security | Password hashing (bcrypt), JWT auth, input validation, rate-limited OTP, HTTPS everywhere |
| Media limits | Images ≤ 5MB, videos ≤ 30 seconds & ≤ 50MB |
| Privacy | Only registered/whitelisted students can view campus content; no public/anonymous access |
| Accessibility | Responsive design, keyboard-navigable core flows |
| Maintainability | Clear module boundaries between auth, posts, chat, admin |

---

## 7. Out of Scope (v1)

- Public (non-college) access or federation across colleges
- Stories/reels beyond the 30-second post video
- Payment/monetization
- Native mobile apps (web-responsive only in v1)
- End-to-end encryption for chat (can be a v2 security enhancement)

---

## 8. Success Metrics

- % of whitelisted roll numbers that complete signup
- Daily/weekly active users
- Average posts per active user per week
- Chat messages sent per day
- Admin moderation turnaround time

---

## 9. Open Decisions Needing Your Input

1. Does the **admin also pre-fill student details** (name, branch) against a roll number, or does the admin only whitelist the roll number and the student fills everything else at signup?
2. Should a rejected/oversized video be **auto-trimmed to 30s** or simply **rejected** with an error?
3. On admin-deleting a user, should their posts/comments be **hard-deleted** or **anonymized** (kept for thread context but shown as "Deleted User")?
4. Do you want a lightweight **content moderation/report** feature in v1, or defer it?

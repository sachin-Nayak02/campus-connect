# System Workflow Document
## CampusConnect

---

## 1. Admin Whitelists a Roll Number → Student Registers

```mermaid
sequenceDiagram
    actor Admin
    participant AdminUI as Admin Panel
    participant API as Backend API
    participant DB as PostgreSQL
    actor Student
    participant WebApp as React App

    Admin->>AdminUI: Add roll number(s) (single or CSV bulk)
    AdminUI->>API: POST /admin/allowed-roll-numbers
    API->>DB: Insert into allowed_roll_numbers
    DB-->>API: Success
    API-->>AdminUI: Confirmation

    Student->>WebApp: Open Signup page, enter roll number
    WebApp->>API: POST /auth/check-roll-number
    API->>DB: SELECT WHERE roll_number = ? AND is_used = false
    alt Roll number is whitelisted & unused
        DB-->>API: Found
        API-->>WebApp: Allowed to proceed
        Student->>WebApp: Fill full signup form + upload profile photo
        WebApp->>API: POST /auth/signup (multipart form-data)
        API->>API: Validate input, hash password (bcrypt)
        API->>DB: Insert into users, mark allowed_roll_numbers.is_used = true
        API->>API: Generate OTP, store in otp_verifications
        API->>Student: Email OTP for account verification
        Student->>WebApp: Enter OTP
        WebApp->>API: POST /auth/verify-otp
        API->>DB: Validate OTP, mark user as verified
        API-->>WebApp: JWT access + refresh token
        WebApp-->>Student: Redirected to feed
    else Not whitelisted
        DB-->>API: Not found
        API-->>WebApp: Error - "Contact admin to register"
    end
```

---

## 2. Login

```mermaid
sequenceDiagram
    actor Student
    participant WebApp
    participant API
    participant DB

    Student->>WebApp: Enter email/roll number + password
    WebApp->>API: POST /auth/login
    API->>DB: Find user by email/roll_number
    alt Credentials valid & account active
        API->>API: bcrypt.compare(password, hash)
        API-->>WebApp: JWT access token + refresh token (httpOnly cookie)
        WebApp-->>Student: Redirect to feed
    else Invalid credentials or suspended account
        API-->>WebApp: 401 Unauthorized / 403 Suspended
        WebApp-->>Student: Show error message
    end
```

---

## 3. Forgot Password (OTP Verification)

```mermaid
sequenceDiagram
    actor Student
    participant WebApp
    participant API
    participant DB
    participant Mail as Email Service

    Student->>WebApp: Click "Forgot Password", enter email
    WebApp->>API: POST /auth/forgot-password
    API->>DB: Find user by email
    API->>API: Generate 6-digit OTP, expiry = now + 10min
    API->>DB: Store OTP in otp_verifications (purpose=password_reset)
    API->>Mail: Send OTP email
    Mail-->>Student: OTP delivered

    Student->>WebApp: Enter OTP
    WebApp->>API: POST /auth/verify-otp
    API->>DB: Check OTP matches, not expired, not used
    alt OTP valid
        API-->>WebApp: Short-lived reset token
        Student->>WebApp: Enter new password
        WebApp->>API: POST /auth/reset-password (reset token + new password)
        API->>API: Hash new password
        API->>DB: Update users.password_hash, mark OTP used
        API-->>WebApp: Success
        WebApp-->>Student: Redirect to login
    else OTP invalid/expired
        API-->>WebApp: Error - resend OTP option
    end
```

---

## 4. Creating a Post (Image/Video up to 30s)

```mermaid
sequenceDiagram
    actor Student
    participant WebApp
    participant API
    participant Storage as Cloudinary/S3
    participant DB

    Student->>WebApp: Compose post, attach image(s)/video
    WebApp->>WebApp: Client-side check: video duration ≤ 30s, file size limits
    alt Video too long
        WebApp-->>Student: Reject before upload - "Max 30 seconds"
    else Valid
        WebApp->>API: POST /posts (multipart form-data)
        API->>API: Server-side re-validate duration/size (ffprobe)
        API->>Storage: Upload media
        Storage-->>API: Media URL
        API->>DB: Insert post row + media row(s)
        API-->>WebApp: New post payload
        WebApp-->>Student: Post appears in feed with animation
        API->>DB: (async) Notify friends via notifications table
    end
```

---

## 5. Friend Request → Chat

```mermaid
sequenceDiagram
    actor A as Student A
    actor B as Student B
    participant API
    participant DB
    participant Socket as Socket.io Server

    A->>API: POST /users/:B_id/friend-request
    API->>DB: Insert friendships (status=pending)
    API->>Socket: emit notification:new to B
    Socket-->>B: Real-time "Friend request" toast

    B->>API: PATCH /friend-requests/:id (accept)
    API->>DB: Update status=accepted
    API->>Socket: notify A - request accepted

    A->>API: POST /chats (direct, with B)
    API->>DB: Create/find chat row
    A->>Socket: join room chat:<id>
    B->>Socket: join room chat:<id>
    A->>Socket: emit message:send
    Socket->>DB: Persist message
    Socket-->>B: emit message:receive (real-time delivery)
```

---

## 6. Group Chat Creation

```mermaid
sequenceDiagram
    actor Student
    participant WebApp
    participant API
    participant DB
    participant Socket

    Student->>WebApp: Select friends, name the group
    WebApp->>API: POST /chats/group {name, memberIds[]}
    API->>DB: Insert chats(type=group) + group_members rows
    API-->>WebApp: New group chat object
    loop for each member
        Socket->>Socket: add member's socket to room chat:<id>
        Socket-->>Student: notification:new "Added to <group>"
    end
```

---

## 7. Admin Manages / Deletes a User

```mermaid
sequenceDiagram
    actor Admin
    participant AdminUI
    participant API
    participant DB

    Admin->>AdminUI: Search/select a user
    AdminUI->>API: GET /admin/users/:id
    API->>DB: Fetch full profile + activity summary
    DB-->>API: User data
    API-->>AdminUI: Render full details

    Admin->>AdminUI: Click "Delete User"
    AdminUI->>API: DELETE /admin/users/:id
    API->>DB: BEGIN TRANSACTION
    API->>DB: Delete/anonymize posts, comments, likes, messages, friendships
    API->>DB: Delete user row
    API->>DB: COMMIT
    API-->>AdminUI: Success confirmation
```

---

## 8. High-Level State Flow (Post Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Uploading: media attached
    Uploading --> Published: server validation passes
    Uploading --> Draft: validation fails (e.g. video > 30s)
    Published --> Edited: author edits within window
    Published --> Reported: user reports
    Reported --> RemovedByAdmin: admin takes action
    Published --> DeletedByAuthor: author deletes
    Published --> [*]
    DeletedByAuthor --> [*]
    RemovedByAdmin --> [*]
```

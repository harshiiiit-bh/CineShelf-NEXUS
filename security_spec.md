# CineShelf NEXUS — Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants & Ownership Model
1. **Strict Account Isolation**: Every document in Firestore resides under `/users/{userId}` or a subcollection `/users/{userId}/{subcollection}/{docId}`.
2. **Ownership Identity**: Access to `/users/{userId}/...` requires `request.auth != null`, `request.auth.uid == userId`, and `incoming().uid == request.auth.uid`.
3. **Subcollection Master Gate**: Every subcollection write under `/users/{userId}/...` verifies parent user existence (`exists(/databases/$(database)/documents/users/$(userId))`) and path-to-field identity parity (`userId == request.auth.uid && incoming().uid == userId`).
4. **No Cross-Account Enumeration**: Listing `/users` is completely forbidden (`allow list: if false;`). Listing any subcollection requires `request.auth.uid == userId && resource.data.uid == request.auth.uid`.
5. **Temporal & Immutable Integrity**: `createdAt` and `uid` are immutable on `update`. Both `createdAt` (on create) and `updatedAt` (on create & update) must equal `request.time`.
6. **Strict Key & Volumetric Boundaries**: Every entity enforces `.keys().hasAll(...)` and `.keys().hasOnly(...)` on create, `.diff(existing()).affectedKeys().hasOnly(...)` on update, and `.size()` bounds on every string and array.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Read**: User B (`uid: "user_b"`) attempts `getDoc` on `/users/user_a/library/movie_1` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Write/Modify**: User B (`uid: "user_b"`) attempts `updateDoc` on `/users/user_a/library/movie_1` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Delete**: User B (`uid: "user_b"`) attempts `deleteDoc` on `/users/user_a/library/movie_1` -> `PERMISSION_DENIED`.
4. **Unauthenticated Access**: Unauthenticated visitor (`auth == null`) attempts `getDoc` on `/users/user_a/library/movie_1` -> `PERMISSION_DENIED`.
5. **UID Spoofing in Payload**: User A (`uid: "user_a"`) writes to `/users/user_a/library/movie_1` with `{ uid: "user_b", ... }` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection (Create)**: User A creates `/users/user_a/library/movie_1` with an undeclared field `{ isAdmin: true }` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection (Update)**: User A updates `/users/user_a/library/movie_1` adding `{ hackedField: "yes" }` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: User A updates `/users/user_a/library/movie_1` changing `uid` or `createdAt` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: User A creates `/users/user_a/library/movie_1` with a backdated `createdAt` timestamp != `request.time` -> `PERMISSION_DENIED`.
10. **Denial-of-Wallet String Overflow**: User A creates `/users/user_a/library/movie_1` with a `title` exceeding 300 characters -> `PERMISSION_DENIED`.
11. **Orphan Subcollection Creation**: User A attempts to create `/users/user_a/library/movie_1` before `/users/user_a` profile document exists -> `PERMISSION_DENIED`.
12. **Unverified Email Spoofing**: User A with `email_verified == false` attempts to write to `/users/user_a/library/movie_1` -> `PERMISSION_DENIED`.

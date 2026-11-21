# Security Specification & Payload-First TDD

## 1. Data Invariants
1. A `UserProfile` document at `/users/{userId}` can only be read, created, or updated by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. `UserProfile.uid` and `UserProfile.createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
3. A `FocusSession` document at `/users/{userId}/sessions/{sessionId}` requires an existing parent `/users/{userId}` document and `data.userId == request.auth.uid == userId`.
4. `FocusSession` documents are append-only flight records: once created with status `'completed'` or `'cancelled'`, they cannot be mutated (`allow update: if false`), only read or deleted by their owner.
5. All string fields enforce strict `.size()` upper bounds, IATA codes match `^[A-Z]{3}$`, IDs match `^[a-zA-Z0-9_\-]+$`, and numeric durations/distances are bounded (`plannedMinutes` 1..720, `completedMinutes` 0..720, `distanceKm` 0..25000).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/users/userA`.
2. Unauthenticated write of `/users/userA/sessions/s1`.
3. Cross-tenant read: `userB` attempting `get` or `list` on `/users/userA/sessions`.
4. Identity spoofing on create: `userA` creating `/users/userA/sessions/s1` with `userId: "userB"`.
5. Unverified email write: `request.auth.token.email_verified == false` writing a `FocusSession`.
6. Shadow / Ghost field injection: creating `/users/userA` with extra field `isAdmin: true`.
7. Oversized string poisoning: creating `FocusSession` with `subject` of 5,000 characters.
8. Invalid path ID poisoning: creating `/users/userA/sessions/bad$id!@#` with invalid characters.
9. Client timestamp forgery: creating `/users/userA` with `createdAt` set to a forged past timestamp instead of `request.time`.
10. Immutable field tampering: updating `/users/userA` to change `uid` or `email` or `createdAt`.
11. Out-of-bounds duration: creating `FocusSession` with `plannedMinutes: 999999` or `-10`.
12. Mutating a completed session: attempting `update` on `/users/userA/sessions/s1` after creation.

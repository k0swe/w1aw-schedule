# Per-Event Approval Changes Summary

This document provides a quick overview of the changes made to support per-event approval status.

## What Changed

### 1. Data Model
**New Interface:** `EventApproval` in `shared-constants.ts` (both functions/ and web/)

```typescript
export interface EventApproval {
  status: 'Applied' | 'Approved' | 'Declined';
  approvedBy?: string;
  declinedBy?: string;
  appliedAt: Timestamp;
  statusChangedAt?: Timestamp;
  userId?: string; // User ID for whom this approval is for (useful for queries)
}
```

**New Collection Structure:**
```
/events/{eventId}/approvals/{userId}
  - status
  - approvedBy
  - declinedBy
  - appliedAt
  - statusChangedAt
  - userId
```

### 2. Firestore Security Rules
Added new rules for the `approvals` subcollection under `events/{eventId}` in `firestore/firestore.rules`:

**Users can:**
- Create their own event approval applications (status must be 'Applied')
- Read their own approval status
- Update non-protected fields (not status, approvedBy, declinedBy, statusChangedAt)
- Delete (withdraw) their own applications

**Event admins can:**
- Read all approval statuses for their event
- Update approval status (approve/decline) for their event
- Cannot access approvals for other events

### 3. Tests
Updated test cases in `firestore/firestore.spec.js`:
- User CRUD operations on their own approvals
- Admin read/write operations for their events
- Cross-event isolation (admins cannot access other events)
- Protection of status fields from user modification
- Enforcement of 'Applied' status on user creation

### 4. Documentation
- **APPROVAL_MIGRATION.md**: Comprehensive migration guide with 5 phases
- **MULTI_EVENT_SUPPORT.md**: Updated with per-event approval architecture
- **This file**: Quick reference summary

## Backward Compatibility

⚠️ **Breaking Changes - No Backward Compatibility**
- Removed default Colorado event fallbacks
- `eventId` parameter is now required for all approval operations
- Legacy global `status` field in `/users/{userId}` is no longer used for approvals
- Approvals are now stored under `/events/{eventId}/approvals/{userId}`

## What's Changed

✅ **Frontend:**
- `UserSettingsService` now queries `/events/{eventId}/approvals` collection
- `ApprovalTabsComponent` is event-aware and requires event from route
- Admin queries simplified - no collection group needed
- Methods require explicit eventId (no defaults)

⚠️ **Backend:**
- `userStatusChanged` function still uses old structure (needs update)
- Functions still clear shifts only for Colorado event (needs update)

⚠️ **Data:**
- Existing approval data needs migration from old to new structure
- Users' current approval status not yet migrated to new location

## Quick Start for Future PRs

### Phase 2: Backend Functions (TODO)
```typescript
// Listen for per-event approval changes
export const eventApprovalChanged = onDocumentUpdated(
  'events/{eventId}/approvals/{userId}',
  async (event) => {
    const eventId = event.params.eventId;
    const userId = event.params.userId;
    // Clear shifts only for this specific event
  }
);
```

### Frontend Services (Already Implemented)
```typescript
// Query approvals for an event (admin) - simplified!
getAppliedUsersForEvent(eventId: string): Observable<UserSettings[]> {
  const approvalsCol = collection(this.firestore, `events/${eventId}/approvals`);
  const q = query(approvalsCol, where('status', '==', 'Applied'));
  return collectionData(q, { idField: 'id' });
}

// Get user's own approval for an event
getUserEventApproval(eventId: string): Observable<EventApproval> {
  const userId = this.authService.user$.getValue()!.uid;
  const docRef = doc(this.firestore, `events/${eventId}/approvals/${userId}`);
  return docData(docRef);
}
```

## Testing

To run Firestore rules tests (requires Firebase emulator):
```bash
cd firestore
npm test
```

Note: Tests may not run in CI environments due to emulator download restrictions.

## References

- [APPROVAL_MIGRATION.md](./APPROVAL_MIGRATION.md) - Detailed migration guide
- [MULTI_EVENT_SUPPORT.md](./MULTI_EVENT_SUPPORT.md) - Multi-event architecture
- [firestore/firestore.rules](./firestore/firestore.rules) - Security rules
- [firestore/firestore.spec.js](./firestore/firestore.spec.js) - Rules tests

## Questions?

See the "Questions & Decisions" section in [APPROVAL_MIGRATION.md](./APPROVAL_MIGRATION.md#questions--decisions).

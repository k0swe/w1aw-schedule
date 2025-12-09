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
}
```

**New Collection Structure:**
```
/users/{userId}/eventApprovals/{eventId}
  - status
  - approvedBy
  - declinedBy
  - appliedAt
  - statusChangedAt
```

### 2. Firestore Security Rules
Added new rules for the `eventApprovals` subcollection in `firestore/firestore.rules`:

**Users can:**
- Create their own event approval applications
- Read their own approval status
- Update non-protected fields (not status, approvedBy, declinedBy, statusChangedAt)
- Delete (withdraw) their own applications

**Event admins can:**
- Read approval status for their event
- Update approval status (approve/decline) for their event
- Cannot access approvals for other events

### 3. Tests
Added 14 new test cases in `firestore/firestore.spec.js`:
- User CRUD operations on their own approvals
- Admin read/write operations for their events
- Cross-event isolation (admins cannot access other events)
- Protection of status fields from user modification

### 4. Documentation
- **APPROVAL_MIGRATION.md**: Comprehensive migration guide with 5 phases
- **MULTI_EVENT_SUPPORT.md**: Updated with per-event approval architecture
- **This file**: Quick reference summary

## Backward Compatibility

✅ **Fully backward compatible**
- Legacy global `status` field remains in `/users/{userId}`
- Existing code continues to work unchanged
- Old and new structures coexist during migration

## What's NOT Changed (Yet)

The following will be updated in future PRs:

❌ **Frontend:**
- Components still use global status field
- `UserSettingsService` queries still use `/users` collection
- `ApprovalTabsComponent` not yet event-aware

❌ **Backend:**
- `userStatusChanged` function still uses global status
- Functions still clear shifts only for Colorado event
- No collection group queries for per-event approvals yet

❌ **Data:**
- No migration of existing data yet
- Users' current approval status not yet copied to eventApprovals

## Quick Start for Future PRs

### Phase 2: Backend Functions
```typescript
// Listen for per-event approval changes
export const eventApprovalChanged = onDocumentUpdated(
  'users/{userId}/eventApprovals/{eventId}',
  async (event) => {
    const eventId = event.params.eventId;
    // Clear shifts only for this specific event
  }
);
```

### Phase 3: Frontend Services
```typescript
// Query approvals for an event (admin)
getAppliedUsersForEvent(eventId: string): Observable<UserSettings[]> {
  const q = query(
    collectionGroup(this.firestore, 'eventApprovals'),
    where('status', '==', 'Applied')
  );
  // Note: This requires a composite index (auto-created on first use)
  return collectionData(q, { idField: 'id' });
}

// Get user's own approval for an event
getEventApproval(eventId: string): Observable<EventApproval> {
  const userId = this.authService.user$.getValue()!.uid;
  const docRef = doc(this.firestore, `users/${userId}/eventApprovals/${eventId}`);
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

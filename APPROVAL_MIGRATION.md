# Per-Event Approval Migration Guide

This document describes the migration from global user approval status to per-event approval status.

## Overview

The application is transitioning from a single global approval status per user to event-specific approval status. This allows different event organizers to independently approve operators for their events.

## Data Model Changes

### Before (Legacy)
```
/users/{userId}
  - status: 'Provisional' | 'Approved' | 'Declined'
  - approvedBy: string (admin uid)
  - declinedBy: string (admin uid)
```

### After (New)
```
/users/{userId}
  - (profile fields remain: callsign, email, name, etc.)
  
/users/{userId}/eventApprovals/{eventId}
  - status: 'Provisional' | 'Approved' | 'Declined'
  - approvedBy: string (admin uid)
  - declinedBy: string (admin uid)
  - appliedAt: Timestamp
  - statusChangedAt: Timestamp
```

## Migration Phases

### Phase 1: Foundation (COMPLETED)
**Status:** ✅ Completed in this PR

**Changes:**
- Added `EventApproval` interface to `functions/src/shared-constants.ts`
- Updated Firestore security rules to support per-event approvals
- Added comprehensive test suite for new rules
- Updated MULTI_EVENT_SUPPORT.md documentation

**Backward Compatibility:**
- Legacy global `status` field remains in place
- Existing code continues to work unchanged
- Both structures can coexist

### Phase 2: Backend Functions (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Update `userStatusChanged.ts` to handle per-event approvals
   - Listen for changes to `/users/{userId}/eventApprovals/{eventId}`
   - Clear shifts only for the specific event where status changed
   - Send approval emails per event

2. Update any other functions that read approval status
   - Modify to accept and use eventId parameter
   - Query eventApprovals subcollection instead of user document

3. Add new functions as needed:
   - `createEventApproval` - Initialize approval when user applies
   - `queryEventApprovals` - Admin function to list approvals per event

### Phase 3: Frontend Services (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Update `UserSettingsService`:
   - Add methods to read/write event-specific approvals
   - `getEventApproval(eventId)` - Get user's approval for an event
   - `applyForEvent(eventId)` - Create new approval application
   - `withdrawFromEvent(eventId)` - Remove approval application
   - Modify `getProvisionalUsers()`, `getApprovedUsers()`, `getDeclinedUsers()` to accept eventId parameter

2. Update `ApprovalTabsComponent`:
   - Accept eventId as input (from route or event context)
   - Pass eventId to service methods
   - Display event-specific approval lists

3. Update `ScheduleCellComponent`:
   - Check event-specific approval status for the current event
   - Update line 113: `this.userSettings$.getValue()?.status` to check event approval

4. Update `UserSettingsComponent`:
   - Show all events user has applied to
   - Allow user to apply for new events
   - Display approval status per event

### Phase 4: Data Migration (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Create migration script/function:
   ```typescript
   async function migrateUserApprovals() {
     // For each user with a status field:
     //   1. Get user's status
     //   2. Create eventApproval for Colorado event (default)
     //   3. Set appliedAt to user account creation date (or current date)
     //   4. Set statusChangedAt to user account creation date (or current date)
     //   5. Copy approvedBy/declinedBy fields
   }
   ```

2. Testing strategy:
   - Test migration on development database
   - Verify all users have corresponding eventApprovals
   - Verify no data loss
   - Run in production during low-traffic period

### Phase 5: Cleanup (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Remove legacy fields from `UserSettings` interface:
   - Remove `status`, `approvedBy`, `declinedBy` from shared-constants.ts
   - Remove from web/src/app/user-settings/user-settings.service.ts

2. Update Firestore rules:
   - Remove `status` from notUpdatingStatus() function
   - Remove global isAdmin() checks for user approval

3. Update tests:
   - Remove tests for legacy global status field
   - Keep only per-event approval tests

## Security Considerations

### Firestore Rules
The new rules ensure:
- Users can only create approvals for themselves
- Users cannot change their own approval status
- Event admins can only approve users for their events
- Admins from one event cannot access/modify approvals for other events

### Data Validation
Frontend and backend should validate:
- Status values are one of: 'Provisional', 'Approved', 'Declined'
- appliedAt timestamp is always set
- statusChangedAt is set when status changes
- approvedBy is set when status is 'Approved'
- declinedBy is set when status is 'Declined'

## Testing Strategy

### Unit Tests
- Test each service method with per-event approvals
- Mock Firestore queries for eventApprovals subcollection
- Verify eventId is passed correctly through all layers

### Integration Tests
- Test approval workflow end-to-end for a single event
- Test user applying for multiple events
- Test admin approving users for multiple events
- Test cross-event isolation

### Firestore Rules Tests
- ✅ Already added in Phase 1
- Run: `cd firestore && npm test`

## Rollback Plan

If issues are discovered after deployment:

1. **Phase 2-3 Rollback:**
   - Frontend/backend code can be reverted
   - Legacy global status field is still in place
   - No data loss

2. **Phase 4 Rollback:**
   - Migration can be reversed by reading eventApprovals back to global status
   - Keep both structures until confident

3. **Phase 5 Rollback:**
   - More complex - requires restoring legacy code and data
   - Avoid this phase until confident in Phases 2-4

## Timeline

Suggested timeline:
- **Phase 1:** ✅ Completed
- **Phase 2:** 1-2 weeks (backend functions)
- **Phase 3:** 2-3 weeks (frontend components)
- **Phase 4:** 1 week (data migration + testing)
- **Phase 5:** 1 week (cleanup)

Total estimated time: 5-7 weeks

## Questions & Decisions

### Decided:
- ✅ Use subcollection `/users/{userId}/eventApprovals/{eventId}` for per-event data
- ✅ Keep backward compatibility during migration
- ✅ Use event-specific admin checks in Firestore rules

### To Decide:
- Should multiShift be per-event or global?
- Should we auto-create eventApproval when user first views an event schedule?
- Should we send notifications when user applies for an event?
- Should we allow admins to batch-approve users?

## References

- [MULTI_EVENT_SUPPORT.md](./MULTI_EVENT_SUPPORT.md) - Multi-event architecture overview
- [Firestore Security Rules](./firestore/firestore.rules) - Current security rules
- [Firestore Tests](./firestore/firestore.spec.js) - Rules test suite

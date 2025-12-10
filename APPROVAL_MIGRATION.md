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

### After (New - Implemented)
```
/users/{userId}
  - (profile fields remain: callsign, email, name, etc.)
  - (status field deprecated but still present)
  
/events/{eventId}/approvals/{userId}
  - status: 'Applied' | 'Approved' | 'Declined'
  - approvedBy: string (admin uid)
  - declinedBy: string (admin uid)
  - appliedAt: Timestamp
  - statusChangedAt: Timestamp
  - userId: string (for easier querying)
```

## Migration Phases

### Phase 1: Foundation and Frontend (COMPLETED)
**Status:** ✅ Completed

**Changes:**
- Added `EventApproval` interface to both `functions/src/shared-constants.ts` and `web/src/app/schedule/shared-constants.ts`
- Updated Firestore security rules to support per-event approvals at `/events/{eventId}/approvals/{userId}`
- Updated all test cases for new rules and structure
- Implemented frontend service changes in `UserSettingsService`
- Updated `ApprovalTabsComponent` and `ApprovalListComponent` to require eventId
- Removed backward compatibility - eventId is now required

**Breaking Changes:**
- No backward compatibility with old structure
- All approval operations now require explicit eventId
- Admin queries simplified (no collection group needed)

### Phase 2: Backend Functions (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Update `userStatusChanged.ts` to handle per-event approvals
   - Listen for changes to `/events/{eventId}/approvals/{userId}` (new path)
   - Clear shifts only for the specific event where status changed
   - Send approval emails per event

2. Update any other functions that read approval status
   - Modify to accept and use eventId parameter
   - Query approvals collection under events instead of user document

3. Consider new functions as needed:
   - Function to batch migrate old approval data to new structure
   - Function to sync legacy status field (if keeping for compatibility)

### Phase 3: Additional Frontend Updates (TODO)
**Status:** 🔜 Future PR

**Required Changes:**
1. Update `ScheduleCellComponent`:
   - Check event-specific approval status for the current event
   - Update line 113: `this.userSettings$.getValue()?.status` to check event approval using `getUserEventApproval(eventId)`

2. Update `UserSettingsComponent`:
   - Show all events user has applied to
   - Allow user to apply for new events
   - Display approval status per event
   - Use the new `getUserEventApprovals()` method

### Phase 4: Data Migration (CRITICAL - TODO)
**Status:** 🔜 URGENT - Required for production

**Required Changes:**
1. Create migration script/function:
   ```typescript
   async function migrateUserApprovals() {
     // For each user with a status field:
     //   1. Get user's status
     //   2. For Colorado event (or determine which event(s) they applied to):
     //      a. Create approval at /events/{eventId}/approvals/{userId}
     //      b. Set status based on old status ('Provisional' -> 'Applied')
     //      c. Set appliedAt to user account creation date (or current date)
     //      d. Set statusChangedAt to user account creation date (or current date)
     //      e. Copy approvedBy/declinedBy fields
     //      f. Set userId field
   }
   ```

2. Testing strategy:
   - Test migration on development database first
   - Verify all users have corresponding approvals in new location
   - Verify no data loss
   - Run in production during low-traffic period
   - Keep old status field temporarily for rollback

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
- Status values are one of: 'Applied', 'Approved', 'Declined'
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

Updated timeline:
- **Phase 1:** ✅ Completed (Foundation + Frontend)
- **Phase 2:** 1-2 weeks (backend functions)
- **Phase 3:** 1 week (remaining frontend updates)
- **Phase 4:** 1 week (URGENT - data migration + testing)
- **Phase 5:** 1 week (cleanup)

Total remaining time: 3-4 weeks

**IMPORTANT:** Phase 4 (data migration) is critical and should be done soon after Phase 2.

## Questions & Decisions

### Decided:
- ✅ Use collection `/events/{eventId}/approvals/{userId}` for per-event data
- ✅ Remove backward compatibility - require explicit eventId
- ✅ Use event-specific admin checks in Firestore rules
- ✅ Simplify admin queries by placing approvals under events (no collection group needed)
- ✅ Users must create approvals with status='Applied' only

### To Decide:
- Should multiShift be per-event or global? (Currently global)
- Should we auto-create approval when user first views an event schedule?
- Should we send notifications when user applies for an event?
- Should we allow admins to batch-approve users?
- How to handle users who were approved for old Colorado event in migration?

## References

- [MULTI_EVENT_SUPPORT.md](./MULTI_EVENT_SUPPORT.md) - Multi-event architecture overview
- [Firestore Security Rules](./firestore/firestore.rules) - Current security rules
- [Firestore Tests](./firestore/firestore.spec.js) - Rules test suite

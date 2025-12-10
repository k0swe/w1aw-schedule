# Next Steps After eventApprovals Migration

This document outlines the critical next steps required after merging the eventApprovals data model changes.

## ⚠️ CRITICAL: Data Migration Required

**Before deploying this PR to production**, you MUST migrate existing approval data from the old structure to the new structure.

### Old Structure (Legacy)
```
/users/{userId}
  - status: 'Provisional' | 'Approved' | 'Declined'
  - approvedBy: string
  - declinedBy: string
```

### New Structure (Current)
```
/events/{eventId}/approvals/{userId}
  - status: 'Applied' | 'Approved' | 'Declined'
  - approvedBy: string
  - declinedBy: string
  - appliedAt: Timestamp
  - statusChangedAt: Timestamp
  - userId: string
```

### Migration Script Template

Create a Cloud Function or script to run once:

```typescript
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { COLORADO_DOC_ID } from './shared-constants';

async function migrateApprovals() {
  const db = getFirestore();
  const usersSnapshot = await db.collection('users').get();
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    // Skip if no status field
    if (!userData.status) continue;
    
    // Map old status to new status
    let newStatus: 'Applied' | 'Approved' | 'Declined';
    if (userData.status === 'Provisional') {
      newStatus = 'Applied';
    } else if (userData.status === 'Approved') {
      newStatus = 'Approved';
    } else if (userData.status === 'Declined') {
      newStatus = 'Declined';
    } else {
      continue; // Skip unknown status
    }
    
    // Determine which event(s) to create approvals for
    // For now, assume all users are for Colorado event
    const eventId = COLORADO_DOC_ID;
    
    const approvalRef = db.doc(`events/${eventId}/approvals/${userId}`);
    
    // Create the approval document
    batch.set(approvalRef, {
      status: newStatus,
      approvedBy: userData.approvedBy || null,
      declinedBy: userData.declinedBy || null,
      appliedAt: Timestamp.now(), // Use current time since we don't have historical data
      statusChangedAt: userData.approvedBy || userData.declinedBy ? Timestamp.now() : null,
      userId: userId,
    });
    
    batchCount++;
    
    // Firestore batch limit is 500 operations
    if (batchCount >= 500) {
      await batch.commit();
      batchCount = 0;
    }
  }
  
  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`Migration complete. Migrated ${usersSnapshot.size} users.`);
}

// Run the migration
migrateApprovals().catch(console.error);
```

### Migration Steps

1. **Test in development first**
   - Run migration script against development Firestore database
   - Verify all users have corresponding approvals in new location
   - Check that data looks correct

2. **Backup production data**
   - Export Firestore data before migration
   - Keep backup for at least 30 days

3. **Run in production**
   - Schedule during low-traffic period
   - Monitor for errors
   - Verify a sample of users after migration

4. **Keep old status fields temporarily**
   - Don't delete `status`, `approvedBy`, `declinedBy` from user documents yet
   - Allows rollback if issues are discovered

## Backend Functions to Update

### 1. userStatusChanged.ts

**Current**: Listens to `/users/{userId}` and triggers on status changes

**Needed**: Listen to `/events/{eventId}/approvals/{userId}` instead

```typescript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const eventApprovalChanged = onDocumentUpdated(
  'events/{eventId}/approvals/{userId}',
  async (event) => {
    const eventId = event.params.eventId;
    const userId = event.params.userId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    
    // Clear shifts only for this specific event if status changed to Declined
    if (afterData?.status === 'Declined' && beforeData?.status !== 'Declined') {
      // Clear user's shifts for this event only
      const shiftsSnapshot = await admin
        .firestore()
        .collection(`events/${eventId}/shifts`)
        .where('reservedBy', '==', userId)
        .get();
      
      const batch = admin.firestore().batch();
      shiftsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          reservedBy: null,
          reservedDetails: null,
        });
      });
      await batch.commit();
    }
    
    // Send approval email
    if (afterData?.status === 'Approved' && beforeData?.status !== 'Approved') {
      // Send approval notification
    }
  }
);
```

### 2. Other Functions

Review all functions that interact with user approval status and update them to query the new location.

## Frontend Updates Remaining

### 1. ScheduleCellComponent

Currently checks `this.userSettings$.getValue()?.status` which uses the old global status field.

**Update needed**: Check event-specific approval status

```typescript
// In schedule-cell.component.ts, check approval for current event
this.userSettingsService
  .getUserEventApproval(this.eventId)
  .subscribe((approval) => {
    this.userApprovalStatus = approval?.status;
  });
```

### 2. UserSettingsComponent

Should show user's approval status for all events they've applied to.

**Update needed**: Display multi-event approval status

```typescript
// In user-settings.component.ts
this.userEventApprovals$ = this.userSettingsService.getUserEventApprovals();
```

Then in the template, display each event and its approval status.

## Testing Checklist

After migration and updates:

- [ ] Users can apply for events (creates approval with 'Applied' status)
- [ ] Admins can see pending approvals for their events
- [ ] Admins can approve users for their events
- [ ] Admins can decline users for their events
- [ ] Approved users can reserve shifts
- [ ] Declined users cannot reserve shifts
- [ ] Users can withdraw their applications
- [ ] Admin from one event cannot approve users for another event
- [ ] Users can see their approval status for each event
- [ ] Email notifications are sent when status changes

## Rollback Plan

If critical issues are discovered after deployment:

1. **Quick Fix**: Re-enable reading from old `status` field in user documents as a fallback
2. **Full Rollback**: Revert code changes and continue using old structure
3. **Data Recovery**: Restore from backup if data corruption occurred

## Timeline Estimate

- Data migration script: 2-4 hours
- Testing migration in dev: 2-4 hours
- Backend function updates: 4-8 hours
- Frontend updates: 2-4 hours
- Testing: 4-8 hours
- Production migration: 1-2 hours

**Total**: 15-30 hours of work

## Questions to Answer Before Migration

1. Are there users in the system with approvals that need to be migrated?
2. Do all existing approved users belong to the Colorado event?
3. Should we send notification emails about the migration?
4. What's the rollback plan if the migration fails?
5. When is the best time to run the migration (low traffic period)?

## Contact

For questions about this migration, contact the repository maintainers.

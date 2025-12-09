# Multi-Event Support

This document describes the multi-event support implementation in the W1AW Schedule application.

## Overview

The application now supports multiple events, allowing different ARRL sections to run their own W1AW operations with separate schedules while sharing the same codebase.

## Architecture

### Event Identification

Each event is identified by:
- A unique event ID (Firestore document ID) stored in Firestore under the `/events/{eventId}` collection
- A unique slug used in URLs for user-friendly routing
- Event-specific time ranges (`startTime` and `endTime`) instead of global constants

The original Colorado section event uses ID `jZbFyscc23zjkEGRuPAI` and slug `usa250-co-may`, which serve as defaults for backward compatibility.

When users access routes with a slug parameter (e.g., `/events/usa250-co-may/schedule`), the application resolves the slug to the corresponding event ID by querying Firestore, then uses the event ID for all backend operations.

### Route Structure

Events can be accessed through parameterized routes using their slug:

- `/events/:slug/schedule` - View schedule for a specific event
- `/events/:slug/agenda` - View user's agenda for a specific event
- `/approvals/:slug` - Admin approval page for a specific event

Routes without a slug parameter (e.g., `/schedule`, `/agenda`) default to the Colorado event.

The menu links are currently hard-coded to use the Colorado event slug (`usa250-co-may`). This should be revisited to provide dynamic event selection in the future.

### Data Access

All data access services accept an optional `eventId` parameter that defaults to `COLORADO_DOC_ID`:

- `ScheduleService.findShift(time, band, mode, eventId?)`
- `ScheduleService.reserveShift(shift, userId, userDetails, eventId?)`
- `ScheduleService.cancelShift(shift, userId, eventId?)`
- `ScheduleService.findUserShifts(uid, eventId?)`
- `EventInfoService.getAdminList(eventId?)`
- `AuthenticationService.userIsAdmin(eventId?)`

### Functions/API Endpoints

Backend functions accept an optional `eventId` query parameter:

- `calendar?eventId=xxx&uid=yyy` - Generate iCal for a specific event
- `initShifts?eventId=xxx` - Initialize shifts for a specific event

### Security Rules

Firestore security rules have been updated to support per-event administration:

- `isAdmin()` - Checks admin status for the default Colorado event (backward compatibility)
- `isAdminForEvent(eventId)` - Checks admin status for a specific event

The shift update rules use `isAdminForEvent(eventId)` to ensure admins can only modify shifts in events where they have admin privileges.

## User Settings

User settings (profiles such as name, callsign, email, etc.) are global across all events and stored in the `/users/{userId}` collection.

### Approval Status (Per-Event)

**New Design (In Progress):** Approval status is managed on a per-event basis to allow different organizers to independently approve operators for their events. This is implemented using a subcollection:

- **Collection:** `/users/{userId}/eventApprovals/{eventId}`
- **Fields:**
  - `status`: 'Applied' | 'Approved' | 'Declined'
  - `approvedBy`: UID of admin who approved (optional)
  - `declinedBy`: UID of admin who declined (optional)
  - `appliedAt`: Timestamp when user applied
  - `statusChangedAt`: Timestamp of last status change (optional)

**Migration Strategy:**
- **Phase 1 (Current):** New data structure and Firestore rules are in place. The legacy global `status` field in `/users/{userId}` is preserved for backward compatibility.
- **Phase 2 (Future):** Update frontend and backend code to read/write per-event approvals. Migrate existing approval data from global to per-event structure.
- **Phase 3 (Future):** Remove legacy global `status` field once all code is migrated.

### Firestore Security Rules

Approval security is enforced through Firestore rules:
- Users can create their own event approval applications
- Users can read their own approval status for any event
- Users can update non-protected fields (e.g., notes) but cannot change status, approvedBy, declinedBy, or statusChangedAt
- Event-specific admins can read and update approval status only for their events
- Admins from one event cannot modify approvals for another event
- Users can withdraw (delete) their own applications

## Backward Compatibility

The implementation maintains full backward compatibility:

1. All service methods use `COLORADO_DOC_ID` as the default when no eventId is provided
2. Routes without slug parameters default to the Colorado event (slug: `usa250-co-may`, ID: `jZbFyscc23zjkEGRuPAI`)
3. Calendar and initShifts functions default to the Colorado event when no eventId query parameter is provided (Cloud Functions continue to use eventId, not slug)
4. Existing code that doesn't pass eventId continues to work with the Colorado event
5. Each event now has its own `startTime` and `endTime` properties, eliminating the need for global `TIME_SLOTS_START` and `TIME_SLOTS_END` constants

## Known Limitations

1. **User Status Changes**: The `userStatusChanged` function currently only clears shifts for the default Colorado event when a user is declined. With per-event approvals, this will need to clear shifts only for the specific event where the user was declined.

2. **Approval Status Migration**: The system currently supports both the legacy global `status` field and the new per-event approval structure. Frontend and backend code still use the legacy field. Full migration is planned in future phases.

3. **Event Discovery**: There is currently no UI for users to discover or list available events. Users must know the eventId to access a specific event's schedule.

4. **Cross-Event Admin Privileges**: The default `isAdmin()` function used in user management checks admin status only for the Colorado event. With per-event approvals, user management is inherently event-specific, and admins can only approve users for their own events.

## Future Enhancements

To fully support multiple independent events, consider:

1. **Complete Per-Event Approval Migration:**
   - Update frontend components to use per-event approvals
   - Update backend functions to use per-event approvals
   - Migrate existing approval data from global to per-event structure
   - Remove legacy global `status` field

2. **Event Discovery:**
   - Add an event listing/discovery page
   - Add navigation UI to switch between events

3. **User Experience:**
   - Show user's approval status across all events they've applied to
   - Allow users to apply for multiple events easily
   - Store user's event memberships/preferences

4. **Admin Experience:**
   - Provide event-specific approval dashboards
   - Show approval statistics per event
   - Notify admins when users apply for their events

5. **Shift Management:**
   - Update user status change logic to clear shifts only for the specific event where status changed
   - Consider implementing event-specific multiShift settings

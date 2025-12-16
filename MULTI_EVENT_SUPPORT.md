# Multi-Event Support

This document describes the multi-event support implementation in the W1AW Schedule application.

## Overview

The application supports multiple events, allowing different ARRL sections to run their own W1AW operations with separate schedules while sharing the same codebase.

## Architecture

### Event Identification

Each event is identified by:
- A unique event ID (Firestore document ID) stored in Firestore under the `/events/{eventId}` collection
- A unique slug used in URLs for user-friendly routing
- Event-specific time ranges (`startTime` and `endTime`) instead of global constants
- Event-specific coordinator callsign and name

When users access routes with a slug parameter (e.g., `/events/usa250-co-may/schedule`), the application resolves the slug to the corresponding event ID by querying Firestore, then uses the event ID for all backend operations.

### Route Structure

All event-specific routes require a slug parameter:

- `/events/:slug/schedule` - View schedule for a specific event
- `/events/:slug/agenda` - View user's agenda for a specific event
- `/events/:slug/approvals` - Admin approval page for a specific event

The application includes an event selector in the sidebar that allows users to switch between events. The selected event determines which event's pages are displayed.

### Data Access

All data access services require an `eventId` parameter:

- `ScheduleService.findShift(time, band, mode, eventId)`
- `ScheduleService.reserveShift(shift, userId, userDetails, eventId)`
- `ScheduleService.cancelShift(shift, userId, eventId)`
- `ScheduleService.findUserShifts(uid, eventId)`
- `EventInfoService.getAdminList(eventId)`
- `AuthenticationService.userIsAdmin(eventId)`

### Functions/API Endpoints

Backend functions require an `eventId` query parameter:

- `calendar?eventId=xxx&uid=yyy` - Generate iCal for a specific event (uses event name and coordinator callsign)
- `initShifts?eventId=xxx` - Initialize shifts for a specific event

### Security Rules
### Security Rules

Firestore security rules support per-event administration:

- `isAdminForEvent(eventId)` - Checks admin status for a specific event

The shift update rules use `isAdminForEvent(eventId)` to ensure admins can only modify shifts in events where they have admin privileges.

## User Settings

User settings (profiles such as name, callsign, email, etc.) are global across all events and stored in the `/users/{userId}` collection.

### Approval Status (Per-Event)

Approval status is managed on a per-event basis to allow different organizers to independently approve operators for their events. This is implemented using a subcollection:

- **Collection:** `/events/{eventId}/approvals/{userId}`
- **Fields:**
  - `status`: 'Applied' | 'Approved' | 'Declined'
  - `approvedBy`: UID of admin who approved (optional)
  - `declinedBy`: UID of admin who declined (optional)
  - `appliedAt`: Timestamp when user applied
  - `statusChangedAt`: Timestamp of last status change (optional)

### Firestore Security Rules

Approval security is enforced through Firestore rules:
- Users can create their own event approval applications
- Users can read their own approval status for any event
- Users can update non-protected fields but cannot change status, approvedBy, declinedBy, or statusChangedAt
- Event-specific admins can read and update approval status only for their events
- Admins from one event cannot modify approvals for another event
- Users can withdraw (delete) their own applications

## Implementation

The application has been fully migrated to multi-event support:

1. All service methods require an `eventId` parameter
2. All routes require a slug parameter (no default routes)
3. Cloud functions require an `eventId` query parameter
4. Each event has its own `startTime` and `endTime` properties
5. The event selector in the sidebar allows users to switch between events
6. Calendar and other event-specific operations use the event's name and coordinator callsign

## Known Limitations

1. **User Status Changes**: The `userStatusChanged` function currently only clears shifts for the default Colorado event when a user is declined. With per-event approvals, this will need to clear shifts only for the specific event where the user was declined.

2. **Event Discovery**: The home page content is static. Consider making it dynamic to show information about available events.

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

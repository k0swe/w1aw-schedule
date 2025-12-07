# Multi-Event Support

This document describes the multi-event support implementation in the W1AW Schedule application.

## Overview

The application now supports multiple events, allowing different ARRL sections to run their own W1AW operations with separate schedules while sharing the same codebase.

## Architecture

### Event Identification

Each event is identified by a unique event ID stored in Firestore under the `/events/{eventId}` collection. The original Colorado section event ID (`jZbFyscc23zjkEGRuPAI`) serves as the default for backward compatibility.

### Route Structure

Events can be accessed through parameterized routes:

- `/events/:eventId/schedule` - View schedule for a specific event
- `/events/:eventId/agenda` - View user's agenda for a specific event
- `/approvals/:eventId` - Admin approval page for a specific event

Routes without an eventId parameter (e.g., `/schedule`, `/agenda`) default to the Colorado event.

The menu links are currently hard-coded to use the Colorado event ID (`jZbFyscc23zjkEGRuPAI`). This should be revisited to provide dynamic event selection in the future.

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

User settings (profiles, approval status, etc.) are global across all events. A user approved for one event can participate in any event. This design decision was made to allow users to join multiple events without needing separate approvals.

## Backward Compatibility

The implementation maintains full backward compatibility:

1. All service methods use `COLORADO_DOC_ID` as the default when no eventId is provided
2. Routes without eventId parameters default to the Colorado event
3. Calendar and initShifts functions default to the Colorado event when no eventId query parameter is provided
4. Existing code that doesn't pass eventId continues to work with the Colorado event

## Known Limitations

1. **User Status Changes**: The `userStatusChanged` function currently only clears shifts for the default Colorado event when a user is declined. In a true multi-event system, this would need to clear shifts across all events.

2. **Event Discovery**: There is currently no UI for users to discover or list available events. Users must know the eventId to access a specific event's schedule.

3. **Cross-Event Admin Privileges**: The default `isAdmin()` function used in user management checks admin status only for the Colorado event. Admins of other events cannot perform user management actions.

## Future Enhancements

To fully support multiple independent events, consider:

1. Add an event listing/discovery page
2. Update user status change logic to clear shifts across all events
3. Implement event-specific user approval workflows
4. Add navigation UI to switch between events
5. Store user's event memberships/preferences

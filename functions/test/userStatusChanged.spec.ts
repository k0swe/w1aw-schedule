import * as assert from 'assert';

// userStatusChanged function has been removed as approval is now handled per-event
// via /events/{eventId}/approvals/{userId} collection instead of global user status.
// 
// Previous functionality:
// - Sent email when global status changed to 'Approved'
// - Cleared shifts when global status changed to 'Declined'
//
// New approach:
// - Per-event approval status in /events/{eventId}/approvals/{userId}
// - Email notifications would be triggered by approval status changes in that collection
// - Shift management is handled per-event based on per-event approval status

describe('userStatusChanged (deprecated)', () => {
  it('function has been removed - approval is now per-event', () => {
    // This test file is kept as documentation of the removed functionality
    // The userStatusChanged function has been completely removed from the codebase
    assert.ok(true);
  });
});

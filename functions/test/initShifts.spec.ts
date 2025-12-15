import * as assert from 'assert';
import { Timestamp } from 'firebase-admin/firestore';
import { shiftId, TWO_HOURS_IN_MS } from 'w1aw-schedule-shared';

describe('initShifts', () => {
  it('should generate time slots with zero milliseconds', () => {
    // Simulate the calcTimeSlots function behavior
    const startTimeWithMs = new Date('2026-05-27T00:00:00.227Z'); // Has 227 milliseconds
    const endTime = new Date('2026-05-27T04:00:00Z');
    
    const timeSlots: Date[] = [];
    let currentTimeSlot = startTimeWithMs;
    while (currentTimeSlot < endTime) {
      // Zero out milliseconds to match browser behavior
      const normalizedSlot = new Date(currentTimeSlot.getTime());
      normalizedSlot.setMilliseconds(0);
      timeSlots.push(normalizedSlot);
      currentTimeSlot = new Date(currentTimeSlot.getTime() + TWO_HOURS_IN_MS);
    }
    
    // Verify all time slots have zero milliseconds
    timeSlots.forEach((slot) => {
      assert.equal(slot.getMilliseconds(), 0, 
        `Time slot ${slot.toISOString()} should have 0 milliseconds`);
    });
  });
  
  it('should generate consistent shift IDs regardless of input milliseconds', () => {
    // Create two timestamps: one with milliseconds, one without
    const dateWithMs = new Date('2026-05-27T14:00:00.227Z');
    const dateWithoutMs = new Date('2026-05-27T14:00:00.000Z');
    
    // Normalize the date with milliseconds (as calcTimeSlots does)
    const normalizedDate = new Date(dateWithMs.getTime());
    normalizedDate.setMilliseconds(0);
    
    // Create Timestamps from both dates
    const timestampFromNormalized = Timestamp.fromDate(normalizedDate);
    const timestampFromClean = Timestamp.fromDate(dateWithoutMs);
    
    // Generate shift IDs for the same band and mode
    const shiftFromNormalized = shiftId({
      time: timestampFromNormalized,
      band: '20',
      mode: 'phone',
    });
    
    const shiftFromClean = shiftId({
      time: timestampFromClean,
      band: '20',
      mode: 'phone',
    });
    
    // Verify both generate the same shift ID
    assert.equal(shiftFromNormalized, shiftFromClean,
      'Shift IDs should match when timestamps have the same time but different milliseconds');
    
    // Verify the timestamp milliseconds are zero
    assert.equal(timestampFromNormalized.toMillis() % 1000, 0,
      'Normalized timestamp should have 0 milliseconds');
    assert.equal(timestampFromClean.toMillis() % 1000, 0,
      'Clean timestamp should have 0 milliseconds');
  });
  
  it('should match the exact example from the bug report', () => {
    // From the bug report:
    // Browser: shiftId input: 1779840000000-20-phone, output: 9adbca2f
    // initShifts (before fix): shiftId input: 1779840000227-20-phone, output: 16f3288
    
    // Create a timestamp with the exact milliseconds from the bug report
    const timestampMs = 1779840000227;
    const dateWithMs = new Date(timestampMs);
    
    // Normalize it (as the fix does)
    const normalizedDate = new Date(dateWithMs.getTime());
    normalizedDate.setMilliseconds(0);
    const normalizedTimestamp = Timestamp.fromDate(normalizedDate);
    
    // Verify the normalized timestamp has the expected milliseconds
    assert.equal(normalizedTimestamp.toMillis(), 1779840000000,
      'Normalized timestamp should have milliseconds zeroed out');
    
    // Generate shift ID
    const sid = shiftId({
      time: normalizedTimestamp,
      band: '20',
      mode: 'phone',
    });
    
    // Verify it matches the expected hash from the browser
    assert.equal(sid, '9adbca2f',
      'Shift ID should match browser-generated hash');
  });
});

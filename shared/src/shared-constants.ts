// Shared constants and types for W1AW Schedule
// This module is used by both the web app and cloud functions

export const TWO_HOURS_IN_MS: number = 2 * 60 * 60 * 1000;
export const MODES = ['phone', 'cw', 'digital'];
export const LF_BANDS = ['2200', '630'];
export const LOW_HF_BANDS = ['160', '80', '40', '30'];
export const HI_HF_BANDS = ['20', '17', '15', '12', '10'];
export const VHF_UHF_BANDS = ['6', '2', '1.25', '0.70', '0.33'];
export const BANDS = [
  ...LF_BANDS,
  ...LOW_HF_BANDS,
  ...HI_HF_BANDS,
  ...VHF_UHF_BANDS,
];
// Default event ID for the Colorado section W1AW/0 event
// This is used for backward compatibility when no event ID is specified
export const COLORADO_DOC_ID = 'jZbFyscc23zjkEGRuPAI';
// Default event slug for the Colorado section W1AW/0 event
export const COLORADO_SLUG = 'usa250-co-may';
// Super-admin user ID with full system access
export const SUPER_ADMIN_ID = 'VAfZAw8GhJQodyTTCkXgilbqvoM2';

// Generic Timestamp interface that matches both firebase/firestore and firebase-admin/firestore
export interface GenericTimestamp {
  toMillis(): number;
  toDate(): Date;
}

export interface EventInfo {
  name: string;
  slug: string;
  coordinatorName: string;
  coordinatorCallsign: string;
  admins: string[];
  startTime: GenericTimestamp;
  endTime: GenericTimestamp;
  timeZoneId: string;
  googleCalendarId?: string;
}

export interface EventInfoWithId extends EventInfo {
  id: string;
}

/**
 * @deprecated Use EventInfo instead. This interface is kept for backwards compatibility
 * and will be removed in a future version.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SectionInfo extends EventInfo {}

export interface UserSettings {
  id?: string;
  callsign?: string;
  email?: string;
  emailVerified?: boolean;
  gridSquare?: string;
  name?: string;
  phone?: string;
  approvedBy?: string;
  declinedBy?: string;
  multiShift?: boolean;
  arrlMemberNumber?: string;
  discordUsername?: string;
  discordId?: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
}

export interface EventApproval {
  status: 'Applied' | 'Approved' | 'Declined';
  approvedBy?: string;
  declinedBy?: string;
  appliedAt: GenericTimestamp;
  statusChangedAt?: GenericTimestamp;
  userId?: string; // User ID for whom this approval is for (useful for queries)
}

export interface Shift {
  time: GenericTimestamp;
  band: string;
  mode: string;
  // Firebase User ID
  reservedBy: string | null;
  reservedDetails: UserSettings | null;
}

export const shiftId = (shift: Partial<Shift>): string => {
  const hashInput =
    shift.time?.toMillis() + '-' + shift.band + '-' + shift.mode;
  return djb2Hash(hashInput);
};

const djb2Hash = (str: string): string => {
  const len = str.length;
  let h = 5381;
  for (let i = 0; i < len; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
};

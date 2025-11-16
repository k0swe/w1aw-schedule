// This file is copy-pasta'd in the web app

import { Timestamp } from 'firebase-admin/firestore';

export const TWO_HOURS_IN_MS: number = 2 * 60 * 60 * 1000;
export const TIME_SLOTS_START = new Date('2026-05-27T00:00:00Z');
export const TIME_SLOTS_END = new Date('2026-06-02T23:59:59Z');
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
export const COLORADO_DOC_ID = 'jZbFyscc23zjkEGRuPAI';

export interface SectionInfo {
  name: string;
  coordinatorName: string;
  coordinatorCallsign: string;
  admins: string[];
}

export interface UserSettings {
  id?: string;
  callsign?: string;
  email?: string;
  emailVerified?: boolean;
  gridSquare?: string;
  name?: string;
  phone?: string;
  status?: string;
  approvedBy?: string;
  declinedBy?: string;
  multiShift?: boolean;
  arrlMemberNumber?: string;
  discordUsername?: string;
}

export interface Shift {
  time: Timestamp;
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

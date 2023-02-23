// This file is copy-pasta'd in functions
import { Timestamp } from 'firebase/firestore';

import { UserSettings } from '../user-settings/user-settings.service';

export const TWO_HOURS_IN_MS: number = 2 * 60 * 60 * 1000;
export const TIME_SLOTS_START = new Date('2023-05-24T00:00:00Z');
export const TIME_SLOTS_END = new Date('2023-05-30T23:59:59Z');
export const MODES = ['phone', 'cw', 'digital'];
export const BANDS = [
  '160',
  '80',
  '40',
  '20',
  '15',
  '10',
  '6',
  '2',
  '1.25',
  '0.7',
  '0.33',
  '0.23',
  '0.13',
  '0.05',
  '0.03',
];
export const COLORADO_DOC_ID = 'jZbFyscc23zjkEGRuPAI';

export interface Shift {
  time: Timestamp;
  band: string;
  mode: string;
  reservedBy: UserSettings | null;
}

export const shiftId = (shift: Shift): string => {
  const hashInput = shift.time.toMillis() + '-' + shift.band + '-' + shift.mode;
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

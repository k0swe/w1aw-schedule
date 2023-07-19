// This file is copy-pasta'd in the web app

import {Timestamp} from "firebase-admin/firestore";

export const TWO_HOURS_IN_MS: number = 2 * 60 * 60 * 1000;
export const TIME_SLOTS_START = new Date('2023-09-13T00:00:00Z');
export const TIME_SLOTS_END = new Date('2023-09-19T23:59:59Z');
export const MODES = ['phone', 'cw', 'digital'];
export const HF_BANDS = ['160', '80', '40', '20', '15', '10'];
export const VHF_BANDS = ['6', '2', '1.25'];
export const UHF_BANDS = ['0.7', '0.33', '0.23', '0.13'];
export const SHF_BANDS = ['0.05', '0.03'];
export const BANDS = [...HF_BANDS, ...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS];
export const COLORADO_DOC_ID = 'jZbFyscc23zjkEGRuPAI';

export interface Shift {
  time: Timestamp;
  band: string;
  mode: string;
  // Firebase User ID
  reservedBy: string | null;
  reservedDetails: object | null;
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

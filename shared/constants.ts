/**
 * Shared constants used by both web and functions.
 * These are pure values with no dependencies on Firebase-specific types.
 */

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

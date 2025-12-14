"use strict";
// Shared constants and types for W1AW Schedule
// This module is used by both the web app and cloud functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftId = exports.SUPER_ADMIN_ID = exports.COLORADO_SLUG = exports.COLORADO_DOC_ID = exports.BANDS = exports.VHF_UHF_BANDS = exports.HI_HF_BANDS = exports.LOW_HF_BANDS = exports.LF_BANDS = exports.MODES = exports.TWO_HOURS_IN_MS = void 0;
exports.TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
exports.MODES = ['phone', 'cw', 'digital'];
exports.LF_BANDS = ['2200', '630'];
exports.LOW_HF_BANDS = ['160', '80', '40', '30'];
exports.HI_HF_BANDS = ['20', '17', '15', '12', '10'];
exports.VHF_UHF_BANDS = ['6', '2', '1.25', '0.70', '0.33'];
exports.BANDS = [
    ...exports.LF_BANDS,
    ...exports.LOW_HF_BANDS,
    ...exports.HI_HF_BANDS,
    ...exports.VHF_UHF_BANDS,
];
// Default event ID for the Colorado section W1AW/0 event
// This is used for backward compatibility when no event ID is specified
exports.COLORADO_DOC_ID = 'jZbFyscc23zjkEGRuPAI';
// Default event slug for the Colorado section W1AW/0 event
exports.COLORADO_SLUG = 'usa250-co-may';
// Super-admin user ID with full system access
exports.SUPER_ADMIN_ID = 'VAfZAw8GhJQodyTTCkXgilbqvoM2';
const shiftId = (shift) => {
    const hashInput = shift.time?.toMillis() + '-' + shift.band + '-' + shift.mode;
    return djb2Hash(hashInput);
};
exports.shiftId = shiftId;
const djb2Hash = (str) => {
    const len = str.length;
    let h = 5381;
    for (let i = 0; i < len; i++) {
        h = (h * 33) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
};

import * as admin from 'firebase-admin';

export { calendar } from './calendar';
export { deleteUser } from './deleteUser';
export { discordOAuthCallback, discordOAuthInitiate } from './discordOAuth';
export { initShifts } from './initShifts';
export { newUser } from './newUser';
export { syncEmailVerification } from './syncEmailVerification';
// userStatusChanged function removed - approval is now handled per-event via /events/{eventId}/approvals/{userId}

admin.initializeApp();

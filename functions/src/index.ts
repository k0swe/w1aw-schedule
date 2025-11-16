import * as admin from 'firebase-admin';

export { calendar } from './calendar';
export { deleteUser } from './deleteUser';
export { discordOAuthCallback, discordOAuthInitiate } from './discordOAuth';
export { initShifts } from './initShifts';
export { newUser } from './newUser';
export { syncEmailVerification } from './syncEmailVerification';
export { userStatusChanged } from './userStatusChanged';

admin.initializeApp();

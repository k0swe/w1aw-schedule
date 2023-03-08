import * as admin from 'firebase-admin';

export { calendar } from './calendar';
export { initShifts } from './initShifts';
export { newUser } from './newUser';
export { userStatusChanged } from './userStatusChanged';

admin.initializeApp();

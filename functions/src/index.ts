import * as admin from 'firebase-admin';

export { initShifts } from './initShifts';
export { newUser } from './newUser';
export { userStatusChanged } from './userStatusChanged';

admin.initializeApp();

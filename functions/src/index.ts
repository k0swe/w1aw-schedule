import * as admin from 'firebase-admin';

export { calendar } from './calendar';
export { deleteUser } from './deleteUser';
export { initShifts } from './initShifts';
export { newUser } from './newUser';
export { userStatusChanged } from './userStatusChanged';

admin.initializeApp();

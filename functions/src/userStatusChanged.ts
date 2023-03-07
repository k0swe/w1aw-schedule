import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const userStatusChanged = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change) => {
    const after = change.after.data();

    if (after.status === 'Approved') {
      await admin
        .firestore()
        .collection('mail')
        .doc()
        .set({
          to: after.email,
          template: {
            name: 'approved',
            data: {
              callsign: after.callsign,
            },
          },
        });
    }
  });

import * as admin from 'firebase-admin';
import { firestore } from 'firebase-functions/v1';
import { COLORADO_DOC_ID } from './shared-constants';

export const userStatusChanged = firestore
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
    } else if (after.status === 'Declined') {
      // find any shifts that were reserved by this user and un-assign them
      const shifts = await admin
        .firestore()
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection('shifts')
        .where('reservedBy', '==', change.after.id)
        .get();
      for (const shift of shifts.docs) {
        await shift.ref.update({ reservedBy: null, reservedDetails: null });
      }
    }
  });

import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { COLORADO_DOC_ID, UserSettings } from './shared-constants';
import { DocumentSnapshot } from 'firebase-admin/firestore';

export const userStatusChanged = onDocumentUpdated(
  'users/{userId}',
  async (event) => {
    // Support both v2 event shape (event.data.after) and the Change object
    // produced by firebase-functions-test (event.after).
    let afterDoc: DocumentSnapshot | null = null;
    let afterId: string | null = null;

    const maybeEvent = event as unknown as {
      data?: { after?: DocumentSnapshot };
      after?: DocumentSnapshot;
    };
    if (maybeEvent.data && maybeEvent.data.after) {
      afterDoc = maybeEvent.data.after;
    } else if (maybeEvent.after) {
      // The test harness provides a Change-like object.
      afterDoc = maybeEvent.after;
    }

    if (!afterDoc) return;

    const afterData = (afterDoc.data() as UserSettings) || {};
    afterId = afterDoc.id || null;

    if (afterData.status === 'Approved') {
      await admin
        .firestore()
        .collection('mail')
        .doc()
        .set({
          to: afterData.email as string,
          template: {
            name: 'approved',
            data: {
              callsign: afterData.callsign as string,
            },
          },
        });
    } else if (afterData.status === 'Declined') {
      // find any shifts that were reserved by this user and un-assign them
      // use the normalized afterId (may be null)
      // TODO: Remove dual-write logic after Firestore collection rename migration is complete
      // Update both 'sections' (legacy) and 'events' (new) collections during migration
      
      // Update sections collection
      const sectionsShifts = await admin
        .firestore()
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection('shifts')
        .where('reservedBy', '==', afterId)
        .get();
      for (const shift of sectionsShifts.docs) {
        await shift.ref.update({ reservedBy: null, reservedDetails: null });
      }
      
      // Update events collection
      try {
        const eventsShifts = await admin
          .firestore()
          .collection('events')
          .doc(COLORADO_DOC_ID)
          .collection('shifts')
          .where('reservedBy', '==', afterId)
          .get();
        for (const shift of eventsShifts.docs) {
          await shift.ref.update({ reservedBy: null, reservedDetails: null });
        }
      } catch {
        // Events collection may not exist yet, that's ok
      }
    }
  },
);

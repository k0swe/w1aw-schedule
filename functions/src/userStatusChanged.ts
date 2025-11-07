import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { COLORADO_DOC_ID } from './shared-constants';
import { DocumentSnapshot } from 'firebase-admin/firestore';

export const userStatusChanged = onDocumentUpdated('users/{userId}', async (event) => {
  // Support both v2 event shape (event.data.after) and the Change object
  // produced by firebase-functions-test (event.after).
  let afterDoc: DocumentSnapshot | null = null;
  let afterId: string | null = null;

  const maybeEvent = event as unknown as { data?: { after?: DocumentSnapshot }; after?: DocumentSnapshot };
  if (maybeEvent.data && maybeEvent.data.after) {
    afterDoc = maybeEvent.data.after;
  } else if (maybeEvent.after) {
    // The test harness provides a Change-like object.
    afterDoc = maybeEvent.after;
  }

  if (!afterDoc) return;

  const afterData = afterDoc.data() || {};
  afterId = afterDoc.id || null;

  if ((afterData as any).status === 'Approved') {
    await admin
      .firestore()
      .collection('mail')
      .doc()
      .set({
        to: (afterData as { [k: string]: unknown }).email as string,
        template: {
          name: 'approved',
          data: {
            callsign: (afterData as { [k: string]: unknown }).callsign as string,
          },
        },
      });
  } else if ((afterData as { [k: string]: unknown }).status === 'Declined') {
    // find any shifts that were reserved by this user and un-assign them
    // use the normalized afterId (may be null)
    const shifts = await admin
      .firestore()
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection('shifts')
      .where('reservedBy', '==', afterId)
      .get();
    for (const shift of shifts.docs) {
      await shift.ref.update({ reservedBy: null, reservedDetails: null });
    }
  }
});

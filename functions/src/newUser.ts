import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { COLORADO_DOC_ID, EventInfo } from './shared-constants';

export const newUser = onDocumentCreated('users/{userId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const userData = snapshot.data();
  const email = userData.email as string;
  const userId = event.params.userId;

  if (!email) {
    console.log('No email found for new user');
    return;
  }

  // Get the Firebase Auth user to check email verification status
  let emailVerified = false;
  try {
    const authUser = await admin.auth().getUser(userId);
    emailVerified = authUser.emailVerified;

    // Update the Firestore document with emailVerified status
    await snapshot.ref.update({ emailVerified });

    // Note: Firebase Auth automatically sends verification emails for email/password signups
    // when configured in the Firebase Console. Social logins (Google, Facebook) are pre-verified.
    // The client-side code should call sendEmailVerification() after user creation.
  } catch (error) {
    console.error('Error getting auth user:', error);
  }

  // TODO: Remove dual-read logic after Firestore collection rename migration is complete
  // Try reading from 'events' collection first, fall back to 'sections' collection
  let eventInfoData: EventInfo | undefined;
  
  try {
    const eventsDoc = await admin.firestore().collection('events').doc(COLORADO_DOC_ID).get();
    if (eventsDoc.exists) {
      eventInfoData = eventsDoc.data() as EventInfo;
    }
  } catch (error) {
    console.warn('Failed to read from events collection, falling back to sections', error);
  }
  
  if (!eventInfoData) {
    // Fallback to legacy 'sections' collection
    const sectionsDoc = await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).get();
    eventInfoData = sectionsDoc.data() as EventInfo;
  }
  
  const { admins } = eventInfoData;

  await admin
    .firestore()
    .collection('mail')
    .doc()
    .set({
      to: email,
      bccUids: admins,
      template: {
        name: 'welcome',
        data: {
          email: email,
        },
      },
    });
});

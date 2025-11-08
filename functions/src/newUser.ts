import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { COLORADO_DOC_ID, SectionInfo } from './shared-constants';

export const newUser = onDocumentCreated('users/{userId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const userData = snapshot.data();
  const email = userData.email as string;

  if (!email) {
    console.log('No email found for new user');
    return;
  }

  const { admins } = (
    await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).get()
  ).data() as SectionInfo;

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

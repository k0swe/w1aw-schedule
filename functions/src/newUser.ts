import * as admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { COLORADO_DOC_ID, SectionInfo } from './shared-constants';

export const newUser = beforeUserCreated(async (event) => {
  const user = event.data;

  // Guard against unexpected missing event data (keeps TypeScript happy).
  if (!user) {
    throw new Error('Missing user data in beforeUserCreated event');
  }

  const uid = user.uid as string;
  const email = (user.email as string) || '';
  const displayName = (user.displayName as string) || '';

  // Create user document in Firestore
  await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .set({ email: email, status: 'Provisional', name: displayName });

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

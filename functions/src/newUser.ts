import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { COLORADO_DOC_ID, SectionInfo } from './shared-constants';

export const newUser = functions.auth.user().onCreate(async (user) => {
  await admin
    .firestore()
    .collection('users')
    .doc(user.uid)
    .set({ email: user.email, status: 'Provisional', name: user.displayName });

  const { admins } = (
    await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).get()
  ).data() as SectionInfo;

  await admin
    .firestore()
    .collection('mail')
    .doc()
    .set({
      to: user.email,
      bccUids: admins,
      template: {
        name: 'welcome',
        data: {
          email: user.email,
        },
      },
    });
});

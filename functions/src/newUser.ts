import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export const newUser = functions.auth.user().onCreate(async (user) => {
  await admin
    .firestore()
    .collection('users')
    .doc(user.uid)
    .set({ email: user.email, status: 'Provisional', name: user.displayName });

  await admin
    .firestore()
    .collection('mail')
    .doc()
    .set({
      to: user.email,
      bccUids: [
        'r9qBLFDsymTyrWb3vtJmhZlDPMy1',
        'r3crDouTiXWqBSvRB9aS1afKgPU2',
        'wgIC96oiqIh65tpT2U9aplvQMpo2',
        'Q7KNTXh5zTZBxJoRiqPyT9oWMhn2',
      ],
      template: {
        name: 'welcome',
        data: {
          email: user.email,
        },
      },
    });
});

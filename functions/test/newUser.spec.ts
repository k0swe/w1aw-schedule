import firebaseFunctionsTest from 'firebase-functions-test';
import { newUser } from '../src';
import admin from 'firebase-admin';
import * as assert from 'assert';
import { COLORADO_DOC_ID } from '../src/shared-constants';

const test = firebaseFunctionsTest(
  {
    databaseURL: 'https://w1aw-test.firebaseio.com',
    projectId: 'w1aw-test',
    storageBucket: 'w1aw-test.appspot.com',
  },
  'creds.json',
);

describe('Cloud Functions', () => {
  const user = test.auth.makeUserRecord({
    uid: '12345',
    email: 'test@example.com',
    displayName: 'Test User',
  });
  const adminList = ['67890', 'abcde'];

  before(async () => {
    await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).set({
      admins: adminList,
    });
  });

  after(async () => {
    // Do cleanup tasks.
    test.cleanup();
    // Reset the database.
    await deleteCollection(admin.firestore().collection('users'));
    await deleteCollection(admin.firestore().collection('mail'));
  });

  describe('newUser', () => {
    it('should set the user approval to provisional', async () => {
      await test
        .wrap(newUser)(user)
        .then(() => {
          admin
            .firestore()
            .collection('users')
            .doc(user.uid)
            .get()
            .then((userDoc) => {
              assert.equal(userDoc.data()?.status, 'Provisional');
            });
        });
    });

    it('should post an email', async () => {
      await test
        .wrap(newUser)(user)
        .then(() => {
          admin
            .firestore()
            .collection('mail')
            .get()
            .then((mailDocs) => {
              assert.equal(mailDocs.size, 1);
              mailDocs.forEach((mailDoc) => {
                assert.equal(mailDoc.data()?.to, user.email);
                assert.equal(mailDoc.data()?.bccUids, adminList);
              });
            });
        });
    });
  });
});

/**
 * Delete all documents in the given Firestore collection.
 * @param {FirebaseFirestore.CollectionReference} ref the Firestore collection reference
 */
async function deleteCollection(
  ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>,
) {
  await ref.get().then((snapshot) => {
    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
  });
}

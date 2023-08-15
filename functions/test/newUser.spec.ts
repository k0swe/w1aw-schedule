import firebaseFunctionsTest from 'firebase-functions-test';
import { newUser } from '../src';
import admin from 'firebase-admin';
import * as assert from 'assert';
import { COLORADO_DOC_ID } from '../src/shared-constants';
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { UserRecord } from 'firebase-admin/auth';

describe('Cloud Functions', () => {
  let test: FeaturesList;
  let user: UserRecord;
  const adminList = ['67890', 'abcde'];

  beforeEach(async () => {
    test = firebaseFunctionsTest(
      {
        databaseURL: 'https://w1aw-test.firebaseio.com',
        projectId: 'w1aw-test',
        storageBucket: 'w1aw-test.appspot.com',
      },
      'creds.json',
    );
    user = test.auth.makeUserRecord({
      uid: '12345',
      email: 'test@example.com',
      displayName: 'Test User',
    });

    await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).set({
      admins: adminList,
    });
  });

  afterEach(async () => {
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
        .then(async () => {
          await admin
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
        .then(async () => {
          await admin
            .firestore()
            .collection('mail')
            .get()
            .then((mailDocs) => {
              assert.equal(mailDocs.size, 1);
              mailDocs.forEach((mailDoc) => {
                assert.equal(mailDoc.data()?.to, user.email);
                assert.deepEqual(mailDoc.data()?.bccUids, adminList);
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
    snapshot.forEach(async (doc) => {
      await doc.ref.delete();
    });
  });
}

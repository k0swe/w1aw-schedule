import firebaseFunctionsTest from 'firebase-functions-test';
import { newUser } from '../src';
import admin from 'firebase-admin';
import * as assert from 'assert';
import { COLORADO_DOC_ID } from '../src/shared-constants';
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { UserRecord } from 'firebase-admin/auth';
import { deleteCollection } from './helpers';

describe('newUser', () => {
  let test: FeaturesList;
  let user: UserRecord;
  const adminList = ['67890', 'abcde'];

  before(async () => {
    // Initialize firebase-functions-test without a credentials file so the tests can run
    // against the local Firestore emulator. Start the emulator before running tests.
    test = firebaseFunctionsTest({ projectId: 'w1aw-test' });
    user = test.auth.makeUserRecord({
      uid: '12345',
      email: 'test@example.com',
      displayName: 'Test User',
    });
    // Set up test data in sections collection (the function has dual-read logic)
    await admin.firestore().collection('sections').doc(COLORADO_DOC_ID).set({
      admins: adminList,
    });
    await deleteCollection(admin.firestore().collection('users'));
    await deleteCollection(admin.firestore().collection('mail'));
    // firebase-functions-test's typing doesn't match the v2 function type here; cast to any for the test call.
    // beforeUserCreated v2 handler expects an event with a `data` property.
    await (test.wrap(newUser as any) as any)({ data: user });
  });

  it('should set the user approval to provisional', async () => {
    let testComplete = false;
    await admin
      .firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then((userDoc) => {
        assert.equal(userDoc.data()?.status, 'Provisional');
        testComplete = true;
      });
    assert.equal(testComplete, true);
  });

  it('should post an email', async () => {
    let testComplete = false;
    await admin
      .firestore()
      .collection('mail')
      .get()
      .then((mailDocs) => {
        assert.equal(mailDocs.size, 1);
        mailDocs.forEach((mailDoc) => {
          assert.equal(mailDoc.data()?.to, user.email);
          assert.deepEqual(mailDoc.data()?.bccUids, adminList);
          assert.equal(mailDoc.data()?.template.name, 'welcome');
          testComplete = true;
        });
      });
    assert.equal(testComplete, true);
  });

  after(async () => {
    // Do cleanup tasks.
    test.cleanup();
    // Reset the database.
    await deleteCollection(admin.firestore().collection('users'));
    await deleteCollection(admin.firestore().collection('mail'));
  });
});

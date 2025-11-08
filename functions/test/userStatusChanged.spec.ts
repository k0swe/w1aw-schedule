import admin from 'firebase-admin';
import * as assert from 'assert';
import { FeaturesList } from 'firebase-functions-test/lib/features';
import { userStatusChanged } from '../src';
import firebaseFunctionsTest from 'firebase-functions-test';
import { COLORADO_DOC_ID } from '../src/shared-constants';
import { deleteCollection } from './helpers';

describe('userStatusChanged', () => {
  let test: FeaturesList;
  const exampleEmail: string = 'test@example.com';

  beforeEach(async () => {
    // Initialize firebase-functions-test without passing a service account so tests use the emulator.
    test = firebaseFunctionsTest({ projectId: 'w1aw-test' });
    await deleteCollection(admin.firestore().collection('sections'));
  });

  afterEach(async () => {
    await deleteCollection(admin.firestore().collection('sections'));
    test.cleanup();
  });

  it('should send an email when state changes to approved', async () => {
    let testComplete = false;
    const afterSnap = test.firestore.makeDocumentSnapshot(
      { status: 'Approved', email: exampleEmail, callsign: 'T3ST' },
      'users/12345',
    );
    // Invoke the v2-style handler by passing an event with a `data.after` snapshot.
    await (test.wrap(userStatusChanged as any) as any)({
      data: { after: afterSnap },
    }).then(async () => {
      await admin
        .firestore()
        .collection('mail')
        .get()
        .then((mailDocs) => {
          assert.equal(mailDocs.size, 1);
          mailDocs.forEach((mailDoc) => {
            assert.equal(mailDoc.data()?.to, exampleEmail);
            assert.equal(mailDoc.data()?.template.name, 'approved');
            testComplete = true;
          });
        });
    });
    assert.equal(testComplete, true);
  });

  it('should delete reservations when state changes to declined', async () => {
    let testComplete = false;
    await admin
      .firestore()
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection('shifts')
      .doc()
      .set({
        reservedBy: '12345',
        reservedDetails: { callsign: 'Test' },
      });
    const afterSnap = test.firestore.makeDocumentSnapshot(
      { status: 'Declined' },
      'users/12345',
    );
    await (test.wrap(userStatusChanged as any) as any)({
      data: { after: afterSnap },
    }).then(async () => {
      await admin
        .firestore()
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection('shifts')
        .get()
        .then((shiftDocs) => {
          shiftDocs.forEach((shiftDoc) => {
            assert.equal(shiftDoc.data()?.reservedBy, null);
            assert.equal(shiftDoc.data()?.reservedDetails, null);
          });
          testComplete = true;
        });
      assert.equal(testComplete, true);
    });
  });
});

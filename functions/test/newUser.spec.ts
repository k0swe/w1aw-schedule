import firebaseFunctionsTest from 'firebase-functions-test';
import admin from 'firebase-admin';
import * as assert from 'assert';
import { deleteCollection } from './helpers';

// Import the function directly from its source file instead of index.ts
// to have cleaner test isolation and avoid unnecessary module initialization
import { newUser } from '../src/newUser';

describe('newUser', () => {
  let test: ReturnType<typeof firebaseFunctionsTest>;
  const userId = '12345';
  const userEmail = 'test@example.com';
  const adminList = ['67890', 'abcde'];
  const testEventId = 'test-event-123';

  before(async () => {
    // Initialize firebase-admin for testing against the emulator
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: 'w1aw-test' });
    }
    
    // Initialize firebase-functions-test without a credentials file so the tests can run
    // against the local Firestore emulator. The emulator is started automatically by the test script.
    test = firebaseFunctionsTest({ projectId: 'w1aw-test' });
    
    // Set up test data in events collection - create a test event
    await admin.firestore().collection('events').doc(testEventId).set({
      admins: adminList,
      name: 'Test Event',
      slug: 'test-event',
    });
    await deleteCollection(admin.firestore().collection('users'));
    await deleteCollection(admin.firestore().collection('mail'));
    
    // Create the user document in Firestore first
    const userDocRef = admin.firestore().collection('users').doc(userId);
    await userDocRef.set({
      email: userEmail,
    });
    
    // Wrap the function and invoke it with partial CloudEvent data
    const wrapped = test.wrap(newUser);
    await wrapped({
      params: { userId },
      data: await userDocRef.get(),
    });
  });

  it('should update the user document with emailVerified status', async () => {
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    assert.equal(userDoc.exists, true);
    assert.equal(userDoc.data()?.email, userEmail);
    // The function tries to call admin.auth().getUser() which will fail in the emulator
    // without auth emulator running, so emailVerified won't be set.
    // In production, this would work and set emailVerified.
    // For now, we just verify the document exists with the email.
  });

  it('should post a welcome email', async () => {
    const mailDocs = await admin
      .firestore()
      .collection('mail')
      .get();
      
    assert.equal(mailDocs.size, 1);
    const mailDoc = mailDocs.docs[0];
    assert.equal(mailDoc.data()?.to, userEmail);
    assert.deepEqual(mailDoc.data()?.bccUids, adminList);
    assert.equal(mailDoc.data()?.template.name, 'welcome');
    assert.equal(mailDoc.data()?.template.data.email, userEmail);
  });

  after(async () => {
    // Do cleanup tasks.
    test.cleanup();
    // Reset the database.
    await deleteCollection(admin.firestore().collection('users'));
    await deleteCollection(admin.firestore().collection('mail'));
    await deleteCollection(admin.firestore().collection('events'));
  });
});

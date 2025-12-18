import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

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

  // Send welcome email to new user
  await admin
    .firestore()
    .collection('mail')
    .doc()
    .set({
      to: email,
      template: {
        name: 'welcome',
        data: {
          email: email,
        },
      },
    });
});

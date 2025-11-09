import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

/**
 * Callable function to sync email verification status from Firebase Auth to Firestore.
 * This can be called when a user logs in to ensure their verification status is up to date.
 */
export const syncEmailVerification = onCall(async (request) => {
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Get the Firebase Auth user
    const authUser = await admin.auth().getUser(userId);
    const emailVerified = authUser.emailVerified;

    // Update the Firestore document
    await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .update({ emailVerified });

    console.log(
      `Synced email verification for user ${userId}: ${emailVerified}`,
    );

    return { success: true, emailVerified };
  } catch (error) {
    console.error('Error syncing email verification:', error);
    throw new HttpsError('internal', 'Failed to sync email verification');
  }
});

import * as admin from 'firebase-admin';

/**
 * Delete all documents in the given Firestore collection.
 * @param {admin.firestore.CollectionReference} ref the Firestore collection reference
 */
export async function deleteCollection(
  ref: admin.firestore.CollectionReference<admin.firestore.DocumentData>,
) {
  const snapshot = await ref.get();
  const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
  await Promise.all(deletePromises);
}

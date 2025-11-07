import * as admin from 'firebase-admin';

/**
 * Delete all documents in the given Firestore collection.
 * @param {admin.firestore.CollectionReference} ref the Firestore collection reference
 */
export async function deleteCollection(
  ref: admin.firestore.CollectionReference<admin.firestore.DocumentData>,
) {
  await ref.get().then((snapshot) => {
    snapshot.forEach(async (doc) => {
      await doc.ref.delete();
    });
  });
}

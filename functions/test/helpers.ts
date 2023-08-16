/**
 * Delete all documents in the given Firestore collection.
 * @param {FirebaseFirestore.CollectionReference} ref the Firestore collection reference
 */
export async function deleteCollection(
  ref: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>,
) {
  await ref.get().then((snapshot) => {
    snapshot.forEach(async (doc) => {
      await doc.ref.delete();
    });
  });
}

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { validateFirebaseIdToken } from './validateFirebaseToken';
import * as admin from 'firebase-admin';
import { COLORADO_DOC_ID, SectionInfo } from './shared-constants';

/**
 * Get the section info from Firestore.
 */
async function getSectionInfo() {
  const sectionInfoSnapshot = await admin
    .firestore()
    .collection('sections')
    .doc(COLORADO_DOC_ID)
    .get();
  return sectionInfoSnapshot.data() as SectionInfo;
}

export const deleteUser = onRequest({ cors: true }, async (request, response) => {
  const deleteUid: string | undefined = request.query.uid?.toString();
  logger.info({ query: request.query });
  if (!deleteUid) {
    response.status(400).send({ error: 'Bad request' });
    return;
  }
  const token = await validateFirebaseIdToken(request, response);
  if (!token) {
    response.status(403).send({ error: 'Unauthorized' });
    return;
  }

  const sectionInfo = await getSectionInfo();
  const userDeletingSelf = token.uid === deleteUid;
  const adminRequest = sectionInfo.admins.find((a) => a === token.uid);
  if (userDeletingSelf) {
    logger.info({
      message: 'User deleting self',
      uid: token.uid,
    });
  } else if (adminRequest) {
    logger.info({
      message: 'Admin deleting user',
      admin: token.uid,
      user: deleteUid,
    });
  } else {
    response.status(403).send({ error: 'Unauthorized' });
    return;
  }

  try {
    await admin.firestore().collection('users').doc(deleteUid).delete();
    await admin.auth().deleteUser(deleteUid);
  } catch (e) {
    logger.error(e);
    response.status(500).send({ error: 'Internal server error' });
    return;
  }

  response.send({ deleted: deleteUid });
});



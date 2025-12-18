import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { validateFirebaseIdToken } from './validateFirebaseToken';
import * as admin from 'firebase-admin';

export const deleteUser = onRequest(
  { cors: true },
  async (request, response) => {
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

    // Only allow users to delete themselves
    const userDeletingSelf = token.uid === deleteUid;

    if (!userDeletingSelf) {
      logger.warn({
        message: 'Unauthorized deletion attempt',
        requestingUser: token.uid,
        targetUser: deleteUid,
      });
      response.status(403).send({ error: 'Unauthorized' });
      return;
    }

    logger.info({
      message: 'User deleting self',
      uid: token.uid,
    });

    try {
      await admin.firestore().collection('users').doc(deleteUid).delete();
      await admin.auth().deleteUser(deleteUid);
    } catch (e) {
      logger.error(e);
      response.status(500).send({ error: 'Internal server error' });
      return;
    }

    response.send({ deleted: deleteUid });
  },
);

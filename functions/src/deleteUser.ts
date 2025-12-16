import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { validateFirebaseIdToken } from './validateFirebaseToken';
import * as admin from 'firebase-admin';
import { EventInfo } from 'w1aw-schedule-shared';

/**
 * Get all event infos from Firestore.
 */
async function getAllEventInfos(): Promise<EventInfo[]> {
  const eventsSnapshot = await admin.firestore().collection('events').get();
  return eventsSnapshot.docs.map((doc) => doc.data() as EventInfo);
}

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

    const eventInfos = await getAllEventInfos();
    const userDeletingSelf = token.uid === deleteUid;
    
    // Check if user is admin in ANY event
    const isAdminInAnyEvent = eventInfos.some((eventInfo) =>
      eventInfo.admins.includes(token.uid)
    );

    if (userDeletingSelf) {
      logger.info({
        message: 'User deleting self',
        uid: token.uid,
      });
    } else if (isAdminInAnyEvent) {
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
  },
);

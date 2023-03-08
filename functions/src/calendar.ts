import * as functions from 'firebase-functions';
import { constants as httpConstants } from 'http2';
import ical from 'ical-generator';
import * as admin from 'firebase-admin';
import { COLORADO_DOC_ID } from './shared-constants';
import * as getUuid from 'uuid-by-string';

export const calendar = functions.https.onRequest(async (request, response) => {
  const uid = request.query.uid?.toString();
  if (!uid) {
    response.status(httpConstants.HTTP_STATUS_BAD_REQUEST);
    response.send('No uid provided');
    return;
  }

  const stationSnapshot = await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .get();
  if (!stationSnapshot.exists) {
    response.status(httpConstants.HTTP_STATUS_BAD_REQUEST);
    response.send('No station found for uid');
    return;
  }

  const shiftsQuerySnapshot = await admin
    .firestore()
    .collection('sections')
    .doc(COLORADO_DOC_ID)
    .collection('shifts')
    .where('reservedBy', '==', uid)
    .get();

  const calendar = ical({
    name: `W1AW/0 schedule for ${stationSnapshot.data()?.callsign}`,
  });
  shiftsQuerySnapshot.forEach((doc) => {
    calendar.createEvent({
      id: getUuid(doc.id),
      start: doc.data().time.toDate(),
      end: new Date(doc.data().time.toDate().getTime() + 2 * 60 * 60 * 1000),
      summary: `Operate W1AW/0 on ${doc.data().band}m ${doc.data().mode}`,
    });
  });
  response.setHeader('content-type', 'text/calendar');
  response.send(calendar.toString());
});

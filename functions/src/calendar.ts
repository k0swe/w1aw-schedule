import { onRequest } from 'firebase-functions/v2/https';
import { constants as httpConstants } from 'http2';
import ical from 'ical-generator';
import * as admin from 'firebase-admin';
import getUuid from 'uuid-by-string';

export const calendar = onRequest(async (request, response) => {
  // Require eventId query parameter
  const eventId = request.query.eventId?.toString();
  if (!eventId) {
    response.status(httpConstants.HTTP_STATUS_BAD_REQUEST);
    response.send('eventId query parameter is required');
    return;
  }
  
  let title = 'W1AW schedule';

  const uid = request.query.uid?.toString();
  if (uid) {
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
    title += ` for ${stationSnapshot.data()?.callsign}`;
  }

  const eventsShiftsCollection = admin
    .firestore()
    .collection('events')
    .doc(eventId)
    .collection('shifts');
  let eventsQuery: admin.firestore.Query<admin.firestore.DocumentData>;
  if (uid) {
    eventsQuery = eventsShiftsCollection.where('reservedBy', '==', uid);
  } else {
    eventsQuery = eventsShiftsCollection.where('reservedBy', '!=', null);
  }
  const shiftsQuerySnapshot = await eventsQuery.get();

  const calendar = ical({
    name: title,
  });
  shiftsQuerySnapshot.forEach((doc) => {
    calendar.createEvent({
      id: getUuid(doc.id),
      start: doc.data().time.toDate(),
      end: new Date(doc.data().time.toDate().getTime() + 2 * 60 * 60 * 1000),
      summary: `${doc.data().reservedDetails.callsign} operate W1AW/0 on ${
        doc.data().band
      }m ${doc.data().mode}`,
    });
  });
  response.setHeader('content-type', 'text/calendar');
  response.send(calendar.toString());
});

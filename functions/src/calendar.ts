import { onRequest } from 'firebase-functions/v2/https';
import { constants as httpConstants } from 'http2';
import ical from 'ical-generator';
import * as admin from 'firebase-admin';
import { EventInfo } from 'w1aw-schedule-shared';
import getUuid from 'uuid-by-string';

export const calendar = onRequest(async (request, response) => {
  // Require eventId query parameter
  const eventId = request.query.eventId?.toString();
  if (!eventId) {
    response.status(httpConstants.HTTP_STATUS_BAD_REQUEST);
    response.send('eventId query parameter is required');
    return;
  }
  
  // Fetch event info to get the event name
  const eventDoc = await admin
    .firestore()
    .collection('events')
    .doc(eventId)
    .get();
  
  if (!eventDoc.exists) {
    response.status(httpConstants.HTTP_STATUS_NOT_FOUND);
    response.send('Event not found');
    return;
  }
  
  const eventInfo = eventDoc.data() as EventInfo;
  let title = `${eventInfo.name} schedule`;

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
      summary: `${doc.data().reservedDetails.callsign} operate ${eventInfo.eventCallsign} on ${
        doc.data().band
      }m ${doc.data().mode}`,
    });
  });
  response.setHeader('content-type', 'text/calendar');
  response.send(calendar.toString());
});

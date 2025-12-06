import { onRequest } from 'firebase-functions/v2/https';
import { constants as httpConstants } from 'http2';
import ical from 'ical-generator';
import * as admin from 'firebase-admin';
import { COLORADO_DOC_ID } from './shared-constants';
import getUuid from 'uuid-by-string';

export const calendar = onRequest(async (request, response) => {
  let title = 'W1AW/0 Colorado schedule';

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

  // TODO: Remove dual-read logic after Firestore collection rename migration is complete
  // Try reading from 'events' collection first, fall back to 'sections' collection
  let shiftsQuerySnapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>;
  
  try {
    const eventsShiftsCollection = admin
      .firestore()
      .collection('events')
      .doc(COLORADO_DOC_ID)
      .collection('shifts');
    let eventsQuery: admin.firestore.Query<admin.firestore.DocumentData>;
    if (uid) {
      eventsQuery = eventsShiftsCollection.where('reservedBy', '==', uid);
    } else {
      eventsQuery = eventsShiftsCollection.where('reservedBy', '!=', null);
    }
    shiftsQuerySnapshot = await eventsQuery.get();
    
    // If no data in events collection, fall back to sections
    if (shiftsQuerySnapshot.empty) {
      throw new Error('No data in events collection');
    }
  } catch (error) {
    // Fallback to legacy 'sections' collection
    const sectionsShiftsCollection = admin
      .firestore()
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection('shifts');
    let sectionsQuery: admin.firestore.Query<admin.firestore.DocumentData>;
    if (uid) {
      sectionsQuery = sectionsShiftsCollection.where('reservedBy', '==', uid);
    } else {
      sectionsQuery = sectionsShiftsCollection.where('reservedBy', '!=', null);
    }
    shiftsQuerySnapshot = await sectionsQuery.get();
  }

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

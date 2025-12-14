import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';

import {
  BANDS,
  COLORADO_DOC_ID,
  MODES,
  Shift,
  shiftId,
  TWO_HOURS_IN_MS,
} from './shared-constants';
import { validateFirebaseIdToken } from './validateFirebaseToken';

export const initShifts = onRequest(
  { memory: '512MiB', timeoutSeconds: 540, cors: true },
  async (request, response) => {
    const userId = await validateFirebaseIdToken(request, response);
    if (!userId || userId.uid !== 'VAfZAw8GhJQodyTTCkXgilbqvoM2') {
      return;
    }
    logger.info('Validated user', userId.uid);

    // Accept eventId query parameter, default to Colorado event for backward compatibility
    const eventId = request.query.eventId?.toString() || COLORADO_DOC_ID;
    logger.info('Initializing shifts for event', eventId);

    // Get event info to retrieve startTime and endTime
    const eventDoc = await admin
      .firestore()
      .collection('events')
      .doc(eventId)
      .get();

    if (!eventDoc.exists) {
      response.status(404).send({ error: 'Event not found' });
      return;
    }

    const eventData = eventDoc.data();
    const startTime = eventData?.startTime?.toDate() || new Date('2026-05-27T00:00:00Z');
    const endTime = eventData?.endTime?.toDate() || new Date('2026-06-02T23:59:59Z');

    const timeSlots = calcTimeSlots(startTime, endTime);

    const shifts: Array<Shift> = [];
    timeSlots.forEach((timeslot) =>
      BANDS.forEach((band) =>
        MODES.forEach((mode) =>
          shifts.push({
            time: Timestamp.fromDate(timeslot),
            band: band,
            mode: mode,
            reservedBy: null,
            reservedDetails: null,
          }),
        ),
      ),
    );
    logger.info('Generated shifts', { count: shifts.length });

    const hashedShifts = new Map<string, object>();
    shifts.forEach((shift) => hashedShifts.set(shiftId(shift), shift));

    const coloradoEventsShifts = admin
      .firestore()
      .collection('events')
      .doc(eventId)
      .collection('shifts');

    // Batch writes to reduce memory usage
    const BATCH_SIZE = 500;
    const entries = Array.from(hashedShifts.entries());
    let totalWritten = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const writePromises: Array<Promise<FirebaseFirestore.WriteResult>> = [];

      batch.forEach(([hash, shift]) => {
        writePromises.push(coloradoEventsShifts.doc(hash).set(shift));
      });

      await Promise.all(writePromises);
      totalWritten += batch.length;
      logger.info(
        `Batch progress: ${totalWritten} / ${entries.length} shifts saved`,
      );
    }

    logger.info('All shifts saved to Firestore events collection');
    response.send({ shiftCount: hashedShifts.size });
  },
);

const calcTimeSlots = (startTime: Date, endTime: Date): Array<Date> => {
  const timeSlots: Array<Date> = [];
  let currentTimeSlot = startTime;
  while (currentTimeSlot < endTime) {
    timeSlots.push(currentTimeSlot);
    currentTimeSlot = new Date(currentTimeSlot.getTime() + TWO_HOURS_IN_MS);
  }
  return timeSlots;
};

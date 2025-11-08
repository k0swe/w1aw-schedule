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
  TIME_SLOTS_END,
  TIME_SLOTS_START,
  TWO_HOURS_IN_MS,
} from './shared-constants';
import { validateFirebaseIdToken } from './validateFirebaseToken';

export const initShifts = onRequest(
  { memory: '512MiB', timeoutSeconds: 540 },
  async (request, response) => {
  const userId = await validateFirebaseIdToken(request, response);
  if (!userId || userId.uid !== 'VAfZAw8GhJQodyTTCkXgilbqvoM2') {
    return;
  }
  logger.info('Validated user', userId.uid);

  const timeSlots = calcTimeSlots();

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

  const coloradoShifts = admin
    .firestore()
    .collection('sections')
    .doc(COLORADO_DOC_ID)
    .collection('shifts');

  // Batch writes to reduce memory usage
  const BATCH_SIZE = 500;
  const entries = Array.from(hashedShifts.entries());
  let totalWritten = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const writePromises: Array<Promise<FirebaseFirestore.WriteResult>> = [];

    batch.forEach(([hash, shift]) => {
      writePromises.push(coloradoShifts.doc(hash).set(shift));
    });

    await Promise.all(writePromises);
    totalWritten += batch.length;
    logger.info(`Batch progress: ${totalWritten} / ${entries.length} shifts saved`);
  }

  logger.info('All shifts saved to Firestore');
  response.send({ shiftCount: hashedShifts.size });
});

const calcTimeSlots = (): Array<Date> => {
  const timeSlots: Array<Date> = [];
  let currentTimeSlot = TIME_SLOTS_START;
  while (currentTimeSlot < TIME_SLOTS_END) {
    timeSlots.push(currentTimeSlot);
    currentTimeSlot = new Date(currentTimeSlot.getTime() + TWO_HOURS_IN_MS);
  }
  return timeSlots;
};

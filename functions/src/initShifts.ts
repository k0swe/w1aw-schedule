import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import {
  BANDS,
  COLORADO_DOC_ID,
  MODES,
  Shift,
  TIME_SLOTS_END,
  TIME_SLOTS_START,
  TWO_HOURS_IN_MS,
  shiftId,
} from './shared-constants';
import { validateFirebaseIdToken } from './validateFirebaseToken';

admin.initializeApp();

export const initShifts = functions.https.onRequest((request, response) => {
  const userId = validateFirebaseIdToken(request, response);
  if (!userId) {
    return;
  }
  functions.logger.info('Validated user', { userId });

  const timeSlots = calcTimeSlots();

  const shifts: Array<Shift> = [];
  timeSlots.forEach((timeslot) =>
    BANDS.forEach((band) =>
      MODES.forEach((mode) =>
        shifts.push({
          time: timeslot,
          band: band,
          mode: mode,
          reservedBy: null,
        })
      )
    )
  );
  functions.logger.info('Generated shifts', { count: shifts.length });

  const hashedShifts = new Map<string, object>();
  shifts.forEach((shift) => hashedShifts.set(shiftId(shift), shift));

  const coloradoShifts = admin
    .firestore()
    .collection('sections')
    .doc(COLORADO_DOC_ID)
    .collection('shifts');

  hashedShifts.forEach((shift, hash) => {
    coloradoShifts.doc(hash).set(shift);
  });
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

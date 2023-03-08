import * as admin from 'firebase-admin';
import { firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';

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
import Timestamp = firestore.Timestamp;

export const initShifts = functions.https.onRequest(
  async (request, response) => {
    const userId = await validateFirebaseIdToken(request, response);
    if (!userId || userId.uid !== 'r9qBLFDsymTyrWb3vtJmhZlDPMy1') {
      return;
    }
    functions.logger.info('Validated user', userId.uid);

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
  }
);

const calcTimeSlots = (): Array<Date> => {
  const timeSlots: Array<Date> = [];
  let currentTimeSlot = TIME_SLOTS_START;
  while (currentTimeSlot < TIME_SLOTS_END) {
    timeSlots.push(currentTimeSlot);
    currentTimeSlot = new Date(currentTimeSlot.getTime() + TWO_HOURS_IN_MS);
  }
  return timeSlots;
};

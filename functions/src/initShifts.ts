import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import { validateFirebaseIdToken } from './validateFirebaseToken';

admin.initializeApp();
const TWO_HOURS_IN_MS: number = 2 * 60 * 60 * 1000;
const TIME_SLOTS_START = new Date('2023-05-24T00:00:00Z');
const TIME_SLOTS_END = new Date('2023-05-30T23:59:59Z');
const MODES = ['phone', 'cw', 'digital'];
const BANDS = [
  '160',
  '80',
  '40',
  '20',
  '15',
  '10',
  '6',
  '2',
  '1.25',
  '0.7',
  '0.33',
  '0.23',
  '0.13',
  '0.05',
  '0.03',
];

const djb2Hash = (str: string): string => {
  const len = str.length;
  let h = 5381;
  for (let i = 0; i < len; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
};

const calcTimeSlots = (): Array<Date> => {
  const timeSlots: Array<Date> = [];
  let currentTimeSlot = TIME_SLOTS_START;
  while (currentTimeSlot < TIME_SLOTS_END) {
    timeSlots.push(currentTimeSlot);
    currentTimeSlot = new Date(currentTimeSlot.getTime() + TWO_HOURS_IN_MS);
  }
  return timeSlots;
};

export const initShifts = functions.https.onRequest((request, response) => {
  const userId = validateFirebaseIdToken(request, response);
  if (!userId) {
    return;
  }
  functions.logger.info('Validated user', { userId });

  const timeSlots = calcTimeSlots();

  const shifts: Array<object> = [];
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
  shifts.forEach((shift) =>
    hashedShifts.set(djb2Hash(JSON.stringify(shift)), shift)
  );

  const coloradoShifts = admin
    .firestore()
    .collection('sections')
    .doc('jZbFyscc23zjkEGRuPAI') // colorado
    .collection('shifts');

  hashedShifts.forEach((shift, hash) => {
    coloradoShifts.doc(hash).set(shift);
  });
  response.send({ shiftCount: hashedShifts.size });
});

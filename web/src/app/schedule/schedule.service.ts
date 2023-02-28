import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Timestamp } from 'firebase/firestore';
import { Observable, of } from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';

import { UserSettings } from '../user-settings/user-settings.service';
import { COLORADO_DOC_ID, Shift, shiftId } from './shared-constants';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  constructor(private firestore: AngularFirestore) {}

  public findShift(
    time: Date,
    band: string,
    mode: string
  ): Observable<Shift | undefined> {
    const ts = Timestamp.fromDate(time);
    const sid = shiftId({ time: ts, band, mode, reservedBy: null });
    return this.firestore
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection<Shift>('shifts')
      .doc(sid)
      .valueChanges();
  }

  reserveShift(
    shiftToUpdate: Shift,
    userId: string,
    userDetails: UserSettings
  ): Observable<void> {
    if (!!shiftToUpdate.reservedBy) {
      // trying to take someone else's shift?
      return of(undefined);
    }
    const sid = shiftId({
      time: shiftToUpdate.time,
      band: shiftToUpdate.band,
      mode: shiftToUpdate.mode,
    });
    return fromPromise(
      this.firestore
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection<Shift>('shifts')
        .doc(sid)
        .update({ reservedBy: userId, reservedDetails: userDetails })
    );
  }

  cancelShift(shiftToUpdate: Shift, userId: string): Observable<void> {
    if (shiftToUpdate.reservedBy != userId) {
      // trying to cancel someone else's shift?
      return of(undefined);
    }
    const sid = shiftId({
      time: shiftToUpdate.time,
      band: shiftToUpdate.band,
      mode: shiftToUpdate.mode,
    });
    return fromPromise(
      this.firestore
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection<Shift>('shifts')
        .doc(sid)
        .update({ reservedBy: null, reservedDetails: null })
    );
  }

  findUserShifts(uid: string): Observable<Shift[]> {
    return this.firestore
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection<Shift>('shifts', (ref) => ref.where('reservedBy', '==', uid))
      .valueChanges();
  }
}

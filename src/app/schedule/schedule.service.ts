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

  public get(): Observable<Shift[]> {
    return this.firestore
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection<Shift>('shifts')
      .valueChanges();
  }

  public findShift(
    time: Date,
    band: string,
    mode: string
  ): Observable<Shift | undefined> {
    const ts = Timestamp.fromDate(time);
    const sid = shiftId({ time: ts, band, mode, reservedBy: null });
    let obs = this.firestore
      .collection('sections')
      .doc(COLORADO_DOC_ID)
      .collection<Shift>('shifts')
      .doc(sid)
      .valueChanges();
    return obs;
  }

  cancelShift(thisShift: Shift, thisUser: UserSettings): Observable<void> {
    if (thisShift.reservedBy?.callsign != thisUser.callsign) {
      // trying to cancel someone else's shift?
      // TODO: client side security
      return of(undefined);
    }
    const sid = shiftId({
      time: thisShift.time,
      band: thisShift.band,
      mode: thisShift.mode,
      reservedBy: null,
    });
    return fromPromise(
      this.firestore
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection<Shift>('shifts')
        .doc(sid)
        .update({ reservedBy: null })
    );
  }

  reserveShift(thisShift: Shift, thisUser: UserSettings) {
    if (!!thisShift.reservedBy) {
      // trying to take someone else's shift?
      // TODO: client side security
      return of(undefined);
    }
    const sid = shiftId({
      time: thisShift.time,
      band: thisShift.band,
      mode: thisShift.mode,
      reservedBy: null,
    });
    return fromPromise(
      this.firestore
        .collection('sections')
        .doc(COLORADO_DOC_ID)
        .collection<Shift>('shifts')
        .doc(sid)
        .update({ reservedBy: thisUser })
    );
  }
}

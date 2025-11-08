import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  doc,
  docData,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { from } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { UserSettings } from '../user-settings/user-settings.service';
import { COLORADO_DOC_ID, Shift, shiftId } from './shared-constants';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private firestore = inject(Firestore);
  private authenticationService = inject(AuthenticationService);

  public findShift(
    time: Date,
    band: string,
    mode: string,
  ): Observable<Shift | undefined> {
    const ts = Timestamp.fromDate(time);
    const sid = shiftId({ time: ts, band, mode, reservedBy: null });
    const docRef = doc(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    return docData(docRef) as Observable<Shift | undefined>;
  }

  reserveShift(
    shiftToUpdate: Shift,
    userId: string,
    userDetails: UserSettings,
  ): Observable<void> {
    if (
      !!shiftToUpdate.reservedBy &&
      !this.authenticationService.userIsAdmin()
    ) {
      // trying to take someone else's shift?
      return of(undefined);
    }
    const sid = shiftId({
      time: shiftToUpdate.time,
      band: shiftToUpdate.band,
      mode: shiftToUpdate.mode,
    });
    const docRef = doc(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    return from(
      updateDoc(docRef, { reservedBy: userId, reservedDetails: userDetails }),
    );
  }

  cancelShift(shiftToUpdate: Shift, userId: string): Observable<void> {
    if (
      shiftToUpdate.reservedBy != userId &&
      !this.authenticationService.userIsAdmin()
    ) {
      // trying to cancel someone else's shift?
      return of(undefined);
    }
    const sid = shiftId({
      time: shiftToUpdate.time,
      band: shiftToUpdate.band,
      mode: shiftToUpdate.mode,
    });
    const docRef = doc(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    return from(updateDoc(docRef, { reservedBy: null, reservedDetails: null }));
  }

  findUserShifts(uid: string): Observable<Shift[]> {
    const shiftsCol = collection(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
    );
    const q = query(shiftsCol, where('reservedBy', '==', uid));
    return collectionData(q) as Observable<Shift[]>;
  }
}

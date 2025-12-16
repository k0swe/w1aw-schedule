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
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';
import { UserSettings } from '../user-settings/user-settings.service';
import { Shift, shiftId } from 'w1aw-schedule-shared';

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
    eventId: string,
  ): Observable<Shift | undefined> {
    const ts = Timestamp.fromDate(time);
    const sid = shiftId({ time: ts, band, mode, reservedBy: null });
    const eventsDocRef = doc(this.firestore, 'events', eventId, 'shifts', sid);
    return docData(eventsDocRef) as Observable<Shift | undefined>;
  }

  reserveShift(
    shiftToUpdate: Shift,
    userId: string,
    userDetails: UserSettings,
    eventId: string,
  ): Observable<void> {
    return this.authenticationService.userIsAdmin(eventId).pipe(
      switchMap((isAdmin) => {
        if (!!shiftToUpdate.reservedBy && !isAdmin) {
          // trying to take someone else's shift?
          return of(undefined);
        }
        const sid = shiftId({
          time: shiftToUpdate.time,
          band: shiftToUpdate.band,
          mode: shiftToUpdate.mode,
        });
        const eventsDocRef = doc(this.firestore, 'events', eventId, 'shifts', sid);
        const reservationUpdate = {
          reservedBy: userId,
          reservedDetails: userDetails,
        };

        return from(updateDoc(eventsDocRef, reservationUpdate).then(() => undefined)).pipe(
          catchError((error) => {
            console.error('Error reserving shift (shift may not exist):', error);
            return of(undefined);
          })
        );
      })
    );
  }

  cancelShift(
    shiftToUpdate: Shift,
    userId: string,
    eventId: string,
  ): Observable<void> {
    return this.authenticationService.userIsAdmin(eventId).pipe(
      switchMap((isAdmin) => {
        if (shiftToUpdate.reservedBy !== userId && !isAdmin) {
          // trying to cancel someone else's shift?
          return of(undefined);
        }
        const sid = shiftId({
          time: shiftToUpdate.time,
          band: shiftToUpdate.band,
          mode: shiftToUpdate.mode,
        });
        const eventsDocRef = doc(this.firestore, 'events', eventId, 'shifts', sid);
        const updateData = { reservedBy: null, reservedDetails: null };

        return from(updateDoc(eventsDocRef, updateData).then(() => undefined));
      })
    );
  }

  findUserShifts(
    uid: string,
    eventId: string,
  ): Observable<Shift[]> {
    const eventsShiftsCol = collection(
      this.firestore,
      'events',
      eventId,
      'shifts',
    );
    const eventsQuery = query(eventsShiftsCol, where('reservedBy', '==', uid));

    return collectionData(eventsQuery) as Observable<Shift[]>;
  }
}

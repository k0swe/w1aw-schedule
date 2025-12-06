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
import { catchError } from 'rxjs/operators';

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
    // TODO: Remove dual-read logic after Firestore collection rename migration is complete
    // Try reading from 'events' collection first, fall back to 'sections' collection
    const eventsDocRef = doc(
      this.firestore,
      'events',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    return (docData(eventsDocRef) as Observable<Shift | undefined>).pipe(
      catchError(() => {
        // Fallback to legacy 'sections' collection
        const sectionsDocRef = doc(
          this.firestore,
          'sections',
          COLORADO_DOC_ID,
          'shifts',
          sid,
        );
        return docData(sectionsDocRef) as Observable<Shift | undefined>;
      }),
    );
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
    // TODO: Remove dual-write logic after Firestore collection rename migration is complete
    // Write to both 'sections' (legacy) and 'events' (new) collections during migration
    const sectionsDocRef = doc(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    const eventsDocRef = doc(
      this.firestore,
      'events',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    const updateData = { reservedBy: userId, reservedDetails: userDetails };
    
    return from(
      Promise.all([
        updateDoc(sectionsDocRef, updateData).catch((error) => {
          // TODO: Remove after migration - suppress errors during dual-write to handle missing collections
          console.warn('Failed to update sections collection:', error);
        }),
        updateDoc(eventsDocRef, updateData).catch((error) => {
          // TODO: Remove after migration - suppress errors during dual-write to handle missing collections
          console.warn('Failed to update events collection:', error);
        }),
      ]).then(() => undefined),
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
    // TODO: Remove dual-write logic after Firestore collection rename migration is complete
    // Write to both 'sections' (legacy) and 'events' (new) collections during migration
    const sectionsDocRef = doc(
      this.firestore,
      'sections',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    const eventsDocRef = doc(
      this.firestore,
      'events',
      COLORADO_DOC_ID,
      'shifts',
      sid,
    );
    const updateData = { reservedBy: null, reservedDetails: null };
    
    return from(
      Promise.all([
        updateDoc(sectionsDocRef, updateData).catch((error) => {
          // TODO: Remove after migration - suppress errors during dual-write to handle missing collections
          console.warn('Failed to update sections collection:', error);
        }),
        updateDoc(eventsDocRef, updateData).catch((error) => {
          // TODO: Remove after migration - suppress errors during dual-write to handle missing collections
          console.warn('Failed to update events collection:', error);
        }),
      ]).then(() => undefined),
    );
  }

  findUserShifts(uid: string): Observable<Shift[]> {
    // TODO: Remove dual-read logic after Firestore collection rename migration is complete
    // Try reading from 'events' collection first, fall back to 'sections' collection
    const eventsShiftsCol = collection(
      this.firestore,
      'events',
      COLORADO_DOC_ID,
      'shifts',
    );
    const eventsQuery = query(eventsShiftsCol, where('reservedBy', '==', uid));
    
    return (collectionData(eventsQuery) as Observable<Shift[]>).pipe(
      catchError(() => {
        // Fallback to legacy 'sections' collection
        const sectionsShiftsCol = collection(
          this.firestore,
          'sections',
          COLORADO_DOC_ID,
          'shifts',
        );
        const sectionsQuery = query(sectionsShiftsCol, where('reservedBy', '==', uid));
        return collectionData(sectionsQuery) as Observable<Shift[]>;
      }),
    );
  }
}

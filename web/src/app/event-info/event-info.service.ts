import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { COLORADO_DOC_ID, EventInfo } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class EventInfoService {
  private firestore = inject(Firestore);

  public getAdminList(): Observable<string[]> {
    // TODO: Remove dual-read logic after Firestore collection rename migration is complete
    // Try reading from 'events' collection first, fall back to 'sections' collection
    const eventsDocRef = doc(this.firestore, 'events', COLORADO_DOC_ID);
    return docData(eventsDocRef).pipe(
      catchError(() => {
        // Fallback to legacy 'sections' collection
        const sectionsDocRef = doc(this.firestore, 'sections', COLORADO_DOC_ID);
        return docData(sectionsDocRef);
      }),
      map((eventInfo) => (eventInfo as EventInfo)?.admins || []),
    );
  }
}

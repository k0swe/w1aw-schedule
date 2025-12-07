import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { COLORADO_DOC_ID, EventInfo } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class EventInfoService {
  private firestore = inject(Firestore);

  public getAdminList(eventId: string = COLORADO_DOC_ID): Observable<string[]> {
    const eventsDocRef = doc(this.firestore, 'events', eventId);
    return docData(eventsDocRef).pipe(
      map((eventInfo) => (eventInfo as EventInfo)?.admins || []),
    );
  }
}

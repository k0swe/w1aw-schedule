import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { EventInfo, EventInfoWithId } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class EventInfoService {
  private firestore = inject(Firestore);

  public getAdminList(eventId: string): Observable<string[]> {
    const eventsDocRef = doc(this.firestore, 'events', eventId);
    return docData(eventsDocRef).pipe(
      map((eventInfo) => (eventInfo as EventInfo)?.admins || []),
    );
  }

  public getEventInfo(eventId: string): Observable<EventInfo | undefined> {
    const eventsDocRef = doc(this.firestore, 'events', eventId);
    return docData(eventsDocRef) as Observable<EventInfo | undefined>;
  }

  public getEventBySlug(slug: string): Observable<EventInfoWithId | undefined> {
    const eventsCol = collection(this.firestore, 'events');
    const eventsQuery = query(eventsCol, where('slug', '==', slug), limit(1));
    return collectionData(eventsQuery, { idField: 'id' }).pipe(
      map((events) => events[0] as EventInfoWithId | undefined),
    );
  }
}

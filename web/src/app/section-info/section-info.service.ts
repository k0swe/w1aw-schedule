import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { COLORADO_DOC_ID } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class SectionInfoService {
  private firestore = inject(Firestore);

  public getAdminList(): Observable<string[]> {
    const docRef = doc(this.firestore, 'sections', COLORADO_DOC_ID);
    return docData(docRef).pipe(
      map((sectionInfo) => (sectionInfo as SectionInfo)?.admins || []),
    );
  }
}

interface SectionInfo {
  name: string;
  coordinatorName: string;
  coordinatorCallsign: string;
  admins: string[];
}

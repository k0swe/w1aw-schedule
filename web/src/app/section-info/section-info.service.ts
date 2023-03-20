import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { COLORADO_DOC_ID } from '../schedule/shared-constants';

@Injectable({
  providedIn: 'root',
})
export class SectionInfoService {
  constructor(private firestore: AngularFirestore) {}

  public getAdminList(): Observable<string[]> {
    return this.firestore
      .collection('sections')
      .doc<SectionInfo>(COLORADO_DOC_ID)
      .valueChanges()
      .pipe(map((sectionInfo) => sectionInfo?.admins || []));
  }
}

interface SectionInfo {
  name: string;
  coordinatorName: string;
  coordinatorCallsign: string;
  admins: string[];
}

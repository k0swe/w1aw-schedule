import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { COLORADO_DOC_ID } from '../schedule/shared-constants';
import { map } from 'rxjs/operators';

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

import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';

import { UserSettings } from '../user-settings/user-settings.service';
import { shiftId } from './shared-constants';

const coloradoDocId = 'jZbFyscc23zjkEGRuPAI';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  constructor(private firestore: AngularFirestore) {}

  public get(): Observable<Shift[]> {
    return this.firestore
      .collection('sections')
      .doc(coloradoDocId)
      .collection<Shift>('shifts')
      .valueChanges();
  }

  public findShift(
    time: Date,
    band: string,
    mode: string
  ): Observable<Shift | undefined> {
    const sid = shiftId({ time, band, mode, reservedBy: null });
    let obs = this.firestore
      .collection('sections')
      .doc(coloradoDocId)
      .collection<Shift>('shifts')
      .doc(sid)
      .valueChanges();
    return obs;
  }
}

export interface Shift {
  time: Date;
  band: string;
  mode: string;
  reservedBy: UserSettings;
}

import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, map } from 'rxjs';

import { UserSettings } from '../user-settings/user-settings.service';

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
    return this.firestore
      .collection('sections')
      .doc(coloradoDocId)
      .collection<Shift>('shifts', (ref) => ref.where('time', '==', time))
      .valueChanges()
      .pipe(
        map((shifts) => shifts.find((s) => s.band == band && s.mode == mode))
      );
  }
}

export interface Shift {
  time: Date;
  band: string;
  mode: string;
  reservedBy: UserSettings;
}

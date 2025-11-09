import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, from, mergeMap, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';

@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  private authService = inject(AuthenticationService);
  private firestore = inject(Firestore);
  private httpClient = inject(HttpClient);

  settings$ = new BehaviorSubject<UserSettings>({});
  started = false;

  public init(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.authService.user$
      .pipe(
        switchMap((user) => {
          if (user == null) {
            return of(undefined);
          }
          const docRef = doc(this.firestore, 'users', user.uid);
          return docData(docRef) as Observable<UserSettings | undefined>;
        }),
      )
      .subscribe((settings) => {
        if (settings) {
          this.settings$.next(settings);
        } else {
          this.createUserDocument();
        }
      });
  }

  private createUserDocument(): void {
    const u = this.authService.user$.getValue();
    if (!u) {
      return;
    }
    const docRef = doc(this.firestore, 'users', u.uid);
    setDoc(docRef, {
      email: u.email || '',
      name: u.displayName || '',
      status: 'Provisional',
    });
  }

  public settings(): Observable<UserSettings> {
    return this.settings$;
  }

  set(values: UserSettings): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (user == null) {
          return of(undefined);
        }
        const docRef = doc(this.firestore, 'users', user.uid);
        return from(updateDoc(docRef, { ...values }));
      }),
    );
  }

  // Admin only
  public getProvisionalUsers(): Observable<UserSettings[]> {
    return this.getUsersByStatus('Provisional');
  }

  // Admin only
  public getApprovedUsers(): Observable<UserSettings[]> {
    return this.getUsersByStatus('Approved');
  }

  // Admin only
  public getDeclinedUsers(): Observable<UserSettings[]> {
    return this.getUsersByStatus('Declined');
  }

  private getUsersByStatus(status: string): Observable<UserSettings[]> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, where('status', '==', status));
    return collectionData(q, { idField: 'id' }) as Observable<UserSettings[]>;
  }

  // Admin only
  public approve(userId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        status: 'Approved',
        approvedBy: adminId,
      }),
    );
  }

  // Admin only
  public decline(userId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        status: 'Declined',
        declinedBy: adminId,
      }),
    );
  }

  delete(userId: string): Observable<any> {
    // Call cloud function to delete user
    const url = `${environment.functionBase}/deleteUser?uid=${userId}`;
    return from(this.authService.user$.getValue()!.getIdToken(false)).pipe(
      mergeMap((jwt) => {
        return this.httpClient.post(url, null, {
          headers: { Authorization: 'Bearer ' + jwt },
        });
      }),
    );
  }

  setMultiShift(userId: string, newValue: boolean) {
    const docRef = doc(this.firestore, 'users', userId);
    return from(
      updateDoc(docRef, {
        multiShift: newValue,
      }),
    );
  }
}

export interface UserSettings {
  id?: string;
  callsign?: string;
  email?: string;
  emailVerified?: boolean;
  gridSquare?: string;
  name?: string;
  phone?: string;
  status?: string;
  approvedBy?: string;
  declinedBy?: string;
  multiShift?: boolean;
  arrlMemberNumber?: string;
  discordUsername?: string;
}

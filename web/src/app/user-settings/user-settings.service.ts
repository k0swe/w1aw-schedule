import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, from, mergeMap, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';

@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  settings$ = new BehaviorSubject<UserSettings>({});
  started = false;

  constructor(
    private authService: AuthenticationService,
    private firestore: AngularFirestore,
    private httpClient: HttpClient,
  ) {}

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
          return this.firestore
            .doc<UserSettings>('users/' + user.uid)
            .valueChanges();
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
    this.firestore
      .doc<UserSettings>('users/' + u.uid)
      .set({ status: 'Provisional' });
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
        return this.firestore
          .doc<UserSettings>('users/' + user.uid)
          .update(values);
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
    return this.firestore
      .collection<UserSettings>('users', (ref) =>
        ref.where('status', '==', status),
      )
      .valueChanges({ idField: 'id' });
  }

  // Admin only
  public approve(userId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;
    return from(
      this.firestore.doc<UserSettings>('users/' + userId).update({
        status: 'Approved',
        approvedBy: adminId,
      }),
    );
  }

  // Admin only
  public decline(userId: string): Observable<void> {
    const adminId = this.authService.user$.getValue()!.uid;
    return from(
      this.firestore.doc<UserSettings>('users/' + userId).update({
        status: 'Declined',
        declinedBy: adminId,
      }),
    );
  }

  delete(id: string): Observable<any> {
    // Call cloud function to delete user
    const url = `${environment.functionBase}/deleteUser?uid=${id}`;
    return from(this.authService.user$.getValue()!.getIdToken(false)).pipe(
      mergeMap((jwt) => {
        return this.httpClient.post(url, null, {
          headers: { Authorization: 'Bearer ' + jwt },
        });
      }),
    );
  }
}

export interface UserSettings {
  id?: string;
  callsign?: string;
  email?: string;
  gridSquare?: string;
  name?: string;
  phone?: string;
  status?: string;
  approvedBy?: string;
  declinedBy?: string;
}

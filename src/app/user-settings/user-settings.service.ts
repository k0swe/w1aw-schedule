import {AngularFirestore} from '@angular/fire/compat/firestore';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {Injectable} from '@angular/core';
import {switchMap} from 'rxjs/operators';
import {AuthenticationService} from "../authentication/authentication.service";

@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  settings$ = new BehaviorSubject<UserSettings>({});
  started = false;

  constructor(
    private authService: AuthenticationService,
    private firestore: AngularFirestore
  ) {
  }

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
      })
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
    .set({status: "Provisional"});
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
      })
    );
  }
}

export interface UserSettings {
  callsign?: string;
  email?: string;
  gridSquare?: string;
  name?: string;
  phone?: string;
  status?: string;
}

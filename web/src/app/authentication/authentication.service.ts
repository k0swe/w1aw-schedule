import { Injectable, inject } from '@angular/core';
import {
  Auth,
  FacebookAuthProvider,
  GoogleAuthProvider,
  User,
  UserCredential,
  authState,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { EventInfoService } from '../event-info/event-info.service';
import { SUPER_ADMIN_ID } from 'w1aw-schedule-shared';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private auth = inject(Auth);
  private functions = inject(Functions);
  private route = inject(ActivatedRoute);
  private eventInfoService = inject(EventInfoService);
  private router = inject(Router);

  user$ = new BehaviorSubject<User | null>(null);
  private syncEmailVerificationFn: ReturnType<typeof httpsCallable>;

  constructor() {
    // Initialize callable function within constructor (injection context)
    this.syncEmailVerificationFn = httpsCallable(
      this.functions,
      'syncEmailVerification',
    );

    authState(this.auth).subscribe((u) => {
      this.user$.next(u);
      if (!!u) {
        // Sync email verification status when user logs in
        this.syncEmailVerification().subscribe();
        if (this.route.snapshot.queryParams['continue']) {
          this.router.navigateByUrl(
            this.route.snapshot.queryParams['continue'],
          );
        }
      }
    });
  }

  public loginGoogle(): Observable<UserCredential> {
    return from(signInWithPopup(this.auth, new GoogleAuthProvider()));
  }

  public loginFacebook(): Observable<UserCredential> {
    return from(signInWithPopup(this.auth, new FacebookAuthProvider()));
  }

  public loginEmailPass(
    email: string,
    password: string,
  ): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  public createEmailPass(
    email: string,
    password: string,
  ): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  public forgotPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  public sendVerificationEmail(): Observable<void> {
    const user = this.user$.getValue();
    if (!user) {
      throw new Error('No user logged in');
    }
    return from(sendEmailVerification(user));
  }

  public userIsAdmin(eventId: string): Observable<boolean> {
    const adminList$ = this.eventInfoService.getAdminList(eventId);
    return this.user$.pipe(
      switchMap((user) =>
        adminList$.pipe(
          map((adminList) => {
            if (!user) {
              return false;
            }
            return adminList.includes(user.uid);
          }),
        ),
      ),
    );
  }

  public userIsSuperAdmin(): Observable<boolean> {
    return this.user$.pipe(
      map((user) => {
        if (!user) {
          return false;
        }
        return user.uid === SUPER_ADMIN_ID;
      }),
    );
  }

  public logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  public getLoginProvidersFor(email: string): Observable<Array<string>> {
    return from(fetchSignInMethodsForEmail(this.auth, email));
  }

  public syncEmailVerification(): Observable<any> {
    return from(this.syncEmailVerificationFn({}));
  }
}

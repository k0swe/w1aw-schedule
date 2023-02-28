import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { BehaviorSubject, Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  user$ = new BehaviorSubject<firebase.User | null>(null);

  constructor(
    public afa: AngularFireAuth,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.afa.user.subscribe((u) => {
      this.user$.next(u);
      if (!!u && route.snapshot.queryParams['continue']) {
        router.navigateByUrl(route.snapshot.queryParams['continue']);
      }
    });
  }

  public loginGoogle(): Observable<firebase.auth.UserCredential> {
    return from(
      this.afa.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    );
  }

  public loginFacebook(): Observable<firebase.auth.UserCredential> {
    return from(
      this.afa.signInWithPopup(new firebase.auth.FacebookAuthProvider())
    );
  }

  public loginEmailPass(
    email: string,
    password: string
  ): Observable<firebase.auth.UserCredential> {
    return from(this.afa.signInWithEmailAndPassword(email, password));
  }

  public createEmailPass(
    email: string,
    password: string
  ): Observable<firebase.auth.UserCredential> {
    return from(this.afa.createUserWithEmailAndPassword(email, password));
  }

  public forgotPassword(email: string): Observable<void> {
    return from(this.afa.sendPasswordResetEmail(email));
  }

  public logout(): Observable<void> {
    return from(this.afa.signOut());
  }

  public getLoginProvidersFor(email: string): Observable<Array<string>> {
    return from(this.afa.fetchSignInMethodsForEmail(email));
  }
}
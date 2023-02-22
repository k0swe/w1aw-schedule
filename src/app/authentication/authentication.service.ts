import firebase from 'firebase/compat/app';
import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  user$ = new BehaviorSubject<firebase.User | null>(null);

  constructor(public afa: AngularFireAuth) {
    this.afa.user.subscribe((u) => {
      this.user$.next(u);
    });
  }

  public loginGoogle(): Observable<firebase.auth.UserCredential> {
    return from(
      this.afa.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    );
  }

  public logout(): Observable<void> {
    return from(this.afa.signOut());
  }

  public getLoginProvidersFor(email: string): Observable<Array<string>> {
    return from(this.afa.fetchSignInMethodsForEmail(email));
  }
}

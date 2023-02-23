import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import firebase from 'firebase/compat';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { environment } from '../../environment/environment';
import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'kel-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  appName = environment.appName;

  constructor(
    private authService: AuthenticationService,
    private snackBarService: MatSnackBar
  ) {}

  loginGoogle(): void {
    const loginObs = this.authService.loginGoogle();
    this.handleLogin(loginObs);
  }

  private handleLogin(
    loginObs: Observable<firebase.auth.UserCredential>
  ): void {
    loginObs.pipe(take(1)).subscribe({
      error: (err) => {
        switch (err.code) {
          case 'auth/popup-closed-by-user':
          case 'auth/cancelled-popup-request':
            break;
          default:
            console.warn('Problem logging in', err);
            this.snackBarService.open(
              'There was a problem logging in, see the JavaScript console for details.',
              undefined,
              { duration: 10000 }
            );
        }
      },
    });
  }
}

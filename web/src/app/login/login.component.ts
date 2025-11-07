import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription } from '@angular/material/expansion';
import { MatButton } from '@angular/material/button';
import { NgOptimizedImage } from '@angular/common';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'kel-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelDescription, MatButton, NgOptimizedImage, MatFormField, MatLabel, MatInput, FormsModule]
})
export class LoginComponent {
  appName = environment.appName;
  email: string = '';
  password: string = '';

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private snackBarService: MatSnackBar,
  ) {}

  loginGoogle(): void {
    const loginObs = this.authService.loginGoogle();
    this.handleLogin(loginObs);
  }

  loginFacebook(): void {
    const loginObs = this.authService.loginFacebook();
    this.handleLogin(loginObs);
  }

  loginEmailPass() {
    if (!this.password) {
      return;
    }
    const loginObs = this.authService.loginEmailPass(this.email, this.password);
    this.handleLogin(loginObs);
  }

  createEmailPass() {
    if (!this.password) {
      return;
    }
    const loginObs = this.authService.createEmailPass(
      this.email,
      this.password,
    );
    this.handleLogin(loginObs);
  }

  forgotPassword() {
    this.authService.forgotPassword(this.email).subscribe(() => {
      this.snackBarService.open('Sent password reset email', undefined, {
        duration: 10000,
      });
    });
  }

  private handleLogin(
    loginObs: Observable<firebase.auth.UserCredential>,
  ): void {
    loginObs.pipe(take(1)).subscribe({
      next: (_) => {
        this.router.navigateByUrl('/user');
      },
      error: (err) => {
        switch (err.code) {
          case 'auth/popup-closed-by-user':
          case 'auth/cancelled-popup-request':
            break;
          case 'auth/wrong-password':
            this.snackBarService.open('Incorrect password', undefined, {
              duration: 10000,
            });
            this.password = '';
            break;
          case 'auth/user-not-found':
            this.snackBarService.open('User not found', undefined, {
              duration: 10000,
            });
            this.password = '';
            break;
          case 'auth/email-already-in-use':
            this.snackBarService.open(
              "Can't create account, it already exists",
              undefined,
              {
                duration: 10000,
              },
            );
            this.password = '';
            break;
          case 'auth/account-exists-with-different-credential':
            this.snackBarService.open(
              "Can't create account, it's already created with a different login provider",
              undefined,
              {
                duration: 10000,
              },
            );
            this.password = '';
            break;
          default:
            console.warn('Problem logging in', err);
            this.snackBarService.open(
              'There was a problem logging in, see the JavaScript console for details.',
              undefined,
              { duration: 10000 },
            );
        }
      },
    });
  }
}

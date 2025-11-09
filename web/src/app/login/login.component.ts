import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UserCredential } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';

@Component({
  selector: 'kel-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatButton,
    NgOptimizedImage,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
  ],
})
export class LoginComponent {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private snackBarService = inject(MatSnackBar);

  appName = environment.appName;
  email: string = '';
  password: string = '';

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
    loginObs.pipe(take(1)).subscribe({
      next: (_) => {
        // Send verification email after account creation
        this.authService.sendVerificationEmail().subscribe({
          next: () => {
            this.snackBarService.open(
              'Account created! Please check your email to verify your address.',
              undefined,
              { duration: 10000 },
            );
            this.router.navigateByUrl('/user');
          },
          error: (err) => {
            console.error('Error sending verification email:', err);
            this.router.navigateByUrl('/user');
          },
        });
      },
      error: (err) => {
        this.handleLoginError(err);
      },
    });
  }

  forgotPassword() {
    this.authService.forgotPassword(this.email).subscribe(() => {
      this.snackBarService.open('Sent password reset email', undefined, {
        duration: 10000,
      });
    });
  }

  private handleLogin(loginObs: Observable<UserCredential>): void {
    loginObs.pipe(take(1)).subscribe({
      next: (_) => {
        this.router.navigateByUrl('/user');
      },
      error: (err) => {
        this.handleLoginError(err);
      },
    });
  }

  private handleLoginError(err: any): void {
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
  }
}

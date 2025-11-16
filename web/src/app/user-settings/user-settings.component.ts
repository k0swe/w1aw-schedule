import { AsyncPipe } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {
  MatFormField,
  MatInput,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';
import { UserSettings, UserSettingsService } from './user-settings.service';

@Component({
  selector: 'kel-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSuffix,
    MatIcon,
    MatCardActions,
    MatButton,
    MatIconButton,
    AsyncPipe,
  ],
})
export class UserSettingsComponent implements OnInit {
  private authService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private settingsService = inject(UserSettingsService);
  private snackBarService = inject(MatSnackBar);

  user$: Observable<User | null>;

  // email and status are read-only
  email: BehaviorSubject<string>;
  status: BehaviorSubject<string>;

  callsign = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[A-Z]+[0-9][A-Z]+$/i),
  ]);
  gridSquare = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[A-Z]{2}[0-9]{2}[a-z]{2}$/i),
  ]);
  name = new FormControl('', [Validators.required]);
  phone = new FormControl('', [
    Validators.required,
    Validators.pattern(/^\(?[0-9]{3}\)? ?-?[0-9]{3}-?[0-9]{4}$/i),
  ]);
  arrlMemberNumber = new FormControl('');
  discordUsername = new FormControl('');
  discordConnected = false;
  settingsForm = new FormGroup({
    callsign: this.callsign,
    gridSquare: this.gridSquare,
    name: this.name,
    phone: this.phone,
    arrlMemberNumber: this.arrlMemberNumber,
  });

  @ViewChild('saveButton') saveButton: MatButton | undefined;

  constructor() {
    this.user$ = this.authService.user$;
    this.email = new BehaviorSubject<string>(
      this.authService.user$.getValue()?.email || '',
    );
    this.status = new BehaviorSubject<string>('Provisional');
    this.settingsService.settings$.subscribe((settings) => {
      // when settings are loaded (or changed), re-bind values
      this.name.setValue(
        settings.name || this.authService.user$.getValue()?.displayName || '',
      );
      this.gridSquare.setValue(settings.gridSquare || '');
      this.phone.setValue(settings.phone || '');
      this.callsign.setValue(settings.callsign || '');
      this.arrlMemberNumber.setValue(settings.arrlMemberNumber || '');
      this.discordUsername.setValue(settings.discordUsername || '');
      this.discordConnected = !!(
        settings.discordId && settings.discordUsername
      );
      this.status.next(settings.status || '');
    });
  }

  ngOnInit(): void {
    this.settingsService.init();

    // Check for Discord OAuth callback
    this.route.queryParams.pipe(take(1)).subscribe((qp) => {
      if (qp['discord_connected'] === 'true') {
        this.snackBarService.open('Discord account connected!', undefined, {
          duration: 5000,
        });
        // Remove query params from URL
        this.router.navigate([], {
          queryParams: {},
          replaceUrl: true,
        });
        // Reload settings to get updated Discord info
        this.settingsService.init();
      } else if (qp['discord_error']) {
        this.snackBarService.open(
          `Discord connection failed: ${qp['discord_error']}`,
          undefined,
          {
            duration: 5000,
          },
        );
      } else if (qp['needToComplete']) {
        this.snackBarService.open(
          'Please fill in your station details before continuing',
          undefined,
          {
            duration: 10000,
          },
        );
      }
    });

    const accountCreatedInPastMinute =
      new Date(
        this.authService.user$.getValue()?.metadata.creationTime!,
      ).getTime() >
      new Date().getTime() - 60000;
    if (accountCreatedInPastMinute) {
      this.snackBarService.open(
        'Account created; please fill in your station details',
        undefined,
        {
          duration: 10000,
        },
      );
    }
    this.settingsForm.markAllAsTouched();
  }

  save(): void {
    const formValue: UserSettings = {
      email: this.email.value || '',
      status: this.status.value || '',
      callsign: this.callsign.value?.toUpperCase() || '',
      gridSquare: this.gridSquare.value || '',
      name: this.name.value || '',
      phone: this.phone.value || '',
      arrlMemberNumber: this.arrlMemberNumber.value || '',
    };
    this.settingsService
      .set(formValue)
      .pipe(take(1))
      .subscribe(() => {
        this.snackBarService.open('Saved', undefined, {
          duration: 5000,
        });
      });
  }

  sendVerificationEmail(): void {
    this.authService
      .sendVerificationEmail()
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.snackBarService.open(
            'Verification email sent! Please check your inbox.',
            undefined,
            {
              duration: 5000,
            },
          );
        },
        error: (error) => {
          this.snackBarService.open(
            'Failed to send verification email: ' + error.message,
            undefined,
            {
              duration: 5000,
            },
          );
        },
      });
  }

  connectDiscord(): void {
    this.settingsService
      .initiateDiscordOAuth()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          // Open Discord OAuth in a new window
          window.location.href = response.authUrl;
        },
        error: (error) => {
          this.snackBarService.open(
            'Failed to connect Discord: ' + error.message,
            undefined,
            {
              duration: 5000,
            },
          );
        },
      });
  }

  disconnectDiscord(): void {
    this.settingsService
      .disconnectDiscord()
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.discordConnected = false;
          this.discordUsername.setValue('');
          this.snackBarService.open('Discord disconnected', undefined, {
            duration: 5000,
          });
        },
        error: (error) => {
          this.snackBarService.open(
            'Failed to disconnect Discord: ' + error.message,
            undefined,
            {
              duration: 5000,
            },
          );
        },
      });
  }
}

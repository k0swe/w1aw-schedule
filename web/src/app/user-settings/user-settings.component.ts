import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from 'firebase/auth';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { catchError, debounceTime, filter, switchMap, take, tap } from 'rxjs/operators';
import { EventApproval, EventInfoWithId } from 'w1aw-schedule-shared';

import { AuthenticationService } from '../authentication/authentication.service';
import { UserSettings, UserSettingsService } from './user-settings.service';

@Component({
  selector: 'kel-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatProgressSpinner,
    AsyncPipe,
    DatePipe,
  ],
})
export class UserSettingsComponent implements OnInit {
  private authService = inject(AuthenticationService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private settingsService = inject(UserSettingsService);
  private snackBarService = inject(MatSnackBar);

  user$: Observable<User | null>;

  // email is read-only
  email: BehaviorSubject<string>;

  // Event approvals
  events = signal<EventInfoWithId[]>([]);
  userApprovals = signal<(EventApproval & { eventId: string })[]>([]);
  eventsWithStatus = computed(() => {
    const allEvents = this.events();
    const approvals = this.userApprovals();
    return allEvents.map((event) => {
      const approval = approvals.find((a) => a.eventId === event.id);
      return {
        ...event,
        approvalStatus: approval?.status || null,
        appliedAt: approval?.appliedAt || null,
      };
    });
  });

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
  discordConnected = signal<boolean>(false);
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  saveErrorMessage = signal<string>('');
  settingsForm = new FormGroup({
    callsign: this.callsign,
    gridSquare: this.gridSquare,
    name: this.name,
    phone: this.phone,
    arrlMemberNumber: this.arrlMemberNumber,
  });

  constructor() {
    this.user$ = this.authService.user$;
    this.email = new BehaviorSubject<string>(
      this.authService.user$.getValue()?.email || '',
    );
    this.settingsService.settings$.subscribe((settings) => {
      // when settings are loaded (or changed), re-bind values without
      // triggering the autosave listener
      this.name.setValue(
        settings.name || this.authService.user$.getValue()?.displayName || '',
        { emitEvent: false },
      );
      this.gridSquare.setValue(settings.gridSquare || '', {
        emitEvent: false,
      });
      this.phone.setValue(settings.phone || '', { emitEvent: false });
      this.callsign.setValue(settings.callsign || '', { emitEvent: false });
      this.arrlMemberNumber.setValue(settings.arrlMemberNumber || '', {
        emitEvent: false,
      });
      this.discordUsername.setValue(settings.discordUsername || '', {
        emitEvent: false,
      });
      this.discordConnected.set(
        !!(settings.discordId && settings.discordUsername),
      );
      this.settingsForm.markAsPristine();
    });
  }

  ngOnInit(): void {
    this.settingsService.init();

    // Load all events and user's event approvals
    this.settingsService.getAllEvents().subscribe({
      next: (events) => {
        // Sort events chronologically by startTime
        const sortedEvents = events.sort(
          (a, b) => a.startTime.toMillis() - b.startTime.toMillis(),
        );
        this.events.set(sortedEvents);
      },
      error: (error) => {
        console.error('[UserSettings] Error loading events:', error);
        this.snackBarService.open(
          'Failed to load events: ' + error.message,
          undefined,
          {
            duration: 5000,
          },
        );
      },
    });

    this.settingsService.getUserEventApprovals().subscribe({
      next: (approvals) => {
        this.userApprovals.set(approvals);
      },
      error: (error) => {
        console.error('[UserSettings] Error loading approvals:', error);
        this.snackBarService.open(
          'Failed to load your event applications: ' + error.message,
          undefined,
          {
            duration: 5000,
          },
        );
      },
    });

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

    // Autosave: debounce changes, save when valid and dirty
    this.settingsForm.valueChanges
      .pipe(
        debounceTime(1500),
        filter(() => this.settingsForm.valid && this.settingsForm.dirty),
        switchMap(() => {
          this.saveStatus.set('saving');
          return this.performSave().pipe(
            tap(() => {
              this.saveStatus.set('saved');
              timer(3000)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                  if (this.saveStatus() === 'saved') {
                    this.saveStatus.set('idle');
                  }
                });
            }),
            catchError((err: Error) => {
              this.saveStatus.set('error');
              this.saveErrorMessage.set(
                err.message || 'Unknown error',
              );
              return of(undefined);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private performSave() {
    const formValue: UserSettings = {
      email: this.email.value || '',
      callsign: this.callsign.value?.toUpperCase() || '',
      gridSquare: this.gridSquare.value || '',
      name: this.name.value || '',
      phone: this.phone.value || '',
      arrlMemberNumber: this.arrlMemberNumber.value || '',
    };
    return this.settingsService.set(formValue).pipe(
      take(1),
      tap(() => this.settingsForm.markAsPristine()),
    );
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
          this.discordConnected.set(false);
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

  applyForEvent(eventId: string): void {
    // Check if profile is complete
    if (!this.settingsForm.valid) {
      this.snackBarService.open(
        'Please complete your profile before applying for events',
        undefined,
        {
          duration: 5000,
        },
      );
      return;
    }

    this.settingsService
      .applyForEvent(eventId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.snackBarService.open(
            'Application submitted successfully',
            undefined,
            {
              duration: 5000,
            },
          );
        },
        error: (error) => {
          console.error('[UserSettings] Application failed:', error);
          this.snackBarService.open(
            'Failed to apply for event: ' + error.message,
            undefined,
            {
              duration: 5000,
            },
          );
        },
      });
  }

  withdrawFromEvent(eventId: string): void {
    this.settingsService
      .withdrawFromEvent(eventId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.snackBarService.open(
            'Application withdrawn successfully',
            undefined,
            {
              duration: 5000,
            },
          );
        },
        error: (error) => {
          console.error('[UserSettings] Withdrawal failed:', error);
          this.snackBarService.open(
            'Failed to withdraw from event: ' + error.message,
            undefined,
            {
              duration: 5000,
            },
          );
        },
      });
  }
}

import { AsyncPipe } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import firebase from 'firebase/compat/app';
import { BehaviorSubject } from 'rxjs';
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
    MatCardActions,
    MatButton,
    AsyncPipe,
  ],
})
export class UserSettingsComponent implements OnInit {
  user$: BehaviorSubject<firebase.User | null>;

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
  settingsForm = new FormGroup({
    callsign: this.callsign,
    gridSquare: this.gridSquare,
    name: this.name,
    phone: this.phone,
  });

  @ViewChild('saveButton') saveButton: MatButton | undefined;

  constructor(
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private settingsService: UserSettingsService,
    private snackBarService: MatSnackBar,
  ) {
    this.user$ = this.authService.user$;
    this.email = new BehaviorSubject<string>(
      this.user$.getValue()?.email || '',
    );
    this.status = new BehaviorSubject<string>('Provisional');
    this.settingsService.settings$.subscribe((settings) => {
      // when settings are loaded (or changed), re-bind values
      this.name.setValue(
        settings.name || this.user$.getValue()?.displayName || '',
      );
      this.gridSquare.setValue(settings.gridSquare || '');
      this.phone.setValue(settings.phone || '');
      this.callsign.setValue(settings.callsign || '');
      this.status.next(settings.status || '');
    });

    this.route.queryParams.subscribe((qp) => {
      if (qp['needToComplete']) {
        this.snackBarService.open(
          'Please fill in your station details before continuing',
          undefined,
          {
            duration: 10000,
          },
        );
      }
    });
  }

  ngOnInit(): void {
    this.settingsService.init();

    const accountCreatedInPastMinute =
      new Date(this.user$.getValue()?.metadata.creationTime!).getTime() >
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
}

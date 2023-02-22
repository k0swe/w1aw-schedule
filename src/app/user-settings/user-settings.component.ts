import {Component, OnInit, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {UserSettings, UserSettingsService} from './user-settings.service';
import {take} from 'rxjs/operators';
import {AuthenticationService} from "../authentication/authentication.service";
import {BehaviorSubject} from "rxjs";
import firebase from "firebase/compat/app";

@Component({
  selector: 'kel-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
})
export class UserSettingsComponent implements OnInit {
  user$: BehaviorSubject<firebase.User | null>;

  // email and status are read-only
  email: BehaviorSubject<string>;
  status: BehaviorSubject<string>

  callsign = new FormControl('');
  gridSquare = new FormControl('');
  name = new FormControl('');
  phone = new FormControl('');

  @ViewChild('saveButton') saveButton: MatButton | undefined;

  constructor(
    private authService: AuthenticationService,
    public settingsService: UserSettingsService
  ) {
    this.user$ = this.authService.user$;
    this.email = new BehaviorSubject<string>(this.user$.getValue()?.email || '');
    this.status = new BehaviorSubject<string>('Provisional');
    this.settingsService.settings$.subscribe((settings) => {
      // when settings are loaded (or changed), re-bind values
      this.name.setValue(settings.name || this.user$.getValue()?.displayName || '');
      this.gridSquare.setValue(settings.gridSquare || '');
      this.phone.setValue(settings.phone || '');
      this.callsign.setValue(settings.callsign || '');
      this.status.next(settings.status || '')
    })
  }

  ngOnInit(): void {
    this.settingsService.init();
  }

  save(): void {
    const formValue: UserSettings = {
      email: this.email.value || '',
      status: this.status.value || '',
      callsign: this.callsign.value || '',
      gridSquare: this.gridSquare.value || '',
      name: this.name.value || '',
      phone: this.phone.value || '',
    };
    this.settingsService.set(formValue).pipe(take(1)).subscribe();
  }
}

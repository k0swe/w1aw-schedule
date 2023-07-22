import { Component, Input, OnInit } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import firebase from 'firebase/compat/app';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../../authentication/authentication.service';
import {
  UserSettings,
  UserSettingsService,
} from '../../user-settings/user-settings.service';
import { ScheduleService } from '../schedule.service';
import { Shift } from '../shared-constants';

@Component({
  selector: 'kel-schedule-cell',
  templateUrl: './schedule-cell.component.html',
  styleUrls: ['./schedule-cell.component.scss'],
})
export class ScheduleCellComponent implements OnInit {
  @Input() timeslot!: Date;
  @Input() band!: string;
  @Input() mode!: string;
  @Input() userShifts: Shift[] = [];
  shift$ = new BehaviorSubject<Shift | undefined>(undefined);
  user$ = new BehaviorSubject<firebase.User | null>(null);
  userSettings$ = new BehaviorSubject<UserSettings>({});

  constructor(
    private scheduleService: ScheduleService,
    private authenticationService: AuthenticationService,
    private userSettingsService: UserSettingsService,
  ) {}

  ngOnInit(): void {
    this.userSettingsService.init();
    this.scheduleService
      .findShift(this.timeslot, this.band, this.mode)
      .subscribe((sh) => this.shift$.next(sh));
    this.user$ = this.authenticationService.user$;
    this.userSettings$ = this.userSettingsService.settings$;
  }

  toggleShift() {
    const shift = this.shift$.getValue()!;
    const userId = this.user$.getValue()?.uid!;
    const userDetails = this.userSettings$.getValue()!;

    if (!shift?.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService.reserveShift(shift, userId, userDetails).subscribe();
    } else if (shift.reservedBy == userId) {
      // If it's ours and we want to cancel
      this.scheduleService.cancelShift(shift, userId).subscribe();
    }
  }

  buttonColor(): ThemePalette {
    if (this.shift$.getValue()?.reservedBy == this.user$.getValue()?.uid) {
      // reserved by this user
      return 'accent';
    }
    if (this.shift$.getValue()?.reservedBy != null) {
      // reserved by anyone else
      return 'primary';
    }
    return undefined;
  }

  buttonDisabled(): boolean {
    if (this.shift$.getValue()?.reservedBy == this.user$.getValue()?.uid) {
      // This user has reserved this shift, so they can cancel it
      return false;
    }
    if (!this.userSettings$.getValue()?.callsign) {
      // The user hasn't filled out their user profile
      return true;
    }
    if (this.userSettings$.getValue()?.status != 'Approved') {
      // The user is not yet approved by the VOTA coordinators
      return true;
    }
    if (
      !!this.shift$.getValue()?.reservedBy &&
      this.shift$.getValue()?.reservedBy != this.user$.getValue()?.uid
    ) {
      // This shift is already reserved by someone else, but we want it to be primary color,
      // and the service will stop it from being toggled
      return false;
    }
    if (
      this.userShifts.some(
        (s) => s.time.toDate().getTime() == this.timeslot.getTime(),
      )
    ) {
      // This user has already reserved a different shift during this timeslot
      return true;
    }
    // Otherwise, allow the user to reserve this shift!
    return false;
  }
}

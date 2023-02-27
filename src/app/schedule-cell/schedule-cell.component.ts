import { Component, Input, OnInit } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import firebase from 'firebase/compat/app';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from '../schedule/schedule.service';
import { Shift } from '../schedule/shared-constants';
import {
  UserSettings,
  UserSettingsService,
} from '../user-settings/user-settings.service';

@Component({
  selector: 'kel-schedule-cell',
  templateUrl: './schedule-cell.component.html',
  styleUrls: ['./schedule-cell.component.scss'],
})
export class ScheduleCellComponent implements OnInit {
  @Input() timeslot!: Date;
  @Input() band!: string;
  @Input() mode!: string;
  shift$ = new BehaviorSubject<Shift | undefined>(undefined);
  user$ = new BehaviorSubject<firebase.User | null>(null);
  userSettings$ = new BehaviorSubject<UserSettings>({});

  constructor(
    private scheduleService: ScheduleService,
    private authenticationService: AuthenticationService,
    private userSettingsService: UserSettingsService
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
      return 'accent';
    }
    return undefined;
  }

  buttonDisabled(): boolean {
    // TODO: client side security
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
      // This shift is already reserved by someone else
      return true;
    }
    return false;
  }
}

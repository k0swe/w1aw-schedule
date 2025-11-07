import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import firebase from 'firebase/compat/app';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

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
    standalone: false
})
export class ScheduleCellComponent implements OnInit, OnDestroy {
  @Input() timeslot!: Date;
  @Input() band!: string;
  @Input() mode!: string;
  @Input() userShifts: Shift[] = [];
  shift$ = new BehaviorSubject<Shift | undefined>(undefined);
  user$ = new BehaviorSubject<firebase.User | null>(null);
  userSettings$ = new BehaviorSubject<UserSettings>({});
  isAdmin$ = new BehaviorSubject<boolean>(false);
  approvedUsers$ = new BehaviorSubject<UserSettings[]>([]);
  private shiftSubscription: Subscription | null = null;
  private adminSubscription: Subscription | null = null;
  private approvedUsersSubscription: Subscription | null = null;

  constructor(
    private scheduleService: ScheduleService,
    private authenticationService: AuthenticationService,
    private userSettingsService: UserSettingsService,
  ) {}

  ngOnInit(): void {
    this.userSettingsService.init();
    this.shiftSubscription = this.scheduleService
      .findShift(this.timeslot, this.band, this.mode)
      .subscribe((sh) => this.shift$.next(sh));
    this.user$ = this.authenticationService.user$;
    this.adminSubscription = this.authenticationService
      .userIsAdmin()
      .subscribe((isAdmin) => this.isAdmin$.next(isAdmin));
    this.userSettings$ = this.userSettingsService.settings$;
    this.approvedUsersSubscription = this.userSettingsService
      .getApprovedUsers()
      .pipe(
        map((users: UserSettings[]) =>
          users.sort((a, b) => a.callsign!.localeCompare(b.callsign!)),
        ),
      )
      .subscribe(this.approvedUsers$);
  }

  ngOnDestroy() {
    this.shiftSubscription?.unsubscribe();
    this.adminSubscription?.unsubscribe();
    this.approvedUsersSubscription?.unsubscribe();
  }

  toggleShift() {
    const shift = this.shift$.getValue()!;
    const userId = this.user$.getValue()?.uid!;
    const userDetails = this.userSettings$.getValue()!;

    if (!shift?.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService.reserveShift(shift, userId, userDetails).subscribe();
    } else if (shift.reservedBy == userId || this.isAdmin$.getValue()) {
      // If it's ours (or we're an admin) and we want to cancel
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
      !this.userSettings$.getValue()?.multiShift &&
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

  reserveFor(userId: string) {
    const shift = this.shift$.getValue()!;
    const userDetails = this.approvedUsers$
      .getValue()!
      .find((u) => u.id == userId)!;
    this.scheduleService.reserveShift(shift, userId, userDetails).subscribe();
  }
}

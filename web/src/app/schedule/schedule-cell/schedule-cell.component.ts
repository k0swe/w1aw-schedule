import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { User } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthenticationService } from '../../authentication/authentication.service';
import {
  UserSettings,
  UserSettingsService,
} from '../../user-settings/user-settings.service';
import { ScheduleService } from '../schedule.service';
import { EventApproval, Shift, shiftId } from '../shared-constants';

@Component({
  selector: 'kel-schedule-cell',
  templateUrl: './schedule-cell.component.html',
  styleUrls: ['./schedule-cell.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatIconButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    AsyncPipe,
  ],
})
export class ScheduleCellComponent implements OnInit, OnDestroy {
  private scheduleService = inject(ScheduleService);
  private authenticationService = inject(AuthenticationService);
  private userSettingsService = inject(UserSettingsService);

  @Input() timeslot!: Date;
  @Input() band!: string;
  @Input() mode!: string;
  @Input() userShifts: Shift[] = [];
  @Input() eventId!: string;
  shift$ = new BehaviorSubject<Shift | undefined>(undefined);
  user$ = new BehaviorSubject<User | null>(null);
  userSettings$ = new BehaviorSubject<UserSettings>({});
  isAdmin$ = new BehaviorSubject<boolean>(false);
  approvedUsers$ = new BehaviorSubject<UserSettings[]>([]);
  eventApproval$ = new BehaviorSubject<EventApproval | undefined>(undefined);
  private shiftSubscription: Subscription | null = null;
  private adminSubscription: Subscription | null = null;
  private approvedUsersSubscription: Subscription | null = null;
  private eventApprovalSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.userSettingsService.init();
    this.shiftSubscription = this.scheduleService
      .findShift(this.timeslot, this.band, this.mode, this.eventId)
      .subscribe((sh) => this.shift$.next(sh));
    this.user$ = this.authenticationService.user$;
    this.adminSubscription = this.authenticationService
      .userIsAdmin(this.eventId)
      .subscribe((isAdmin) => this.isAdmin$.next(isAdmin));
    this.userSettings$ = this.userSettingsService.settings$;
    this.approvedUsersSubscription = this.userSettingsService
      .getApprovedUsers(this.eventId)
      .pipe(
        map((users: UserSettings[]) =>
          users.sort((a, b) => a.callsign!.localeCompare(b.callsign!)),
        ),
      )
      .subscribe(this.approvedUsers$);
    this.eventApprovalSubscription = this.userSettingsService
      .getUserEventApproval(this.eventId)
      .subscribe((approval) => this.eventApproval$.next(approval));
  }

  ngOnDestroy() {
    this.shiftSubscription?.unsubscribe();
    this.adminSubscription?.unsubscribe();
    this.approvedUsersSubscription?.unsubscribe();
    this.eventApprovalSubscription?.unsubscribe();
  }

  toggleShift() {
    const shift = this.shift$.getValue();
    const userId = this.user$.getValue()?.uid;
    const userDetails = this.userSettings$.getValue();

    if (!userId || !userDetails) {
      console.error('Cannot toggle shift: user not authenticated or settings not loaded');
      return;
    }

    if (!shift) {
      const ts = Timestamp.fromDate(this.timeslot);
      const sid = shiftId({ time: ts, band: this.band, mode: this.mode });
      console.error(`Cannot toggle shift: shift has not been created by an administrator. Hashed shiftId: ${sid}`);
      return;
    }

    if (!shift.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService
        .reserveShift(shift, userId, userDetails, this.eventId)
        .subscribe();
    } else if (shift.reservedBy == userId || this.isAdmin$.getValue()) {
      // If it's ours (or we're an admin) and we want to cancel
      this.scheduleService.cancelShift(shift, userId, this.eventId).subscribe();
    }
  }

  isReservedByUser(): boolean {
    return this.shift$.getValue()?.reservedBy == this.user$.getValue()?.uid;
  }

  isReservedByOther(): boolean {
    const reservedBy = this.shift$.getValue()?.reservedBy;
    return reservedBy != null && reservedBy != this.user$.getValue()?.uid;
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
    if (this.eventApproval$.getValue()?.status != 'Approved') {
      // The user is not yet approved for this specific event
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
    const shift = this.shift$.getValue();
    if (!shift) {
      const ts = Timestamp.fromDate(this.timeslot);
      const sid = shiftId({ time: ts, band: this.band, mode: this.mode });
      console.error(`Cannot reserve shift: shift has not been created by an administrator. Hashed shiftId: ${sid}`);
      return;
    }
    const approvedUsers = this.approvedUsers$.getValue();
    if (!approvedUsers) {
      console.error('Cannot reserve shift: approved users list not loaded');
      return;
    }
    const userDetails = approvedUsers.find((u) => u.id === userId);
    if (!userDetails) {
      console.error(`User ${userId} not found in approved users list`);
      return;
    }
    this.scheduleService
      .reserveShift(shift, userId, userDetails, this.eventId)
      .subscribe();
  }

  clearReservation() {
    const shift = this.shift$.getValue();
    const userId = this.user$.getValue()?.uid;
    if (!shift || !userId) {
      console.error('Cannot clear reservation: shift not found or user not authenticated');
      return;
    }
    this.scheduleService.cancelShift(shift, userId, this.eventId).subscribe();
  }
}

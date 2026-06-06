import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from 'firebase/auth';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { EventApproval, Shift, TWO_HOURS_IN_MS } from 'w1aw-schedule-shared';

import { UserSettings } from '../../user-settings/user-settings.service';
import { ScheduleService } from '../schedule.service';

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
  ],
})
export class ScheduleCellComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private destroyRef = inject(DestroyRef);

  @Input() timeslot!: Date;
  @Input() band!: string;
  @Input() mode!: string;
  @Input() userShifts: Shift[] = [];
  @Input() eventId!: string;
  @Input() currentTimeMs = Date.now();
  @Input() user: User | null = null;
  @Input() userSettings: UserSettings = {};
  @Input() isAdmin = false;
  @Input() approvedUsers: UserSettings[] = [];
  @Input() eventApproval: EventApproval | undefined = undefined;

  shift = signal<Shift | undefined>(undefined);

  ngOnInit(): void {
    this.scheduleService
      .findShift(this.timeslot, this.band, this.mode, this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sh) => this.shift.set(sh),
        error: (err) =>
          console.error('[ScheduleCellComponent] findShift error', err),
      });
  }

  toggleShift() {
    const shift = this.shift();
    const userId = this.user?.uid;
    const userDetails = this.userSettings;

    if (!userId || !userDetails) {
      console.error(
        'Cannot toggle shift: user not authenticated or settings not loaded',
      );
      return;
    }

    if (!shift) {
      console.error(
        'Cannot toggle shift: shift has not been created by an administrator',
      );
      return;
    }

    if (!shift.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService
        .reserveShift(shift, userId, userDetails, this.eventId)
        .subscribe();
    } else if (shift.reservedBy == userId || this.isAdmin) {
      // If it's ours (or we're an admin) and we want to cancel
      this.scheduleService.cancelShift(shift, userId, this.eventId).subscribe();
    }
  }

  isReservedByUser(): boolean {
    return this.shift()?.reservedBy == this.user?.uid;
  }

  isReservedByOther(): boolean {
    const reservedBy = this.shift()?.reservedBy;
    return reservedBy != null && reservedBy != this.user?.uid;
  }

  isNotAllowed(): boolean {
    // 30 meters has no phone allocation; those shifts are never schedulable
    return this.band === '30' && this.mode === 'phone';
  }

  isPastShift(): boolean {
    if (!this.timeslot) {
      return false;
    }

    return this.timeslot.getTime() + TWO_HOURS_IN_MS <= this.currentTimeMs;
  }

  buttonDisabled(): boolean {
    if (this.isNotAllowed()) {
      return true;
    }
    if (this.isPastShift()) {
      return true;
    }
    if (this.shift()?.reservedBy == this.user?.uid) {
      // This user has reserved this shift, so they can cancel it
      return false;
    }
    if (!this.userSettings?.callsign) {
      // The user hasn't filled out their user profile
      return true;
    }
    if (this.eventApproval?.status != 'Approved') {
      // The user is not yet approved for this specific event
      return true;
    }
    if (
      !!this.shift()?.reservedBy &&
      this.shift()?.reservedBy != this.user?.uid
    ) {
      // This shift is already reserved by someone else, but we want it to be primary color,
      // and the service will stop it from being toggled
      return false;
    }
    if (
      !this.eventApproval?.multiShift &&
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
    const shift = this.shift();
    if (!shift) {
      console.error(
        'Cannot reserve shift: shift has not been created by an administrator',
      );
      return;
    }
    const userDetails = this.approvedUsers.find((u) => u.id === userId);
    if (!userDetails) {
      console.error(`User ${userId} not found in approved users list`);
      return;
    }
    this.scheduleService
      .reserveShift(shift, userId, userDetails, this.eventId)
      .subscribe();
  }

  clearReservation() {
    const shift = this.shift();
    const userId = this.user?.uid;
    if (!shift || !userId) {
      console.error(
        'Cannot clear reservation: shift not found or user not authenticated',
      );
      return;
    }
    this.scheduleService.cancelShift(shift, userId, this.eventId).subscribe();
  }
}

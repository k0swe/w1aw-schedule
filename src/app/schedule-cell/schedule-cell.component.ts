import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from '../schedule/schedule.service';
import { Shift } from '../schedule/shared-constants';
import { UserSettingsService } from '../user-settings/user-settings.service';

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
  }

  toggleShift() {
    const shift = this.shift$.getValue()!;
    const userId = this.authenticationService.user$.getValue()?.uid!;
    const userDetails = this.userSettingsService.settings$.getValue()!;

    if (!shift?.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService.reserveShift(shift, userId, userDetails).subscribe();
    } else if (shift.reservedBy == userId) {
      // If it's ours and we want to cancel
      this.scheduleService.cancelShift(shift, userId).subscribe();
    }
  }
}

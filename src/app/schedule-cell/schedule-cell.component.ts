import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
    private userSettingsService: UserSettingsService
  ) {}

  ngOnInit(): void {
    this.userSettingsService.init();
    this.scheduleService
      .findShift(this.timeslot, this.band, this.mode)
      .subscribe((sh) => this.shift$.next(sh));
  }

  toggleShift() {
    const thisShift = this.shift$.getValue()!;
    const thisUser = this.userSettingsService.settings$.getValue()!;

    if (!thisShift?.reservedBy) {
      // If it's open and we want to reserve
      this.scheduleService.reserveShift(thisShift, thisUser).subscribe();
    } else if (thisShift.reservedBy?.callsign == thisUser.callsign) {
      // If it's ours and we want to cancel
      this.scheduleService.cancelShift(thisShift, thisUser).subscribe();
    }
  }
}

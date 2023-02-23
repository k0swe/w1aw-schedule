import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ScheduleService, Shift } from '../schedule/schedule.service';

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

  constructor(private scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.scheduleService
      .findShift(this.timeslot, this.band, this.mode)
      .subscribe((sh) => this.shift$.next(sh));
  }
}

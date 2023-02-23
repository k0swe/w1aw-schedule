import { Component } from '@angular/core';

@Component({
  selector: 'kel-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent {
  ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
  viewDay = new Date('2023-05-24T00:00:00Z');
  timeSlots: Date[] = [];

  constructor() {
    const nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
    for (
      let timeSlot = this.viewDay;
      timeSlot < nextDay;
      timeSlot = new Date(timeSlot.getTime() + this.TWO_HOURS_IN_MS)
    ) {
      this.timeSlots.push(timeSlot);
    }
  }
}

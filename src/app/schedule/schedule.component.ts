import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  HF_BANDS,
  MODES,
  SHF_BANDS,
  TWO_HOURS_IN_MS,
  UHF_BANDS,
  VHF_BANDS,
} from './shared-constants';

@Component({
  selector: 'kel-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
})
export class ScheduleComponent {
  ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  MODES = MODES;
  timeSlots: Date[] = [];
  bandGroups: Map<string, string[]> = new Map([
    ['HF', HF_BANDS],
    ['VHF', VHF_BANDS],
    ['UHF', UHF_BANDS],
    ['SHF', SHF_BANDS],
  ]);

  viewDay: Date;
  viewBandGroup: string;
  viewMode: string;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.viewDay = new Date(route.snapshot.queryParams['day'] || '2023-05-24');
    this.viewBandGroup = route.snapshot.queryParams['bandGroup'] || 'HF';
    this.viewMode = route.snapshot.queryParams['mode'] || 'phone';

    const nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
    for (
      let timeSlot = this.viewDay;
      timeSlot < nextDay;
      timeSlot = new Date(timeSlot.getTime() + TWO_HOURS_IN_MS)
    ) {
      this.timeSlots.push(timeSlot);
    }
  }

  changeParams() {
    let isoString = this.viewDay.toISOString();
    let dateString = isoString.substring(0, isoString.indexOf('T'));
    this.router.navigate([], {
      queryParams: {
        day: dateString,
        bandGroup: this.viewBandGroup,
        mode: this.viewMode,
      },
    });
  }
}

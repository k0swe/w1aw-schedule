import { Clipboard } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from './schedule.service';
import {
  BANDS,
  HF_BANDS,
  MODES,
  SHF_BANDS,
  Shift,
  TIME_SLOTS_END,
  TIME_SLOTS_START,
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
  TIME_SLOTS_START = TIME_SLOTS_START;
  TIME_SLOTS_END = TIME_SLOTS_END;
  BANDS = BANDS;
  timeSlots: Date[] = [];
  bandGroups: Map<string, string[]> = new Map([
    ['HF', HF_BANDS],
    ['VHF', VHF_BANDS],
    ['UHF', UHF_BANDS],
    ['SHF', SHF_BANDS],
  ]);
  bandGroupNames = ['HF', 'VHF', 'UHF', 'SHF'];
  userShifts$ = new BehaviorSubject<Shift[]>([]);
  columnsToDisplay: string[] = [];

  viewDay: Date;
  viewBandGroup: string;
  viewMode: string;
  prevDay: Date;
  nextDay: Date;
  googleCalendarLink =
    'https://calendar.google.com/calendar/u/0/embed?src=37t1at5dfkpu2gce9b0d6kg8tufub7mo@import.calendar.google.com&ctz=America/Denver&mode=WEEK&dates=20230523%2F20230530';
  icsLink = 'https://us-central1-w1aw-schedule.cloudfunctions.net/calendar';

  constructor(
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private scheduleService: ScheduleService,
    private clipboard: Clipboard,
    private snackBarService: MatSnackBar,
  ) {
    this.viewDay = new Date(
      route.snapshot.queryParams['day'] ||
        TIME_SLOTS_START.toISOString().split('T')[0],
    );
    this.viewBandGroup = route.snapshot.queryParams['bandGroup'] || 'HF';
    this.viewMode = route.snapshot.queryParams['mode'] || 'phone';
    this.scheduleService
      .findUserShifts(authenticationService.user$.getValue()!.uid)
      .subscribe((shifts) => this.userShifts$.next(shifts));
    this.prevDay = new Date(this.viewDay.getTime() - this.ONE_DAY_IN_MS);
    this.nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
    this.changeParams();
  }

  goToPrevDay() {
    this.viewDay = this.prevDay;
    this.changeParams();
  }

  goToNextDay() {
    this.viewDay = this.nextDay;
    this.changeParams();
  }

  changeParams() {
    this.columnsToDisplay = ['utc', 'localTime', 'localTimeIcon'];
    for (let band of this.bandGroups.get(this.viewBandGroup)!) {
      this.columnsToDisplay.push(`${band}m ${this.viewMode}`);
    }
    let isoString = this.viewDay.toISOString();
    let dateString = isoString.substring(0, isoString.indexOf('T'));
    this.router.navigate([], {
      queryParams: {
        day: dateString,
        bandGroup: this.viewBandGroup,
        mode: this.viewMode,
      },
    });
    this.timeSlots = [];
    this.prevDay = new Date(this.viewDay.getTime() - this.ONE_DAY_IN_MS);
    this.nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
    for (
      let timeSlot = this.viewDay;
      timeSlot < this.nextDay;
      timeSlot = new Date(timeSlot.getTime() + TWO_HOURS_IN_MS)
    ) {
      this.timeSlots.push(timeSlot);
    }
  }

  dayNightIcon(timeSlot: Date) {
    const localHour = new Date(
      timeSlot.toLocaleString('en-US', { timeZone: 'America/Denver' }),
    ).getHours();
    return localHour >= 6 && localHour < 20 ? 'light_mode' : 'dark_mode';
  }

  copyIcsLink() {
    this.clipboard.copy(this.icsLink);
    this.snackBarService.open('Copied to clipboard', undefined, {
      duration: 2000,
    });
  }

  downloadIcs() {
    window.open(this.icsLink, '_blank');
  }

  openGoogleCalendar() {
    window.open(this.googleCalendarLink, '_blank');
  }
}

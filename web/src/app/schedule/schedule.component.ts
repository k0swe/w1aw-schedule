import { Clipboard } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';
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
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { NgFor, AsyncPipe, DatePipe } from '@angular/common';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ScheduleCellComponent } from './schedule-cell/schedule-cell.component';

@Component({
    selector: 'kel-schedule',
    templateUrl: './schedule.component.html',
    styleUrls: ['./schedule.component.scss'],
    imports: [MatCard, MatCardHeader, MatCardTitle, MatButton, MatIcon, MatFormField, MatLabel, MatSelect, NgFor, MatOption, MatCardContent, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, ScheduleCellComponent, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatCardActions, AsyncPipe, DatePipe]
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
    'https://calendar.google.com/calendar/u/0/embed?src=37t1at5dfkpu2gce9b0d6kg8tufub7mo@import.calendar.google.com' +
    '&ctz=America/Denver&mode=WEEK&dates=20230913%2F20230920';
  icsLink = `${environment.functionBase}/calendar`;

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
}

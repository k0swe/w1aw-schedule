import { Clipboard } from '@angular/cdk/clipboard';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleCellComponent } from './schedule-cell/schedule-cell.component';
import { ScheduleService } from './schedule.service';
import {
  BANDS,
  COLORADO_DOC_ID,
  HI_HF_BANDS,
  LF_BANDS,
  LOW_HF_BANDS,
  MODES,
  Shift,
  TIME_SLOTS_END,
  TIME_SLOTS_START,
  TWO_HOURS_IN_MS,
  VHF_UHF_BANDS,
} from './shared-constants';

@Component({
  selector: 'kel-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatCardContent,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    ScheduleCellComponent,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatCardActions,
    AsyncPipe,
    DatePipe,
  ],
})
export class ScheduleComponent {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scheduleService = inject(ScheduleService);
  private clipboard = inject(Clipboard);
  private snackBarService = inject(MatSnackBar);

  ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  MODES = MODES;
  TIME_SLOTS_START = TIME_SLOTS_START;
  TIME_SLOTS_END = TIME_SLOTS_END;
  BANDS = BANDS;
  timeSlots: Date[] = [];
  bandGroups: Map<string, string[]> = new Map([
    ['LF', LF_BANDS],
    ['Low HF', LOW_HF_BANDS],
    ['Hi HF', HI_HF_BANDS],
    ['VHF & UHF', VHF_UHF_BANDS],
  ]);
  bandGroupNames = ['LF', 'Low HF', 'Hi HF', 'VHF & UHF'];
  userShifts$ = new BehaviorSubject<Shift[]>([]);
  columnsToDisplay: string[] = [];
  eventId: string;

  viewDay: Date;
  viewBandGroup: string;
  viewMode: string;
  prevDay: Date;
  nextDay: Date;
  googleCalendarLink =
    'https://calendar.google.com/calendar/u/0/embed?src=j1vm5nfmlg2djdqjv86sjfe7ob2a8bl8@import.calendar.google.com' +
    '&ctz=America/Denver&mode=WEEK&dates=20260526/20260602';
  icsLink = `${environment.functionBase}/calendar`;

  constructor() {
    // Get eventId from route parameter, default to Colorado event
    this.eventId = this.route.snapshot.paramMap.get('eventId') || COLORADO_DOC_ID;
    this.viewDay = new Date(
      this.route.snapshot.queryParams['day'] ||
        TIME_SLOTS_START.toISOString().split('T')[0],
    );
    this.viewBandGroup =
      this.route.snapshot.queryParams['bandGroup'] || 'Hi HF';
    this.viewMode = this.route.snapshot.queryParams['mode'] || 'phone';
    this.scheduleService
      .findUserShifts(this.authenticationService.user$.getValue()!.uid, this.eventId)
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

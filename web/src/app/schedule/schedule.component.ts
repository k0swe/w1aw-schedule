import { Clipboard } from '@angular/cdk/clipboard';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
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
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { ScheduleCellComponent } from './schedule-cell/schedule-cell.component';
import { ScheduleService } from './schedule.service';
import {
  BANDS,
  COLORADO_DOC_ID,
  COLORADO_SLUG,
  HI_HF_BANDS,
  LF_BANDS,
  LOW_HF_BANDS,
  MODES,
  Shift,
  TWO_HOURS_IN_MS,
  VHF_UHF_BANDS,
} from './shared-constants';

@Component({
  selector: 'kel-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
export class ScheduleComponent implements OnDestroy {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scheduleService = inject(ScheduleService);
  private eventInfoService = inject(EventInfoService);
  private clipboard = inject(Clipboard);
  private snackBarService = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
  MODES = MODES;
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
  eventId: string = COLORADO_DOC_ID;
  eventStartTime: Date = new Date('2026-05-27T00:00:00Z'); // Default, updated from event info
  eventEndTime: Date = new Date('2026-06-02T23:59:59Z'); // Default, updated from event info

  viewDay: Date = new Date();
  viewBandGroup: string = 'Hi HF';
  viewMode: string = 'phone';
  prevDay: Date = new Date();
  nextDay: Date = new Date();
  googleCalendarLink =
    'https://calendar.google.com/calendar/u/0/embed?src=j1vm5nfmlg2djdqjv86sjfe7ob2a8bl8@import.calendar.google.com' +
    '&ctz=America/Denver&mode=WEEK&dates=20260526/20260602';
  icsLink = '';

  constructor() {
    // Get slug from route parameter, default to Colorado slug
    const slug = this.route.snapshot.paramMap.get('slug') || COLORADO_SLUG;

    // Resolve slug to eventId and get event info
    if (slug === COLORADO_SLUG) {
      // Optimization: use default Colorado event ID without query
      this.eventId = COLORADO_DOC_ID;
      this.initializeComponent();
    } else {
      // Query Firestore to find event by slug
      this.eventInfoService
        .getEventBySlug(slug)
        .pipe(takeUntil(this.destroy$))
        .subscribe((eventInfo) => {
          if (eventInfo?.id) {
            this.eventId = eventInfo.id;
            this.initializeComponent();
          } else {
            // Fallback to Colorado event if slug not found
            this.eventId = COLORADO_DOC_ID;
            this.initializeComponent();
          }
        });
    }
  }

  private initializeComponent() {
    // Get event info to use startTime and endTime
    this.eventInfoService
      .getEventInfo(this.eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((eventInfo) => {
        if (eventInfo) {
          // Normalize to start/end of day for consistent date comparisons
          const startDate = eventInfo.startTime.toDate();
          const endDate = eventInfo.endTime.toDate();
          this.eventStartTime = new Date(
            Date.UTC(
              startDate.getUTCFullYear(),
              startDate.getUTCMonth(),
              startDate.getUTCDate(),
              0,
              0,
              0,
              0,
            ),
          );
          this.eventEndTime = new Date(
            Date.UTC(
              endDate.getUTCFullYear(),
              endDate.getUTCMonth(),
              endDate.getUTCDate(),
              23,
              59,
              59,
              999,
            ),
          );
          // Recalculate prevDay and nextDay with the loaded event times
          this.prevDay = new Date(this.viewDay.getTime() - this.ONE_DAY_IN_MS);
          this.nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
        }
      });

    this.icsLink = `${environment.functionBase}/calendar?eventId=${this.eventId}`;
    this.viewDay = new Date(
      this.route.snapshot.queryParams['day'] ||
        this.eventStartTime.toISOString().split('T')[0],
    );
    this.viewBandGroup =
      this.route.snapshot.queryParams['bandGroup'] || 'Hi HF';
    this.viewMode = this.route.snapshot.queryParams['mode'] || 'phone';
    this.scheduleService
      .findUserShifts(
        this.authenticationService.user$.getValue()!.uid,
        this.eventId,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((shifts) => this.userShifts$.next(shifts));
    this.prevDay = new Date(this.viewDay.getTime() - this.ONE_DAY_IN_MS);
    this.nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
    this.changeParams();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

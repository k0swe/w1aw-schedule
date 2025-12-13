import { Clipboard } from '@angular/cdk/clipboard';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { BehaviorSubject, Subject, of } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { getLocalTimeZoneLabel } from '../timezone-utils';
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
  private cdr = inject(ChangeDetectorRef);
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
  timeZoneLabel: string = ''; // Dynamic timezone label from event info

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
    // React to route parameter changes
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || COLORADO_SLUG;

          // Resolve slug to eventId and get event info
          if (slug === COLORADO_SLUG) {
            // Optimization: use default Colorado event ID without query
            return of({ slug, eventId: COLORADO_DOC_ID });
          } else {
            // Query Firestore to find event by slug
            return this.eventInfoService.getEventBySlug(slug).pipe(
              map((eventInfo) => ({
                slug,
                eventId: eventInfo?.id || COLORADO_DOC_ID,
              })),
            );
          }
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ eventId }) => {
        this.eventId = eventId;
        this.initializeComponent();
      });
  }

  private initializeComponent() {
    this.icsLink = `${environment.functionBase}/calendar?eventId=${this.eventId}`;
    this.viewBandGroup =
      this.route.snapshot.queryParams['bandGroup'] || 'Hi HF';
    this.viewMode = this.route.snapshot.queryParams['mode'] || 'phone';

    // Get event info to use startTime and endTime
    this.eventInfoService
      .getEventInfo(this.eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((eventInfo) => {
        if (eventInfo) {
          // Use exact times from event info (no normalization)
          this.eventStartTime = eventInfo.startTime.toDate();
          this.eventEndTime = eventInfo.endTime.toDate();

          // Get local timezone label (browser timezone, not event timezone)
          this.timeZoneLabel = getLocalTimeZoneLabel(this.eventStartTime);

          // Set viewDay based on query params or nearest day to today
          const dayParam = this.route.snapshot.queryParams['day'];
          if (dayParam) {
            this.viewDay = new Date(dayParam);
          } else {
            this.viewDay = this.getNearestDayInEventRange();
          }

          // Recalculate prevDay and nextDay with the loaded event times
          this.updatePrevNextDays();
          this.changeParams();

          // Trigger change detection to update the view
          this.cdr.markForCheck();
        }
      });

    this.scheduleService
      .findUserShifts(
        this.authenticationService.user$.getValue()!.uid,
        this.eventId,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((shifts) => this.userShifts$.next(shifts));
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

  private updatePrevNextDays() {
    this.prevDay = new Date(this.viewDay.getTime() - this.ONE_DAY_IN_MS);
    this.nextDay = new Date(this.viewDay.getTime() + this.ONE_DAY_IN_MS);
  }

  /**
   * Calculate the nearest day to today within the event range.
   * Returns a Date object normalized to midnight UTC for the selected day.
   */
  private getNearestDayInEventRange(): Date {
    // Get today's date at midnight UTC for comparison
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    // Normalize event start and end to midnight UTC for day-level comparison
    const eventStart = new Date(
      Date.UTC(
        this.eventStartTime.getUTCFullYear(),
        this.eventStartTime.getUTCMonth(),
        this.eventStartTime.getUTCDate(),
      ),
    );
    const eventEnd = new Date(
      Date.UTC(
        this.eventEndTime.getUTCFullYear(),
        this.eventEndTime.getUTCMonth(),
        this.eventEndTime.getUTCDate(),
      ),
    );

    // If today is before the event, use event start date
    if (todayUTC < eventStart) {
      return eventStart;
    }

    // If today is after the event, use event end date
    if (todayUTC > eventEnd) {
      return eventEnd;
    }

    // Today is during the event, use today's date
    return todayUTC;
  }

  isPrevDayBeforeEvent(): boolean {
    // Disable if prevDay is entirely before the event starts
    // A day is entirely before the event if its end is before event start
    const endOfPrevDay = new Date(this.prevDay.getTime() + this.ONE_DAY_IN_MS);
    return endOfPrevDay <= this.eventStartTime;
  }

  isNextDayAfterEvent(): boolean {
    // Disable if nextDay is entirely after the event ends
    // A day is entirely after the event if its start is after event end
    return this.nextDay > this.eventEndTime;
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
    this.updatePrevNextDays();
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

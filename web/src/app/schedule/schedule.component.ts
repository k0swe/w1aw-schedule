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
import { BehaviorSubject, Subject, merge } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';
import {
  BANDS,
  HI_HF_BANDS,
  LF_BANDS,
  LOW_HF_BANDS,
  MODES,
  Shift,
  TWO_HOURS_IN_MS,
  VHF_UHF_BANDS,
} from 'w1aw-schedule-shared';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { getLocalTimeZoneLabel } from '../timezone-utils';
import { ScheduleCellComponent } from './schedule-cell/schedule-cell.component';
import { ScheduleService } from './schedule.service';
import { SunCalculationService } from './sun-calculation.service';

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
  private sunCalculationService = inject(SunCalculationService);
  private destroy$ = new Subject<void>();
  private reinit$ = new Subject<void>();

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
  eventId: string = '';
  eventStartTime: Date = new Date(); // Set from event info
  eventEndTime: Date = new Date(); // Set from event info
  timeZoneLabel: string = ''; // Dynamic timezone label from event info

  viewDay: Date = new Date();
  viewBandGroup: string = 'Hi HF';
  viewMode: string = 'phone';
  prevDay: Date = new Date();
  nextDay: Date = new Date();
  googleCalendarLink?: string;
  icsLink = '';

  constructor() {
    // React to route parameter changes - slug is required
    this.route.paramMap
      .pipe(
        map((params) => {
          return params.get('slug');
        }),
        filter((slug): slug is string => {
          if (!slug) throw new Error('Event slug is required in route');
          return true;
        }),
        // Don't reinit when same slug re-emits (e.g. changeParams updates query params)
        distinctUntilChanged(),
        switchMap((slug) => {
          // Query Firestore to find event by slug - take(1) because we only
          // need to resolve the slug once per navigation
          return this.eventInfoService.getEventBySlug(slug).pipe(
            take(1),
            map((eventInfo) => {
              if (!eventInfo) {
                throw new Error(`Event not found for slug: ${slug}`);
              }
              return { slug, eventId: eventInfo.id };
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ eventId }) => {
        this.eventId = eventId;
        this.initializeComponent();
      });
  }

  private initializeComponent() {
    // Cancel subscriptions from any previous event before creating new ones
    this.reinit$.next();

    // Clear the schedule table so old ScheduleCellComponent instances (and their
    // Firestore listeners) are destroyed before any new subscriptions can fire.
    // IMPORTANT: use detectChanges() (not markForCheck()) here. markForCheck()
    // only schedules CD for a future cycle; with Zone.js, Firestore cached-data
    // callbacks arrive as microtasks and can fire *before* that cycle runs,
    // causing changeParams() to repopulate timeSlots before old cells are
    // destroyed, leaving them alive with dangling Firestore listeners.
    // detectChanges() runs synchronously so old cells are always torn down first.
    // The try/catch handles the rare case where detectChanges() is called
    // during an existing CD cycle (e.g., synchronous mocks in unit tests).
    this.timeSlots = [];
    this.columnsToDisplay = [];
    try {
      this.cdr.detectChanges();
    } catch {
      this.cdr.markForCheck();
    }

    this.icsLink = `${environment.functionBase}/calendar?eventId=${this.eventId}`;

    // Read saved params for this event from localStorage as fallback before defaults
    const savedParams = this.eventId
      ? this.loadScheduleParams(this.eventId)
      : null;
    this.viewBandGroup =
      this.route.snapshot.queryParams['bandGroup'] ||
      savedParams?.bandGroup ||
      'Hi HF';
    this.viewMode =
      this.route.snapshot.queryParams['mode'] || savedParams?.mode || 'phone';
    this.eventInfoService
      .getEventInfo(this.eventId)
      .pipe(takeUntil(merge(this.destroy$, this.reinit$)))
      .subscribe({
        next: (eventInfo) => {
          // Guard against new/incomplete events that may be missing required
          // time fields.
          if (!eventInfo?.startTime || !eventInfo?.endTime) {
            console.warn(
              '[ScheduleComponent] Event data incomplete (missing startTime or endTime);',
              'schedule will not render.',
              'eventId:', this.eventId,
            );
            return;
          }

          // Use exact times from event info (no normalization)
          this.eventStartTime = eventInfo.startTime.toDate();
          this.eventEndTime = eventInfo.endTime.toDate();

          // Get local timezone label (browser timezone, not event timezone)
          this.timeZoneLabel = getLocalTimeZoneLabel(this.eventStartTime);

          // Construct Google Calendar link if googleCalendarId is provided
          if (eventInfo.googleCalendarId) {
            const startDate = this.formatDateAsYYYYMMDD(this.eventStartTime);
            const endDate = this.formatDateAsYYYYMMDD(this.eventEndTime);
            const encodedCalendarId = encodeURIComponent(
              eventInfo.googleCalendarId,
            );
            const encodedTimeZone = encodeURIComponent(eventInfo.timeZoneId);
            const encodedDates = encodeURIComponent(`${startDate}/${endDate}`);
            this.googleCalendarLink =
              `https://calendar.google.com/calendar/u/0/embed?src=${encodedCalendarId}@import.calendar.google.com` +
              `&ctz=${encodedTimeZone}&mode=WEEK&dates=${encodedDates}`;
          } else {
            this.googleCalendarLink = undefined;
          }

          // Set viewDay based on query params, saved localStorage params, or nearest day to today
          const dayParam =
            this.route.snapshot.queryParams['day'] || savedParams?.day;
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
        },
        error: (err) => {
          console.error('[ScheduleComponent] Error loading event info:', err);
        },
      });

    this.scheduleService
      .findUserShifts(
        this.authenticationService.user$.getValue()!.uid,
        this.eventId,
      )
      .pipe(takeUntil(merge(this.destroy$, this.reinit$)))
      .subscribe({
        next: (shifts) => {
          this.userShifts$.next(shifts);
        },
        error: (err) => {
          console.error('[ScheduleComponent] Error loading user shifts:', err);
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.reinit$.next();
    this.reinit$.complete();
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

  /**
   * Format a Date object as YYYYMMDD for Google Calendar URL
   */
  private formatDateAsYYYYMMDD(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  changeParams() {
    this.columnsToDisplay = ['utc', 'localTime', 'localTimeIcon'];
    for (let band of this.bandGroups.get(this.viewBandGroup)!) {
      this.columnsToDisplay.push(`${band}m ${this.viewMode}`);
    }
    let isoString = this.viewDay.toISOString();
    let dateString = isoString.substring(0, isoString.indexOf('T'));
    // Save current params to localStorage for this event
    if (this.eventId) {
      this.saveScheduleParams(this.eventId, dateString, this.viewBandGroup, this.viewMode);
    }
    // Only navigate if the query params actually changed to avoid flooding NavigationEnd
    const currentParams = this.route.snapshot.queryParams;
    if (
      currentParams['day'] !== dateString ||
      currentParams['bandGroup'] !== this.viewBandGroup ||
      currentParams['mode'] !== this.viewMode
    ) {
      this.router.navigate([], {
        queryParams: {
          day: dateString,
          bandGroup: this.viewBandGroup,
          mode: this.viewMode,
        },
      });
    }
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
    // Use suncalc with user's browser geolocation for accurate sunrise/sunset when available
    // Falls back to browser's local time 6am-6pm model otherwise
    return this.sunCalculationService.getDayNightIcon(timeSlot);
  }

  private loadScheduleParams(eventId: string): {
    day?: string;
    bandGroup?: string;
    mode?: string;
  } | null {
    try {
      const stored = localStorage.getItem(`w1aw_schedule_params_${eventId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveScheduleParams(
    eventId: string,
    day: string,
    bandGroup: string,
    mode: string,
  ): void {
    try {
      localStorage.setItem(
        `w1aw_schedule_params_${eventId}`,
        JSON.stringify({ day, bandGroup, mode }),
      );
    } catch {
      // Ignore localStorage errors (e.g., private browsing mode)
    }
  }

  copyIcsLink() {
    this.clipboard.copy(this.icsLink);
    this.snackBarService.open('Copied to clipboard', undefined, {
      duration: 2000,
    });
  }
}

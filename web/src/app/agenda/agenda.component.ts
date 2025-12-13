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
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { ScheduleService } from '../schedule/schedule.service';
import {
  COLORADO_DOC_ID,
  COLORADO_SLUG,
  Shift,
} from '../schedule/shared-constants';

@Component({
  selector: 'kel-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButton,
    AsyncPipe,
    DatePipe,
  ],
})
export class AgendaComponent implements OnDestroy {
  private authenticationService = inject(AuthenticationService);
  private clipboard = inject(Clipboard);
  private scheduleService = inject(ScheduleService);
  private eventInfoService = inject(EventInfoService);
  private snackBarService = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  userShifts$ = new BehaviorSubject<Shift[]>([]);
  icsLink = '';
  eventId: string = COLORADO_DOC_ID;
  timeZoneLabel: string = ''; // Dynamic timezone label from event info

  constructor() {
    // React to route parameter changes
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || COLORADO_SLUG;

          // Resolve slug to eventId
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
    // Get event info for reference date (to handle DST properly)
    this.eventInfoService
      .getEventInfo(this.eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((eventInfo) => {
        if (eventInfo) {
          // Get local timezone label (browser timezone, not event timezone)
          this.timeZoneLabel = this.getLocalTimeZoneLabel(
            eventInfo.startTime.toDate(),
          );
        }
      });

    this.authenticationService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (!user) {
          return;
        }
        this.icsLink = `${environment.functionBase}/calendar?uid=${user.uid}&eventId=${this.eventId}`;
        this.scheduleService
          .findUserShifts(user.uid, this.eventId)
          .pipe(takeUntil(this.destroy$))
          .subscribe((shifts) => {
            // sort by timestamp, ascending
            shifts.sort((a, b) => a.time.toMillis() - b.time.toMillis());
            this.userShifts$.next(shifts);
          });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  /**
   * Get a timezone label (abbreviation or GMT offset) for display
   * Uses the browser's local timezone, not the event timezone
   * @param date Reference date to determine the timezone abbreviation (for DST)
   * @returns Timezone abbreviation (e.g., 'MDT', 'MST') or GMT offset (e.g., 'GMT-6')
   */
  private getLocalTimeZoneLabel(date: Date): string {
    try {
      // Get the local timezone abbreviation using Intl.DateTimeFormat
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
      });
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find((part) => part.type === 'timeZoneName');
      
      if (timeZonePart && timeZonePart.value) {
        return timeZonePart.value;
      }

      // Fallback to GMT offset if abbreviation not available
      return this.getLocalGMTOffset(date);
    } catch (error) {
      // If timezone is invalid, return GMT offset
      return this.getLocalGMTOffset(date);
    }
  }

  /**
   * Get GMT offset for local timezone
   * @param date Reference date
   * @returns GMT offset string (e.g., 'GMT-6', 'GMT+5:30')
   */
  private getLocalGMTOffset(date: Date): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'longOffset',
      });
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find((part) => part.type === 'timeZoneName');
      
      if (timeZonePart && timeZonePart.value) {
        return timeZonePart.value;
      }

      // Ultimate fallback
      return 'Local';
    } catch (error) {
      return 'Local';
    }
  }
}

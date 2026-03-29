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
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { map, switchMap, take, takeUntil } from 'rxjs/operators';
import { Shift } from 'w1aw-schedule-shared';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { ScheduleService } from '../schedule/schedule.service';
import { getLocalTimeZoneLabel } from '../timezone-utils';

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
  private reinit$ = new Subject<void>();

  userShifts$ = new BehaviorSubject<Shift[]>([]);
  icsLink = '';
  eventId: string = '';
  timeZoneLabel: string = ''; // Dynamic timezone label from event info

  constructor() {
    // React to route parameter changes - slug is required
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug');
          if (!slug) {
            throw new Error('Event slug is required in route');
          }

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

    // Get event info for reference date (to handle DST properly)
    this.eventInfoService
      .getEventInfo(this.eventId)
      .pipe(takeUntil(merge(this.destroy$, this.reinit$)))
      .subscribe((eventInfo) => {
        if (eventInfo) {
          // Get local timezone label (browser timezone, not event timezone)
          this.timeZoneLabel = getLocalTimeZoneLabel(
            eventInfo.startTime.toDate(),
          );
        }
      });

    this.authenticationService.user$
      .pipe(takeUntil(merge(this.destroy$, this.reinit$)))
      .subscribe((user) => {
        if (!user) {
          return;
        }
        this.icsLink = `${environment.functionBase}/calendar?uid=${user.uid}&eventId=${this.eventId}`;
        this.scheduleService
          .findUserShifts(user.uid, this.eventId)
          .pipe(takeUntil(merge(this.destroy$, this.reinit$)))
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
    this.reinit$.next();
    this.reinit$.complete();
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
}

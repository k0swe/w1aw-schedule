import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatAnchor } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatList, MatListItem, MatListItemIcon } from '@angular/material/list';
import { map } from 'rxjs/operators';
import { EventInfoWithId } from 'w1aw-schedule-shared';

import { environment } from '../../environments/environment';
import { EventInfoService } from '../event-info/event-info.service';

interface CalendarEntry {
  event: EventInfoWithId;
  googleCalendarEmbedUrl?: string;
  icsUrl: string;
}

function formatDateAsYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

@Component({
  selector: 'web-calendars',
  templateUrl: './calendars.component.html',
  styleUrls: ['./calendars.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    DatePipe,
    MatAnchor,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatDivider,
    MatIcon,
    MatList,
    MatListItem,
    MatListItemIcon,
  ],
})
export class CalendarsComponent {
  private eventInfoService = inject(EventInfoService);

  readonly entries$ = this.eventInfoService.getAllEvents().pipe(
    map((events) =>
      events.map((event): CalendarEntry => {
        let googleCalendarEmbedUrl: string | undefined;
        if (event.googleCalendarId) {
          const startDate = formatDateAsYYYYMMDD(event.startTime.toDate());
          const endDate = formatDateAsYYYYMMDD(event.endTime.toDate());
          const encodedCalendarId = encodeURIComponent(event.googleCalendarId);
          const encodedTimeZone = encodeURIComponent(event.timeZoneId);
          const encodedDates = encodeURIComponent(`${startDate}/${endDate}`);
          googleCalendarEmbedUrl =
            `https://calendar.google.com/calendar/u/0/embed?src=${encodedCalendarId}@import.calendar.google.com` +
            `&ctz=${encodedTimeZone}&mode=WEEK&dates=${encodedDates}`;
        }
        const icsUrl = `${environment.functionBase}/calendar?eventId=${event.id}`;
        return { event, googleCalendarEmbedUrl, icsUrl };
      }),
    ),
  );
}

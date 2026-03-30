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
  googleCalendarUrl?: string;
  icsUrl: string;
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
        const googleCalendarUrl = event.googleCalendarId
          ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(event.googleCalendarId + '@import.calendar.google.com')}`
          : undefined;
        const icsUrl = `${environment.functionBase}/calendar?eventId=${event.id}`;
        return { event, googleCalendarUrl, icsUrl };
      }),
    ),
  );
}

import { Clipboard } from '@angular/cdk/clipboard';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { ScheduleService } from '../schedule/schedule.service';
import { COLORADO_DOC_ID, COLORADO_SLUG, Shift } from '../schedule/shared-constants';

@Component({
  selector: 'kel-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss'],
  standalone: true,
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
export class AgendaComponent {
  private authenticationService = inject(AuthenticationService);
  private clipboard = inject(Clipboard);
  private scheduleService = inject(ScheduleService);
  private eventInfoService = inject(EventInfoService);
  private snackBarService = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  userShifts$ = new BehaviorSubject<Shift[]>([]);
  icsLink = '';
  eventId: string = COLORADO_DOC_ID;

  constructor() {
    // Get slug from route parameter, default to Colorado slug
    const slug = this.route.snapshot.paramMap.get('slug') || COLORADO_SLUG;
    
    // Resolve slug to eventId
    if (slug === COLORADO_SLUG) {
      // Optimization: use default Colorado event ID without query
      this.eventId = COLORADO_DOC_ID;
      this.initializeComponent();
    } else {
      // Query Firestore to find event by slug
      this.eventInfoService.getEventBySlug(slug).subscribe((eventInfo) => {
        if (eventInfo && (eventInfo as any).id) {
          this.eventId = (eventInfo as any).id;
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
    this.authenticationService.user$.subscribe((user) => {
      if (!user) {
        return;
      }
      this.icsLink = `${environment.functionBase}/calendar?uid=${user.uid}&eventId=${this.eventId}`;
      this.scheduleService.findUserShifts(user.uid, this.eventId).subscribe((shifts) => {
        // sort by timestamp, ascending
        shifts.sort((a, b) => a.time.toMillis() - b.time.toMillis());
        this.userShifts$.next(shifts);
      });
    });
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

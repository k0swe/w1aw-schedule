import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { EventInfoService } from '../event-info/event-info.service';
import {
  COLORADO_DOC_ID,
  COLORADO_SLUG,
  EventInfo,
} from '../schedule/shared-constants';
import {
  UserSettings,
  UserSettingsService,
} from '../user-settings/user-settings.service';
import { ApprovalListComponent } from './approval-list/approval-list.component';

@Component({
  selector: 'kel-approval-tabs',
  templateUrl: './approval-tabs.component.html',
  styleUrls: ['./approval-tabs.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatTabGroup,
    MatTab,
    ApprovalListComponent,
    AsyncPipe,
  ],
})
export class ApprovalTabsComponent implements OnInit {
  private userSettingsService = inject(UserSettingsService);
  private eventInfoService = inject(EventInfoService);
  private route = inject(ActivatedRoute);

  eventId = signal<string>(COLORADO_DOC_ID);
  eventInfo$!: Observable<EventInfo | undefined>;
  provisionalUsers$!: Observable<UserSettings[]>;
  approvedUsers$!: Observable<UserSettings[]>;
  declinedUsers$!: Observable<UserSettings[]>;

  ngOnInit(): void {
    // Get event ID from route parameter (slug) or default to Colorado
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug') || COLORADO_SLUG;
          return this.eventInfoService.getEventBySlug(slug);
        }),
      )
      .subscribe((eventInfo) => {
        const id = eventInfo?.id || COLORADO_DOC_ID;
        this.eventId.set(id);

        // Load event info
        this.eventInfo$ = this.eventInfoService.getEventInfo(id);

        // Load approval lists for this event
        this.provisionalUsers$ =
          this.userSettingsService.getProvisionalUsers(id);
        this.approvedUsers$ = this.userSettingsService.getApprovedUsers(id);
        this.declinedUsers$ = this.userSettingsService.getDeclinedUsers(id);
      });
  }
}

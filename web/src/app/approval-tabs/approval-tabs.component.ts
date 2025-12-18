import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { EventInfo } from 'w1aw-schedule-shared';

import { EventInfoService } from '../event-info/event-info.service';
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
    MatBadge,
    ApprovalListComponent,
    AsyncPipe,
    MatTabLabel,
  ],
})
export class ApprovalTabsComponent implements OnInit {
  private userSettingsService = inject(UserSettingsService);
  private eventInfoService = inject(EventInfoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  eventId = signal<string | undefined>(undefined);
  eventInfo$: Observable<EventInfo | undefined>;
  provisionalUsers$: Observable<UserSettings[]>;
  approvedUsers$: Observable<UserSettings[]>;
  declinedUsers$: Observable<UserSettings[]>;
  pendingCount$: Observable<number>;
  selectedTabIndex = signal<number>(1); // Default to Approved tab (index 1)

  constructor() {
    // Initialize with empty observables - will be set in ngOnInit based on route
    this.eventInfo$ = of(undefined);
    this.provisionalUsers$ = of([]);
    this.approvedUsers$ = of([]);
    this.declinedUsers$ = of([]);
    this.pendingCount$ = of(0);
  }

  ngOnInit(): void {
    // Get event ID from route parameter (slug) - required
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug');
          if (!slug) {
            throw new Error('Event slug is required in route');
          }
          return this.eventInfoService.getEventBySlug(slug);
        }),
      )
      .subscribe((eventInfo) => {
        if (!eventInfo) {
          throw new Error('Event not found for the given slug');
        }

        this.eventId.set(eventInfo.id);

        // Load event info
        this.eventInfo$ = this.eventInfoService.getEventInfo(eventInfo.id);

        // Load approval lists for this event
        this.provisionalUsers$ = this.userSettingsService.getProvisionalUsers(
          eventInfo.id,
        );
        this.approvedUsers$ = this.userSettingsService.getApprovedUsers(
          eventInfo.id,
        );
        this.declinedUsers$ = this.userSettingsService.getDeclinedUsers(
          eventInfo.id,
        );

        // Count pending users for badge
        this.pendingCount$ = this.provisionalUsers$.pipe(
          map((users) => users.length),
        );
      });

    // Handle URL fragment for tab selection
    this.route.fragment.subscribe((fragment) => {
      if (fragment === 'pending') {
        this.selectedTabIndex.set(0);
      } else if (fragment === 'approved') {
        this.selectedTabIndex.set(1);
      } else if (fragment === 'declined') {
        this.selectedTabIndex.set(2);
      }
      // If no fragment, default to Approved (index 1)
    });
  }

  onTabChange(index: number): void {
    // Update URL fragment when tab changes
    const fragments = ['pending', 'approved', 'declined'];
    this.router.navigate([], {
      fragment: fragments[index],
      relativeTo: this.route,
      replaceUrl: true,
    });
  }
}

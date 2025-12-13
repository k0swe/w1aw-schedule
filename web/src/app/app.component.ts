import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import {
  MatDivider,
  MatListItem,
  MatListItemIcon,
  MatNavList,
} from '@angular/material/list';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, take, tap } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { AuthenticationService } from './authentication/authentication.service';
import { AvatarComponent } from './avatar/avatar.component';
import { EventInfoService } from './event-info/event-info.service';
import { COLORADO_DOC_ID, COLORADO_SLUG, EventInfoWithId } from './schedule/shared-constants';

@Component({
  selector: 'kel-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    RouterLink,
    NgOptimizedImage,
    AvatarComponent,
    MatSidenavContainer,
    MatSidenav,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatDivider,
    MatCard,
    MatSelect,
    MatOption,
    RouterOutlet,
    AsyncPipe,
  ],
})
export class AppComponent {
  private titleService = inject(Title);
  private router = inject(Router);
  private authService = inject(AuthenticationService);
  private eventInfoService = inject(EventInfoService);

  appName = environment.appName;
  // Track the currently selected event
  selectedEvent$ = new BehaviorSubject<EventInfoWithId | undefined>(undefined);
  // List of all available events
  events$ = new BehaviorSubject<EventInfoWithId[]>([]);
  userIsAdmin$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.titleService.setTitle(this.appName);

    // Fetch all events
    this.eventInfoService
      .getAllEvents()
      .pipe(takeUntilDestroyed())
      .subscribe((events) => {
        this.events$.next(events);
        // Set default selected event to next/current event if no event is selected
        if (!this.selectedEvent$.value) {
          const defaultEvent = this.selectDefaultEvent(events);
          if (defaultEvent) {
            this.selectedEvent$.next(defaultEvent);
          }
        }
      });

    // Subscribe to router events to dynamically check admin status based on current route
    // and update the selected event to match the route
    // startWith(null) emits an initial value to trigger the admin check immediately on component initialization
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null), // Emit initial value to trigger admin check on component load
        map(() => this.getEventSlugFromRoute()),
        distinctUntilChanged(), // Prevent redundant API calls when navigating within the same event
        switchMap((slug) => {
          // If we have a slug from the route, use it to get the event
          if (slug) {
            return this.eventInfoService.getEventBySlug(slug).pipe(
              tap((eventInfo) => {
                // Update selected event to match the route
                if (eventInfo && eventInfo.id !== this.selectedEvent$.value?.id) {
                  this.selectedEvent$.next(eventInfo);
                }
              }),
              switchMap((eventInfo) => {
                const eventId = eventInfo?.id || COLORADO_DOC_ID;
                return this.authService.userIsAdmin(eventId);
              }),
            );
          } else {
            // No slug in route, use Colorado default for admin check
            // Don't update selectedEvent$ - let the default event logic handle it
            return this.authService.userIsAdmin(COLORADO_DOC_ID);
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe((isAdmin) => {
        this.userIsAdmin$.next(isAdmin);
      });
  }

  /**
   * Extracts the event slug from the current route.
   * @returns The event slug if present in the route parameters, null otherwise.
   */
  private getEventSlugFromRoute(): string | null {
    // Extract slug from current route
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.paramMap.get('slug');
  }

  private selectDefaultEvent(events: EventInfoWithId[]): EventInfoWithId | undefined {
    if (events.length === 0) {
      return undefined;
    }

    // Events are already sorted by startTime (ascending)
    // Find the first event that hasn't ended yet (current or future)
    const now = Date.now();
    const currentOrFutureEvent = events.find(
      (event) => event.endTime.toMillis() > now
    );

    // If found a current/future event, use it
    // Otherwise, use the last event (most recent past event)
    return currentOrFutureEvent || events[events.length - 1];
  }

  onEventChange(event: EventInfoWithId): void {
    this.selectedEvent$.next(event);

    // Navigate to the corresponding page in the new event if we're on an event-specific page
    const currentUrl = this.router.url;
    const scheduleMatch = currentUrl.match(/\/events\/[^/]+\/schedule/);
    const agendaMatch = currentUrl.match(/\/events\/[^/]+\/agenda/);
    const approvalsMatch = currentUrl.match(/\/events\/[^/]+\/approvals/);
    
    if (scheduleMatch) {
      this.router.navigate(['/events', event.slug, 'schedule']);
    } else if (agendaMatch) {
      this.router.navigate(['/events', event.slug, 'agenda']);
    } else if (approvalsMatch) {
      // Check if user is admin for the new event before navigating to approvals
      this.authService.userIsAdmin(event.id).pipe(take(1)).subscribe((isAdmin) => {
        if (isAdmin) {
          this.router.navigate(['/events', event.slug, 'approvals']);
        } else {
          // User is not admin for this event, default to schedule page
          this.router.navigate(['/events', event.slug, 'schedule']);
        }
      });
    }
  }
}

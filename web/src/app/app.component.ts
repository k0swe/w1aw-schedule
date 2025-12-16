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
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, take, tap } from 'rxjs/operators';
import { EventInfoWithId } from 'w1aw-schedule-shared';

import { environment } from '../environments/environment';
import { AuthenticationService } from './authentication/authentication.service';
import { AvatarComponent } from './avatar/avatar.component';
import { EventInfoService } from './event-info/event-info.service';

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
  userIsSuperAdmin$ = new BehaviorSubject<boolean>(false);

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
    // Combine with events$ to ensure we have the event list before trying to match
    combineLatest([
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null), // Emit initial value on component load
        map(() => this.getEventSlugFromRoute()),
        distinctUntilChanged(), // Prevent redundant processing when slug doesn't change
      ),
      this.events$,
    ])
      .pipe(
        filter(([slug, events]) => events.length > 0), // Wait for events to load
        switchMap(([slug, events]) => {
          // If we have a slug from the route, use it to get the event
          if (slug) {
            return this.eventInfoService.getEventBySlug(slug).pipe(
              tap((eventInfo) => {
                // Update selected event to match the route
                // Use the event object from events$ array to ensure mat-select value binding works
                if (eventInfo?.id) {
                  const matchingEvent = events.find(e => e.id === eventInfo.id);
                  // Update only if we found a match and it's different from current selection
                  if (matchingEvent && matchingEvent.id !== this.selectedEvent$.value?.id) {
                    this.selectedEvent$.next(matchingEvent);
                  }
                }
              }),
              switchMap((eventInfo) => {
                if (!eventInfo) {
                  throw new Error(`Event not found for slug: ${slug}`);
                }
                return this.authService.userIsAdmin(eventInfo.id);
              }),
            );
          } else {
            // No slug in route - check if we have a selected event
            const selectedEvent = this.selectedEvent$.value;
            if (selectedEvent) {
              return this.authService.userIsAdmin(selectedEvent.id);
            }
            // No event selected, return false for admin status
            return of(false);
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe((isAdmin) => {
        this.userIsAdmin$.next(isAdmin);
      });

    // Subscribe to super-admin status
    this.authService
      .userIsSuperAdmin()
      .pipe(takeUntilDestroyed())
      .subscribe((isSuperAdmin) => {
        this.userIsSuperAdmin$.next(isSuperAdmin);
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

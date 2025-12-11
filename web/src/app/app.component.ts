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
import { distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';

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
        // Set default selected event to Colorado if no event is selected
        if (!this.selectedEvent$.value && events.length > 0) {
          const coloradoEvent = events.find((e) => e.slug === COLORADO_SLUG);
          this.selectedEvent$.next(coloradoEvent || events[0]);
        }
      });

    // Subscribe to router events to dynamically check admin status based on current route
    // startWith(null) emits an initial value to trigger the admin check immediately on component initialization
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null), // Emit initial value to trigger admin check on component load
        map(() => this.getEventSlugFromRoute()),
        distinctUntilChanged(), // Prevent redundant API calls when navigating within the same event
        switchMap((slug) =>
          this.eventInfoService.getEventBySlug(slug).pipe(
            map((eventInfo) => eventInfo?.id || COLORADO_DOC_ID),
            switchMap((eventId) => this.authService.userIsAdmin(eventId)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((isAdmin) => {
        this.userIsAdmin$.next(isAdmin);
      });
  }

  private getEventSlugFromRoute(): string {
    // Extract slug from current route
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.paramMap.get('slug') || COLORADO_SLUG;
  }

  onEventChange(event: EventInfoWithId): void {
    this.selectedEvent$.next(event);
  }
}

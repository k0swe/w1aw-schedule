import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
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
import { COLORADO_DOC_ID, COLORADO_SLUG } from './schedule/shared-constants';

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
  // Default slug for the Colorado event - should be dynamic based on user's selected event in the future
  defaultEventSlug = COLORADO_SLUG;
  userIsAdmin$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.titleService.setTitle(this.appName);
    
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
}

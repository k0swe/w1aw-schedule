import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { EventInfoService } from '../event-info/event-info.service';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  private authService = inject(AuthenticationService);
  private eventInfoService = inject(EventInfoService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    // Extract slug from route parameters - required
    const slug = route.paramMap.get('slug');
    if (!slug) {
      throw new Error('Event slug is required in route');
    }

    // Resolve slug to eventId and check admin status
    return this.eventInfoService.getEventBySlug(slug).pipe(
      map((eventInfo) => {
        if (!eventInfo) {
          throw new Error(`Event not found for slug: ${slug}`);
        }
        return eventInfo.id;
      }),
      switchMap((eventId) => this.authService.userIsAdmin(eventId)),
    );
  }
}

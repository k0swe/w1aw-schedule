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
import { COLORADO_DOC_ID, COLORADO_SLUG } from '../schedule/shared-constants';
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
    // Extract slug from route parameters if present
    const slug = route.paramMap.get('slug') || COLORADO_SLUG;

    // Resolve slug to eventId and check admin status
    return this.eventInfoService.getEventBySlug(slug).pipe(
      map((eventInfo) => eventInfo?.id || COLORADO_DOC_ID),
      switchMap((eventId) => this.authService.userIsAdmin(eventId)),
    );
  }
}

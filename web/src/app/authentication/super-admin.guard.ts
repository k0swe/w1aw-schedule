import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SUPER_ADMIN_ID } from 'w1aw-schedule-shared';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
  private authService = inject(AuthenticationService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.authService.user$.pipe(
      map((user) => {
        if (!user) {
          return false;
        }
        return user.uid === SUPER_ADMIN_ID;
      }),
    );
  }
}

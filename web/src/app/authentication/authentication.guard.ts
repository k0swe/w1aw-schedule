import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationGuard implements CanActivate {
  private router = inject(Router);
  private authService = inject(AuthenticationService);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return combineLatest([this.authService.authReady$, this.authService.user$]).pipe(
      filter(([authReady]) => authReady),
      take(1),
      map(([, user]) => {
        if (user != null) {
          return true;
        }
        return this.router.createUrlTree(['/login'], {
          queryParams: { continue: state.url },
        });
      }),
    );
  }
}

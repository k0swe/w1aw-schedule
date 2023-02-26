import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

import { UserSettings, UserSettingsService } from './user-settings.service';

@Injectable({
  providedIn: 'root',
})
export class UserSettingsGuard implements CanActivate {
  constructor(
    private router: Router,
    private userSettingsService: UserSettingsService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    const verifySettings = (
      userSettings?: UserSettings
    ): Observable<boolean> | Observable<UrlTree> => {
      if (
        userSettings &&
        userSettings.email &&
        userSettings.name &&
        userSettings.callsign &&
        userSettings.gridSquare &&
        userSettings.phone
      ) {
        return of(true);
      }
      return of(
        this.router.createUrlTree(['/user'], {
          queryParams: { needToComplete: true },
        })
      );
    };
    return this.userSettingsService.settings$.pipe(switchMap(verifySettings));
  }
}

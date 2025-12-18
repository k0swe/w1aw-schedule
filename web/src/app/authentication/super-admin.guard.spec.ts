import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SUPER_ADMIN_ID } from 'w1aw-schedule-shared';

import { AuthenticationService } from './authentication.service';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let user$: BehaviorSubject<any>;

  beforeEach(() => {
    user$ = new BehaviorSubject<any>(null);
    authService = jasmine.createSpyObj('AuthenticationService', [], {
      user$: user$,
    });

    TestBed.configureTestingModule({
      providers: [
        SuperAdminGuard,
        { provide: AuthenticationService, useValue: authService },
      ],
    });
    guard = TestBed.inject(SuperAdminGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return false when user is not logged in', (done) => {
    user$.next(null);

    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    );

    if (
      result instanceof Promise ||
      (typeof result === 'object' && 'subscribe' in result)
    ) {
      (result as any).subscribe((canActivate: boolean) => {
        expect(canActivate).toBe(false);
        done();
      });
    } else {
      fail('Expected Observable');
    }
  });

  it('should return true when user is super-admin', (done) => {
    user$.next({ uid: SUPER_ADMIN_ID });

    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    );

    if (
      result instanceof Promise ||
      (typeof result === 'object' && 'subscribe' in result)
    ) {
      (result as any).subscribe((canActivate: boolean) => {
        expect(canActivate).toBe(true);
        done();
      });
    } else {
      fail('Expected Observable');
    }
  });

  it('should return false when user is not super-admin', (done) => {
    user$.next({ uid: 'some-other-user-id' });

    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    );

    if (
      result instanceof Promise ||
      (typeof result === 'object' && 'subscribe' in result)
    ) {
      (result as any).subscribe((canActivate: boolean) => {
        expect(canActivate).toBe(false);
        done();
      });
    } else {
      fail('Expected Observable');
    }
  });
});

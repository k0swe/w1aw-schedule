import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { User } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthenticationGuard } from './authentication.guard';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let authReady$: BehaviorSubject<boolean>;
  let user$: BehaviorSubject<User | null>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authReady$ = new BehaviorSubject<boolean>(false);
    user$ = new BehaviorSubject<User | null>(null);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        AuthenticationGuard,
        {
          provide: AuthenticationService,
          useValue: {
            authReady$,
            user$,
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    guard = TestBed.inject(AuthenticationGuard);
  });

  it('allows activation when auth is ready and user exists', (done) => {
    user$.next({ uid: 'user-1' } as User);
    authReady$.next(true);

    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/events/test/schedule' } as RouterStateSnapshot,
    ) as Observable<boolean | UrlTree>;

    result.subscribe((canActivate: boolean | UrlTree) => {
      expect(canActivate).toBe(true);
      done();
    });
  });

  it('redirects to login with continuation when auth is ready and user is null', (done) => {
    const loginUrlTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(loginUrlTree);
    authReady$.next(true);

    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/events/test/schedule?day=2026-06-01' } as RouterStateSnapshot,
    ) as Observable<boolean | UrlTree>;

    result.subscribe((canActivate: boolean | UrlTree) => {
      expect(canActivate).toBe(loginUrlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { continue: '/events/test/schedule?day=2026-06-01' },
      });
      done();
    });
  });

  it('waits for auth readiness before deciding', () => {
    let emitted = false;
    const result = guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/events/test/schedule' } as RouterStateSnapshot,
    ) as Observable<boolean | UrlTree>;
    result.subscribe(() => {
      emitted = true;
    });

    expect(emitted).toBe(false);
    authReady$.next(true);
    expect(emitted).toBe(true);
  });
});

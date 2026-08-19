import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { UserCredential } from 'firebase/auth';
import { of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { AuthenticationService } from '../authentication/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: MockedObject<AuthenticationService>;
  let router: MockedObject<Router>;
  let activatedRouteMock: {
    snapshot: {
      queryParams: Record<string, unknown>;
    };
  };

  beforeEach(async () => {
    authService = {
      loginGoogle: vi.fn().mockName('AuthenticationService.loginGoogle'),
      loginFacebook: vi.fn().mockName('AuthenticationService.loginFacebook'),
      loginEmailPass: vi.fn().mockName('AuthenticationService.loginEmailPass'),
      createEmailPass: vi
        .fn()
        .mockName('AuthenticationService.createEmailPass'),
      sendVerificationEmail: vi
        .fn()
        .mockName('AuthenticationService.sendVerificationEmail'),
      forgotPassword: vi.fn().mockName('AuthenticationService.forgotPassword'),
    };
    authService.loginGoogle.mockReturnValue(of({} as UserCredential));
    authService.loginFacebook.mockReturnValue(of({} as UserCredential));
    authService.loginEmailPass.mockReturnValue(of({} as UserCredential));
    authService.createEmailPass.mockReturnValue(of({} as UserCredential));
    authService.sendVerificationEmail.mockReturnValue(of(void 0));
    authService.forgotPassword.mockReturnValue(of(void 0));

    router = {
      navigateByUrl: vi.fn().mockName('Router.navigateByUrl'),
    };
    activatedRouteMock = {
      snapshot: { queryParams: {} },
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthenticationService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        {
          provide: MatSnackBar,
          useValue: {
            open: vi.fn().mockName('MatSnackBar.open'),
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockName('MatDialog.open'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to continuation URL after email/password login', () => {
    activatedRouteMock.snapshot.queryParams = {
      continue: '/events/test/agenda',
    };
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/events/test/agenda');
  });

  it('navigates to /user when no continuation URL is present', () => {
    activatedRouteMock.snapshot.queryParams = {};
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user');
  });

  it('navigates to /user for unsafe continuation URLs', () => {
    activatedRouteMock.snapshot.queryParams = {
      continue: '//evil.example/path',
    };
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user');
  });

  it('navigates to /user for backslash-based continuation URLs', () => {
    activatedRouteMock.snapshot.queryParams = {
      continue: '/\\evil.example/path',
    };
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user');
  });
});

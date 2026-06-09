import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { UserCredential } from 'firebase/auth';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRouteMock: {
    snapshot: { queryParams: Record<string, unknown> };
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      [
        'loginGoogle',
        'loginFacebook',
        'loginEmailPass',
        'createEmailPass',
        'sendVerificationEmail',
        'forgotPassword',
      ],
    );
    authService.loginGoogle.and.returnValue(of({} as UserCredential));
    authService.loginFacebook.and.returnValue(of({} as UserCredential));
    authService.loginEmailPass.and.returnValue(of({} as UserCredential));
    authService.createEmailPass.and.returnValue(of({} as UserCredential));
    authService.sendVerificationEmail.and.returnValue(of(void 0));
    authService.forgotPassword.and.returnValue(of(void 0));

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    activatedRouteMock = {
      snapshot: { queryParams: {} },
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthenticationService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
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
    activatedRouteMock.snapshot.queryParams = { continue: '/events/test/agenda' };
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
    activatedRouteMock.snapshot.queryParams = { continue: '//evil.example/path' };
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user');
  });

  it('navigates to /user for backslash-based continuation URLs', () => {
    activatedRouteMock.snapshot.queryParams = { continue: '/\\evil.example/path' };
    component.email = 'test@example.com';
    component.password = 'pw';

    component.loginEmailPass();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/user');
  });
});

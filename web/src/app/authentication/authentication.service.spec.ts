import { TestBed } from '@angular/core/testing';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import firebase from 'firebase/compat/app';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  const user$ = new BehaviorSubject<Partial<firebase.User> | null>(null);
  const afaSpy = jasmine.createSpyObj(
    'AngularFireAuth',
    {
      createUserWithEmailAndPassword: Promise.resolve(null),
      sendPasswordResetEmail: Promise.resolve(),
      signInWithEmailAndPassword: Promise.resolve(null),
      signInWithPopup: Promise.resolve(null),
      signOut: Promise.resolve(),
    },
    { user: user$ }
  );
  const activatedRouteSpy = jasmine.createSpyObj(
    'ActivatedRoute',
    {},
    {
      // user has ?continue=schedule in their URL
      snapshot: { queryParams: { continue: 'schedule' } },
    }
  );
  const routerSpy = jasmine.createSpyObj('Router', {
    navigateByUrl: Promise.resolve(true),
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthenticationService,
        {
          provide: AngularFireAuth,
          useValue: afaSpy,
        },
        {
          provide: ActivatedRoute,
          useValue: activatedRouteSpy,
        },
        {
          provide: Router,
          useValue: routerSpy,
        },
      ],
    });
    service = TestBed.inject(AuthenticationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start a Google login', () => {
    service.loginGoogle().subscribe();
    expect(afaSpy.signInWithPopup).toHaveBeenCalledWith(
      jasmine.any(firebase.auth.GoogleAuthProvider)
    );
  });

  it('should start a Facebook login', () => {
    service.loginFacebook().subscribe();
    expect(afaSpy.signInWithPopup).toHaveBeenCalledWith(
      jasmine.any(firebase.auth.FacebookAuthProvider)
    );
  });

  it('should create an email account', () => {
    const email = 'joe@example.com';
    const password = 'rosebud';
    service.createEmailPass(email, password).subscribe();
    expect(afaSpy.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      email,
      password
    );
  });

  it('should start an email login', () => {
    const email = 'joe@example.com';
    const password = 'rosebud';
    service.loginEmailPass(email, password).subscribe();
    expect(afaSpy.signInWithEmailAndPassword).toHaveBeenCalledWith(
      email,
      password
    );
  });

  it('should send emails for forgotten passwords', () => {
    const user = 'joe@example.com';
    service.forgotPassword(user).subscribe();
    expect(afaSpy.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('should log the user out', () => {
    service.logout().subscribe();
    expect(afaSpy.signOut).toHaveBeenCalled();
  });

  it('should redirect if the user signed in with a `continue` query param', () => {
    // user signs in & activatedRoute has `continue` param
    user$.next({ uid: 'a2c4', email: 'joe@example.com' });

    // should be redirected
    expect(routerSpy.navigateByUrl).toHaveBeenCalled();
  });
});

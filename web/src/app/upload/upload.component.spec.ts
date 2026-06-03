import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { Auth } from 'firebase/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { AUTH, STORAGE } from '../firebase-rxjs';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
  let fixture: ComponentFixture<UploadComponent>;
  let component: UploadComponent;
  let authService: jasmine.SpyObj<AuthenticationService> & {
    user$: BehaviorSubject<any>;
  };
  let eventInfoService: jasmine.SpyObj<EventInfoService>;
  let userSettingsService: jasmine.SpyObj<UserSettingsService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', [
      'userIsAdmin',
    ]) as jasmine.SpyObj<AuthenticationService> & { user$: BehaviorSubject<any> };
    authService.user$ = new BehaviorSubject({ uid: 'admin-1' } as any) as
      unknown as BehaviorSubject<any>;
    eventInfoService = jasmine.createSpyObj('EventInfoService', ['getEventBySlug']);
    userSettingsService = jasmine.createSpyObj('UserSettingsService', [
      'init',
      'getUserEventApproval',
      'settings',
      'getApprovedUsers',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    eventInfoService.getEventBySlug.and.returnValue(
      of({
        id: 'event-1',
        eventCallsign: 'W1AW',
      } as any),
    );
    userSettingsService.getUserEventApproval.and.returnValue(
      of({ status: 'Declined' } as any),
    );
    userSettingsService.settings.and.returnValue(of({ callsign: 'ADMIN1' }));
    userSettingsService.getApprovedUsers.and.returnValue(
      of([{ id: 'user-1', callsign: 'K1ABC' }] as any),
    );
    authService.userIsAdmin.and.returnValue(of(true));

    spyOn<any>(UploadComponent.prototype, 'loadUploadedFiles').and.resolveTo();
    spyOn<any>(UploadComponent.prototype, 'loadCombinedAdifDownloadUrl').and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [UploadComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthenticationService, useValue: authService },
        { provide: EventInfoService, useValue: eventInfoService },
        { provide: UserSettingsService, useValue: userSettingsService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'test-event' })),
          },
        },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['get']) },
        { provide: AUTH, useValue: jasmine.createSpyObj<Auth>('Auth', [], { currentUser: null }) },
        { provide: STORAGE, useValue: {} },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
  });

  it('should show a callsign dropdown for admins', async () => {
    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploadOperators()).toEqual([
      { userId: 'user-1', callsign: 'K1ABC' },
    ]);
    expect(component.selectedUploadUserId()).toBe('user-1');
    expect(component.canUploadTarget()).toBeTrue();
    expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
  });

  it('should hide the callsign dropdown for non-admins', async () => {
    authService.userIsAdmin.and.returnValue(of(false));

    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploadOperators()).toEqual([]);
    expect(component.canUploadTarget()).toBeFalse();
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });
});

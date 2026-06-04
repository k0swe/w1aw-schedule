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
  const createTimestamp = (millis: number) => ({
    toMillis: () => millis,
    toDate: () => new Date(millis),
  });

  const createComponent = async () => {
    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    const user$ = new BehaviorSubject<any>({ uid: 'admin-1' });
    authService = jasmine.createSpyObj<AuthenticationService>(
      'AuthenticationService',
      ['userIsAdmin'],
      { user$ },
    ) as jasmine.SpyObj<AuthenticationService> & { user$: BehaviorSubject<any> };
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
        name: 'Spring Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(Date.now() - 60_000),
        endTime: createTimestamp(Date.now() + 60_000),
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
    await createComponent();

    expect(component.uploadOperators()).toEqual([
      { userId: 'user-1', callsign: 'K1ABC' },
    ]);
    expect(component.selectedUploadUserId()).toBe('user-1');
    expect(component.canUploadTarget()).toBeTrue();
    expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
  });

  it('should hide the callsign dropdown for non-admins', async () => {
    authService.userIsAdmin.and.returnValue(of(false));

    await createComponent();

    expect(component.uploadOperators()).toEqual([]);
    expect(component.canUploadTarget()).toBeFalse();
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('should filter and sort upload operators by callsign', async () => {
    await createComponent();

    const uploadOperators = (component as any).toUploadOperators([
      { id: 'user-3', callsign: 'K3CCC' },
      { id: 'user-2' },
      { callsign: 'K2BBB' },
      { id: 'user-1', callsign: 'K1AAA' },
    ]);

    expect(uploadOperators).toEqual([
      { userId: 'user-1', callsign: 'K1AAA' },
      { userId: 'user-3', callsign: 'K3CCC' },
    ]);
  });

  it('should preserve a valid selected upload user', async () => {
    await createComponent();

    component.selectedUploadUserId.set('user-1');

    (component as any).syncSelectedUploadUserId(true, [
      { userId: 'user-1', callsign: 'K1ABC' },
      { userId: 'user-2', callsign: 'K2DEF' },
    ]);

    expect(component.selectedUploadUserId()).toBe('user-1');
  });

  it('should clear upload selection for non-admins', async () => {
    await createComponent();

    component.selectedUploadUserId.set('user-1');

    (component as any).syncSelectedUploadUserId(false, [
      { userId: 'user-1', callsign: 'K1ABC' },
    ]);

    expect(component.selectedUploadUserId()).toBe('');
  });

  it('should default upload selection to the current user when available', async () => {
    authService.user$.next({ uid: 'user-2' } as any);
    await createComponent();

    component.selectedUploadUserId.set('');

    (component as any).syncSelectedUploadUserId(true, [
      { userId: 'user-1', callsign: 'K1ABC' },
      { userId: 'user-2', callsign: 'K2DEF' },
    ]);

    expect(component.selectedUploadUserId()).toBe('user-2');
  });

  it('should default upload selection to the first operator otherwise', async () => {
    authService.user$.next({ uid: 'admin-1' } as any);
    await createComponent();

    component.selectedUploadUserId.set('');

    (component as any).syncSelectedUploadUserId(true, [
      { userId: 'user-1', callsign: 'K1ABC' },
      { userId: 'user-2', callsign: 'K2DEF' },
    ]);

    expect(component.selectedUploadUserId()).toBe('user-1');
  });

  it('should update the selected upload user and reload files when the admin changes operator', async () => {
    await createComponent();

    const loadUploadedFilesSpy = (component as any)
      .loadUploadedFiles as jasmine.Spy;
    loadUploadedFilesSpy.calls.reset();

    component.onUploadOperatorChange('user-2');

    expect(component.selectedUploadUserId()).toBe('user-2');
    expect(loadUploadedFilesSpy).toHaveBeenCalled();
  });

  it('should resolve the upload user ID for admins and operators', async () => {
    await createComponent();

    component.isEventAdmin.set(true);
    component.selectedUploadUserId.set('user-2');
    expect((component as any).getUploadUserId()).toBe('user-2');

    component.isEventAdmin.set(false);
    authService.user$.next({ uid: 'operator-1' } as any);
    expect((component as any).getUploadUserId()).toBe('operator-1');
  });

  it('should show a warning when the event has not started yet', async () => {
    const now = Date.now();
    eventInfoService.getEventBySlug.and.returnValue(
      of({
        id: 'event-1',
        name: 'Early Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now + 60_000),
        endTime: createTimestamp(now + 120_000),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBeTrue();
    const warningElement = fixture.nativeElement.querySelector(
      '.event-selection-warning',
    ) as HTMLElement | null;
    expect(warningElement).not.toBeNull();
    expect(warningElement?.textContent).toContain('Early Event');
    expect(warningElement?.textContent).toContain(
      'left navigation menu',
    );
  });

  it('should show a warning when the event ended more than a week ago', async () => {
    const now = Date.now();
    const eightDaysInMs = 8 * 24 * 60 * 60 * 1000;
    eventInfoService.getEventBySlug.and.returnValue(
      of({
        id: 'event-1',
        name: 'Past Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now - (eightDaysInMs + 60_000)),
        endTime: createTimestamp(now - eightDaysInMs),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBeTrue();
    const warningElement = fixture.nativeElement.querySelector(
      '.event-selection-warning',
    ) as HTMLElement | null;
    expect(warningElement).not.toBeNull();
    expect(warningElement?.textContent).toContain('Past Event');
  });

  it('should not show a warning during the event window', async () => {
    const now = Date.now();
    eventInfoService.getEventBySlug.and.returnValue(
      of({
        id: 'event-1',
        name: 'Current Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now - 60_000),
        endTime: createTimestamp(now + 60_000),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.event-selection-warning')).toBeNull();
  });
});

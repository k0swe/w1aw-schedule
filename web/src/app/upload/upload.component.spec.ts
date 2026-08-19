import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Auth } from 'firebase/auth';
import { BehaviorSubject, of } from 'rxjs';
import type { Mock, MockedObject } from 'vitest';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { AUTH, STORAGE } from '../firebase-rxjs';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { UploadComponent } from './upload.component';

describe('UploadComponent', () => {
  let fixture: ComponentFixture<UploadComponent>;
  let component: UploadComponent;
  let authService: MockedObject<AuthenticationService> & {
    user$: BehaviorSubject<any>;
  };
  let eventInfoService: MockedObject<EventInfoService>;
  let userSettingsService: MockedObject<UserSettingsService>;
  let snackBar: MockedObject<MatSnackBar>;
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
    authService = {
      userIsAdmin: vi.fn().mockName('AuthenticationService.userIsAdmin'),
      user$,
    } as unknown as MockedObject<AuthenticationService> & {
      user$: BehaviorSubject<any>;
    };
    eventInfoService = {
      getEventBySlug: vi.fn().mockName('EventInfoService.getEventBySlug'),
      getEventInfo: vi.fn().mockName('EventInfoService.getEventInfo'),
    } as unknown as MockedObject<EventInfoService>;
    eventInfoService.getEventInfo.mockReturnValue(of({} as any));
    userSettingsService = {
      init: vi.fn().mockName('UserSettingsService.init'),
      getUserEventApproval: vi
        .fn()
        .mockName('UserSettingsService.getUserEventApproval'),
      settings: vi.fn().mockName('UserSettingsService.settings'),
      getApprovedUsers: vi
        .fn()
        .mockName('UserSettingsService.getApprovedUsers'),
    } as unknown as MockedObject<UserSettingsService>;
    snackBar = {
      open: vi.fn().mockName('MatSnackBar.open'),
    } as unknown as MockedObject<MatSnackBar>;

    eventInfoService.getEventBySlug.mockReturnValue(
      of({
        id: 'event-1',
        name: 'Spring Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(Date.now() - 60000),
        endTime: createTimestamp(Date.now() + 60000),
      } as any),
    );
    userSettingsService.getUserEventApproval.mockReturnValue(
      of({ status: 'Declined' } as any),
    );
    userSettingsService.settings.mockReturnValue(of({ callsign: 'ADMIN1' }));
    userSettingsService.getApprovedUsers.mockReturnValue(
      of([{ id: 'user-1', callsign: 'K1ABC' }] as any),
    );
    authService.userIsAdmin.mockReturnValue(of(true));

    vi.spyOn(
      UploadComponent.prototype as any,
      'loadUploadedFiles',
    ).mockResolvedValue(undefined);
    vi.spyOn(
      UploadComponent.prototype as any,
      'loadCombinedAdifDownloadUrl',
    ).mockResolvedValue(undefined);

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
        {
          provide: HttpClient,
          useValue: {
            get: vi.fn().mockName('HttpClient.get'),
          },
        },
        {
          provide: AUTH,
          useValue: {
            currentUser: null,
          },
        },
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
    expect(component.canUploadTarget()).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-select')).not.toBeNull();
  });

  it('should hide the callsign dropdown for non-admins', async () => {
    authService.userIsAdmin.mockReturnValue(of(false));

    await createComponent();

    expect(component.uploadOperators()).toEqual([]);
    expect(component.canUploadTarget()).toBe(false);
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

    const loadUploadedFilesSpy = (component as any).loadUploadedFiles as Mock;
    loadUploadedFilesSpy.mockClear();

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
    eventInfoService.getEventBySlug.mockReturnValue(
      of({
        id: 'event-1',
        name: 'Early Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now + 60000),
        endTime: createTimestamp(now + 120000),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBe(true);
    const warningElement = fixture.nativeElement.querySelector(
      '.event-selection-warning',
    ) as HTMLElement | null;
    expect(warningElement).not.toBeNull();
    expect(warningElement?.textContent).toContain('Early Event');
    expect(warningElement?.textContent).toContain('left navigation menu');
  });

  it('should show a warning when the event ended more than a week ago', async () => {
    const now = Date.now();
    const eightDaysInMs = 8 * 24 * 60 * 60 * 1000;
    eventInfoService.getEventBySlug.mockReturnValue(
      of({
        id: 'event-1',
        name: 'Past Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now - (eightDaysInMs + 60000)),
        endTime: createTimestamp(now - eightDaysInMs),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBe(true);
    const warningElement = fixture.nativeElement.querySelector(
      '.event-selection-warning',
    ) as HTMLElement | null;
    expect(warningElement).not.toBeNull();
    expect(warningElement?.textContent).toContain('Past Event');
  });

  it('should not show a warning during the event window', async () => {
    const now = Date.now();
    eventInfoService.getEventBySlug.mockReturnValue(
      of({
        id: 'event-1',
        name: 'Current Event',
        eventCallsign: 'W1AW',
        startTime: createTimestamp(now - 60000),
        endTime: createTimestamp(now + 60000),
      } as any),
    );

    await createComponent();

    expect(component.shouldShowEventSelectionWarning()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.event-selection-warning'),
    ).toBeNull();
  });

  it('should show regeneration in progress when rerunStartedAt is recent', async () => {
    const recentTimestamp = createTimestamp(Date.now() - 5000);
    eventInfoService.getEventInfo.mockReturnValue(
      of({ rerunStartedAt: recentTimestamp } as any),
    );

    await createComponent();

    expect(component.rerunInProgress()).toBe(true);
    const statusEl = fixture.nativeElement.querySelector(
      '.rerun-in-progress',
    ) as HTMLElement | null;
    expect(statusEl).not.toBeNull();
    expect(statusEl?.textContent).toContain('Regeneration in progress');
  });

  it('should not show regeneration in progress when rerunStartedAt is absent', async () => {
    eventInfoService.getEventInfo.mockReturnValue(of({} as any));

    await createComponent();

    expect(component.rerunInProgress()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.rerun-in-progress'),
    ).toBeNull();
  });

  it('should not show regeneration in progress when rerunStartedAt is stale', async () => {
    const staleTimestamp = createTimestamp(Date.now() - 31 * 60 * 1000);
    eventInfoService.getEventInfo.mockReturnValue(
      of({ rerunStartedAt: staleTimestamp } as any),
    );

    await createComponent();

    expect(component.rerunInProgress()).toBe(false);
  });

  it('should load the combined ADIF URL when the rerun lock clears', async () => {
    const rerunSubject = new BehaviorSubject<any>({
      rerunStartedAt: createTimestamp(Date.now() - 5000),
    });
    eventInfoService.getEventInfo.mockReturnValue(rerunSubject.asObservable());

    await createComponent();

    // Reset the call count captured during initialization (rerun was active, so no call)
    const loadUrlSpy = (component as any).loadCombinedAdifDownloadUrl as Mock;
    loadUrlSpy.mockClear();

    // Simulate the rerun completing (lock cleared)
    rerunSubject.next({});
    expect(loadUrlSpy).toHaveBeenCalledTimes(1);
  });
});

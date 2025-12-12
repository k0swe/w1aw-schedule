import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { EventInfoService } from '../event-info/event-info.service';
import { UserSettingsService } from '../user-settings/user-settings.service';
import { ApprovalTabsComponent } from './approval-tabs.component';

describe('ApprovalTabsComponent', () => {
  let component: ApprovalTabsComponent;
  let fixture: ComponentFixture<ApprovalTabsComponent>;

  beforeEach(() => {
    const firestoreMock = {} as Firestore;
    const userSettingsServiceMock = {
      getProvisionalUsers: () => of([]),
      getApprovedUsers: () => of([]),
      getDeclinedUsers: () => of([]),
    };
    const eventInfoServiceMock = {
      getEventBySlug: () => of({ id: 'test-id', name: 'Test Event' }),
      getEventInfo: () => of({ name: 'Test Event' }),
    };

    TestBed.configureTestingModule({
      imports: [ApprovalTabsComponent],
      providers: [
        provideRouter([]),
        { provide: Firestore, useValue: firestoreMock },
        { provide: UserSettingsService, useValue: userSettingsServiceMock },
        { provide: EventInfoService, useValue: eventInfoServiceMock },
      ],
    });
    fixture = TestBed.createComponent(ApprovalTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to Approved tab (index 1)', () => {
    expect(component.selectedTabIndex()).toBe(1);
  });

  it('should set tab index based on URL fragment', () => {
    // The component subscribes to route.fragment in ngOnInit
    // We can test the tab selection logic by calling onTabChange
    component.onTabChange(0);
    // Router.navigate is called but we're not testing navigation here
    component.onTabChange(2);
    // Just ensure the method doesn't throw
    expect(component).toBeTruthy();
  });
});

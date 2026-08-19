import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Auth } from 'firebase/auth';
import { of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { EventInfoService } from '../event-info/event-info.service';
import { AUTH } from '../firebase-rxjs';
import { InitShiftsComponent } from './init-shifts.component';

describe('InitShiftsComponent', () => {
  let component: InitShiftsComponent;
  let fixture: ComponentFixture<InitShiftsComponent>;
  let eventInfoService: MockedObject<EventInfoService>;
  let http: MockedObject<HttpClient>;
  let auth: MockedObject<Auth>;
  let snackBar: MockedObject<MatSnackBar>;

  beforeEach(async () => {
    eventInfoService = {
      getAllEvents: vi.fn().mockName('EventInfoService.getAllEvents'),
    };
    http = {
      get: vi.fn().mockName('HttpClient.get'),
    };
    auth = {
      currentUser: null,
    };
    snackBar = {
      open: vi.fn().mockName('MatSnackBar.open'),
    };

    eventInfoService.getAllEvents.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [InitShiftsComponent, BrowserAnimationsModule],
      providers: [
        { provide: EventInfoService, useValue: eventInfoService },
        { provide: HttpClient, useValue: http },
        { provide: AUTH, useValue: auth },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InitShiftsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load events on init', () => {
    expect(eventInfoService.getAllEvents).toHaveBeenCalled();
  });

  it('should show error when no event is selected', async () => {
    component.selectedEventId.set(undefined);

    await component.initShifts();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Please select an event',
      'Close',
      { duration: 3000 },
    );
  });
});

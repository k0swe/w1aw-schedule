import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { EventInfoService } from '../event-info/event-info.service';
import { InitShiftsComponent } from './init-shifts.component';

describe('InitShiftsComponent', () => {
  let component: InitShiftsComponent;
  let fixture: ComponentFixture<InitShiftsComponent>;
  let eventInfoService: jasmine.SpyObj<EventInfoService>;
  let http: jasmine.SpyObj<HttpClient>;
  let auth: jasmine.SpyObj<Auth>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    eventInfoService = jasmine.createSpyObj('EventInfoService', [
      'getAllEvents',
    ]);
    http = jasmine.createSpyObj('HttpClient', ['get']);
    auth = jasmine.createSpyObj('Auth', [], { currentUser: null });
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    eventInfoService.getAllEvents.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [InitShiftsComponent, BrowserAnimationsModule],
      providers: [
        { provide: EventInfoService, useValue: eventInfoService },
        { provide: HttpClient, useValue: http },
        { provide: Auth, useValue: auth },
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

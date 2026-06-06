import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { of } from 'rxjs';
import { TWO_HOURS_IN_MS } from 'w1aw-schedule-shared';

import { FUNCTIONS } from '../../firebase-rxjs';
import { ScheduleService } from '../schedule.service';
import { ScheduleCellComponent } from './schedule-cell.component';

describe('ScheduleCellComponent', () => {
  let component: ScheduleCellComponent;
  let fixture: ComponentFixture<ScheduleCellComponent>;

  beforeEach(async () => {
    const functionsMock = {} as Functions;
    const firestoreMock = {} as Firestore;
    const scheduleServiceMock = {
      findShift: jasmine.createSpy('findShift').and.returnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [ScheduleCellComponent],
      providers: [
        { provide: FUNCTIONS, useValue: functionsMock },
        { provide: Firestore, useValue: firestoreMock },
        { provide: ScheduleService, useValue: scheduleServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleCellComponent);
    component = fixture.componentInstance;
    component.timeslot = new Date('2026-05-27T00:00:00Z');
    component.band = '20';
    component.mode = 'phone';
    component.eventId = 'event-1';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isNotAllowed', () => {
    it('should return true for 30m phone', () => {
      component.band = '30';
      component.mode = 'phone';
      expect(component.isNotAllowed()).toBeTrue();
    });

    it('should return false for 30m cw', () => {
      component.band = '30';
      component.mode = 'cw';
      expect(component.isNotAllowed()).toBeFalse();
    });

    it('should return false for 20m phone', () => {
      component.band = '20';
      component.mode = 'phone';
      expect(component.isNotAllowed()).toBeFalse();
    });
  });

  describe('buttonDisabled', () => {
    it('should be disabled for 30m phone regardless of other conditions', () => {
      component.band = '30';
      component.mode = 'phone';
      expect(component.buttonDisabled()).toBeTrue();
    });

    it('should be disabled for past shifts', () => {
      component.currentTimeMs = component.timeslot.getTime() + TWO_HOURS_IN_MS;

      expect(component.buttonDisabled()).toBeTrue();
    });

    it('should keep the admin menu trigger enabled for past shifts', () => {
      component.currentTimeMs = component.timeslot.getTime() + TWO_HOURS_IN_MS;
      fixture.componentRef.setInput('isAdmin', true);

      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const primaryButton = buttons[0].nativeElement as HTMLButtonElement;
      const adminMenuButton = buttons[1].nativeElement as HTMLButtonElement;

      expect(primaryButton.disabled).toBeTrue();
      expect(adminMenuButton.disabled).toBeFalse();
    });
  });
});

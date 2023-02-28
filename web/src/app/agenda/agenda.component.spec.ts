import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { Timestamp } from 'firebase/firestore';
import { of } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from '../schedule/schedule.service';
import { Shift } from '../schedule/shared-constants';
import { AgendaComponent } from './agenda.component';

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;
  const authServiceSpy = jasmine.createSpyObj(
    'AuthenticationService',
    {},
    { user$: of({ uid: 'a2c4', email: 'joe@example.com' }) }
  );
  const scheduleServiceSpy = jasmine.createSpyObj(
    'ScheduleService',
    {
      findUserShifts: of<Partial<Shift>[]>([
        { time: Timestamp.fromMillis(0), band: '20', mode: 'phone' },
        { time: Timestamp.fromMillis(0), band: '20', mode: 'phone' },
      ]),
    },
    {}
  );
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatCardModule],
      declarations: [AgendaComponent],
      providers: [
        {
          provide: AuthenticationService,
          useValue: authServiceSpy,
        },
        {
          provide: ScheduleService,
          useValue: scheduleServiceSpy,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

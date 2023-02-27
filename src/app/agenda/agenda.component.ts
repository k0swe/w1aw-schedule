import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthenticationService } from '../authentication/authentication.service';
import { ScheduleService } from '../schedule/schedule.service';
import { Shift } from '../schedule/shared-constants';

@Component({
  selector: 'kel-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss'],
})
export class AgendaComponent {
  userShifts$ = new BehaviorSubject<Shift[]>([]);

  constructor(
    private authenticationService: AuthenticationService,
    private scheduleService: ScheduleService
  ) {
    this.authenticationService.user$.subscribe((user) => {
      if (!user) {
        return;
      }
      this.scheduleService.findUserShifts(user.uid).subscribe((shifts) => {
        // sort by timestamp, ascending
        shifts.sort((a, b) => a.time.toMillis() - b.time.toMillis());
        this.userShifts$.next(shifts);
      });
    });
  }
}

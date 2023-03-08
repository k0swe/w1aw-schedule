import { Clipboard } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../environment/environment';
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
  icsLink = '';

  constructor(
    private authenticationService: AuthenticationService,
    private clipboard: Clipboard,
    private scheduleService: ScheduleService,
    private snackBarService: MatSnackBar
  ) {
    this.authenticationService.user$.subscribe((user) => {
      if (!user) {
        return;
      }
      this.icsLink = `${environment.functionBase}/calendar?uid=${user.uid}`;
      this.scheduleService.findUserShifts(user.uid).subscribe((shifts) => {
        // sort by timestamp, ascending
        shifts.sort((a, b) => a.time.toMillis() - b.time.toMillis());
        this.userShifts$.next(shifts);
      });
    });
  }

  copyIcsLink() {
    this.clipboard.copy(this.icsLink);
    this.snackBarService.open('Copied to clipboard', undefined, {
      duration: 2000,
    });
  }

  downloadIcs() {
    window.open(this.icsLink, '_blank');
  }
}

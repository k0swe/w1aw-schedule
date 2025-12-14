import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { EventInfoService } from '../event-info/event-info.service';
import { EventInfoWithId } from '../schedule/shared-constants';

interface InitShiftsResponse {
  shiftCount: number;
}

@Component({
  selector: 'kel-init-shifts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatOption,
    MatSelect,
  ],
  templateUrl: './init-shifts.component.html',
  styleUrls: ['./init-shifts.component.scss'],
})
export class InitShiftsComponent implements OnInit {
  private eventInfoService = inject(EventInfoService);
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private snackBar = inject(MatSnackBar);

  events$: Observable<EventInfoWithId[]> = of([]);
  selectedEventId = signal<string | undefined>(undefined);
  isLoading = signal(false);

  ngOnInit(): void {
    this.events$ = this.eventInfoService.getAllEvents();
  }

  onEventChange(eventId: string): void {
    this.selectedEventId.set(eventId);
  }

  async initShifts(): Promise<void> {
    const eventId = this.selectedEventId();
    if (!eventId) {
      this.snackBar.open('Please select an event', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading.set(true);

    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const url = `${environment.functionBase}/initShifts?eventId=${eventId}`;

      const result = await firstValueFrom(
        this.http.get<InitShiftsResponse>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      this.snackBar.open(
        `Successfully initialized ${result.shiftCount} shifts`,
        'Close',
        { duration: 5000 },
      );
    } catch (error: any) {
      console.error('Error initializing shifts:', error);
      this.snackBar.open(
        `Error initializing shifts: ${error.message || 'Unknown error'}`,
        'Close',
        { duration: 5000 },
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}

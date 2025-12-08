import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { Observable } from 'rxjs';

import {
  UserSettings,
  UserSettingsService,
} from '../user-settings/user-settings.service';
import { ApprovalListComponent } from './approval-list/approval-list.component';

@Component({
  selector: 'kel-approval-tabs',
  templateUrl: './approval-tabs.component.html',
  styleUrls: ['./approval-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatTabGroup,
    MatTab,
    ApprovalListComponent,
  ],
})
export class ApprovalTabsComponent {
  private userSettingsService = inject(UserSettingsService);

  provisionalUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getProvisionalUsers();
  approvedUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getApprovedUsers();
  declinedUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getDeclinedUsers();
}

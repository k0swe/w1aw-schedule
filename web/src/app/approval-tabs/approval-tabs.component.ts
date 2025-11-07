import { Component } from '@angular/core';
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
  provisionalUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getProvisionalUsers();
  approvedUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getApprovedUsers();
  declinedUsers$: Observable<UserSettings[]> =
    this.userSettingsService.getDeclinedUsers();

  constructor(private userSettingsService: UserSettingsService) {}
}

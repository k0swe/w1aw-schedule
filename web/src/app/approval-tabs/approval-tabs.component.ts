import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import {
  UserSettings,
  UserSettingsService,
} from '../user-settings/user-settings.service';

@Component({
  selector: 'kel-approval-tabs',
  templateUrl: './approval-tabs.component.html',
  styleUrls: ['./approval-tabs.component.scss'],
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

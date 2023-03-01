import { Component } from '@angular/core';

import { UserSettingsService } from '../user-settings/user-settings.service';

@Component({
  selector: 'kel-approval-list',
  templateUrl: './approval-list.component.html',
  styleUrls: ['./approval-list.component.scss'],
})
export class ApprovalListComponent {
  provisionalUsers$ = this.userSettingsService.getProvisionalUsers();

  constructor(private userSettingsService: UserSettingsService) {}

  approve(id: string) {
    this.userSettingsService.approve(id).subscribe();
  }

  decline(id: string) {
    this.userSettingsService.decline(id).subscribe();
  }
}

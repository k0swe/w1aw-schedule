import { Component } from '@angular/core';

import { UserSettingsService } from '../user-settings/user-settings.service';

@Component({
  selector: 'kel-approval-list',
  templateUrl: './approval-list.component.html',
  styleUrls: ['./approval-list.component.scss'],
})
export class ApprovalListComponent {
  provisionalUsers$ = this.userSettingsService.getProvisionalUsers();
  approvedUsers$ = this.userSettingsService.getApprovedUsers();
  declinedUsers$ = this.userSettingsService.getDeclinedUsers();
  approvedEmails: string = '';

  constructor(private userSettingsService: UserSettingsService) {
    this.approvedUsers$.subscribe((users) => {
      this.approvedEmails = users
        .map((u) => u.payload.doc.data().email)
        .join(', ');
    });
  }

  approve(id: string) {
    this.userSettingsService.approve(id).subscribe();
  }

  decline(id: string) {
    this.userSettingsService.decline(id).subscribe();
  }
}

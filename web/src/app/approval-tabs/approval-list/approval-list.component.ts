import { NgIf } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import { Observable, Subscription, of } from 'rxjs';

import {
  UserSettings,
  UserSettingsService,
} from '../../user-settings/user-settings.service';

@Component({
  selector: 'kel-approval-list',
  templateUrl: './approval-list.component.html',
  styleUrls: ['./approval-list.component.scss'],
  imports: [
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    MatIcon,
    NgIf,
    MatIconButton,
    MatSlideToggle,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
  ],
})
export class ApprovalListComponent implements OnInit, OnDestroy {
  @Input() userList: Observable<UserSettings[]> = of([]);
  @Input() displayColumns = ['name', 'callsign', 'email'];
  @Input() emptyMessage = 'No users to display';
  userDataSource = new MatTableDataSource<UserSettings>();
  @ViewChild(MatSort, { static: true }) sort = new MatSort();
  userListSubscription: Subscription | null = null;

  constructor(private userSettingsService: UserSettingsService) {}

  ngOnInit() {
    this.sort.sort({ id: 'callsign', start: 'asc', disableClear: false });
    this.userListSubscription = this.userList.subscribe((users) => {
      this.userDataSource.data = users;
      this.userDataSource.sort = this.sort;
    });
  }

  ngOnDestroy() {
    this.userListSubscription?.unsubscribe();
  }

  approve(id: string) {
    this.userSettingsService.approve(id).subscribe();
  }

  decline(id: string) {
    this.userSettingsService.decline(id).subscribe();
  }

  delete(id: string) {
    this.userSettingsService.delete(id).subscribe();
  }

  setMultiShift(id: string, value: boolean) {
    this.userSettingsService.setMultiShift(id, value).subscribe();
  }
}

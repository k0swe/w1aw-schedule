import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
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
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatIconButton,
    MatSlideToggle,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
  ],
})
export class ApprovalListComponent implements OnInit, OnChanges, OnDestroy {
  private userSettingsService = inject(UserSettingsService);

  @Input() userList: Observable<UserSettings[]> = of([]);
  @Input() displayColumns = ['name', 'callsign', 'email'];
  @Input() emptyMessage = 'No users to display';
  @Input({ required: true }) eventId!: string;
  userDataSource = new MatTableDataSource<UserSettings>();
  @ViewChild(MatSort, { static: true }) sort = new MatSort();
  userListSubscription: Subscription | null = null;

  ngOnInit() {
    this.sort.sort({ id: 'callsign', start: 'asc', disableClear: false });
    this.subscribeToUserList();
  }

  ngOnChanges(changes: SimpleChanges) {
    // When userList input changes, resubscribe to the new observable
    if (changes['userList'] && !changes['userList'].firstChange) {
      this.subscribeToUserList();
    }
  }

  private subscribeToUserList() {
    // Unsubscribe from previous subscription if it exists
    this.userListSubscription?.unsubscribe();
    
    // Subscribe to the new userList observable
    this.userListSubscription = this.userList.subscribe((users) => {
      this.userDataSource.data = users;
      this.userDataSource.sort = this.sort;
    });
  }

  ngOnDestroy() {
    this.userListSubscription?.unsubscribe();
  }

  approve(id: string) {
    this.userSettingsService.approve(id, this.eventId).subscribe();
  }

  decline(id: string) {
    this.userSettingsService.decline(id, this.eventId).subscribe();
  }

  delete(id: string) {
    this.userSettingsService.delete(id).subscribe();
  }

  setMultiShift(id: string, value: boolean) {
    this.userSettingsService.setMultiShift(id, value).subscribe();
  }
}

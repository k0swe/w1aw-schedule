import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { ApprovalListRoutingModule } from './approval-list-routing.module';
import { ApprovalListComponent } from './approval-list.component';

@NgModule({
  declarations: [ApprovalListComponent],
  imports: [
    CommonModule,
    ApprovalListRoutingModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ApprovalListModule {}

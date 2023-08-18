import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { ApprovalListComponent } from './approval-list/approval-list.component';
import { ApprovalTabsRoutingModule } from './approval-tabs-routing.module';
import { ApprovalTabsComponent } from './approval-tabs.component';

@NgModule({
  declarations: [ApprovalTabsComponent, ApprovalListComponent],
  imports: [
    ApprovalTabsRoutingModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
  ],
  exports: [ApprovalTabsComponent],
})
export class ApprovalTabsModule {}

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { ApprovalListRoutingModule } from './approval-list-routing.module';
import { ApprovalListComponent } from './approval-list.component';

@NgModule({
  declarations: [ApprovalListComponent],
  imports: [
    ApprovalListRoutingModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTabsModule,
  ],
})
export class ApprovalListModule {}

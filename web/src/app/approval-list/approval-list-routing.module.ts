import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminGuard } from '../authentication/admin.guard';
import { AuthenticationGuard } from '../authentication/authentication.guard';
import { ApprovalListComponent } from './approval-list.component';

const routes: Routes = [
  {
    path: '',
    component: ApprovalListComponent,
    canActivate: [AuthenticationGuard, AdminGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApprovalListRoutingModule {}

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthenticationGuard } from '../authentication/authentication.guard';
import { AgendaComponent } from './agenda.component';

const routes: Routes = [
  { path: '', component: AgendaComponent, canActivate: [AuthenticationGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AgendaRoutingModule {}

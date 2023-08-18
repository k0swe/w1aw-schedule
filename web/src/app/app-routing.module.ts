import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./login/login.module').then((m) => m.LoginModule),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./user-settings/user-settings.module').then(
        (m) => m.UserSettingsModule,
      ),
  },
  {
    path: 'schedule',
    loadChildren: () =>
      import('./schedule/schedule.module').then((m) => m.ScheduleModule),
  },
  {
    path: 'agenda',
    loadChildren: () =>
      import('./agenda/agenda.module').then((m) => m.AgendaModule),
  },
  {
    path: 'approvals',
    loadChildren: () =>
      import('./approval-tabs/approval-tabs.module').then(
        (m) => m.ApprovalTabsModule,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

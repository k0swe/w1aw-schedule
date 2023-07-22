import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AgendaRoutingModule } from './agenda-routing.module';
import { AgendaComponent } from './agenda.component';

@NgModule({
  declarations: [AgendaComponent],
  imports: [CommonModule, AgendaRoutingModule, MatCardModule, MatButtonModule],
})
export class AgendaModule {}

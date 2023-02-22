import { Component } from '@angular/core';
import {environment} from "../environment/environment";

@Component({
  selector: 'kel-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  appName = environment.appName;
}

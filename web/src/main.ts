import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from './environments/environment';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            AngularFireAuthModule, 
            AngularFireModule.initializeApp(environment.firebase), 
            AngularFirestoreModule.enablePersistence()
        ),
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations(),
        provideRouter(routes)
    ]
})
  .catch((err) => console.error(err));

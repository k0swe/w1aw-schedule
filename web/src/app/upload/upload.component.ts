import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { FirebaseStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { Subject } from 'rxjs';
import { map, switchMap, take, takeUntil } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { STORAGE } from '../firebase-rxjs';

@Component({
  selector: 'kel-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardActions,
    MatButton,
    MatIcon,
    MatProgressBar,
  ],
})
export class UploadComponent implements OnDestroy {
  private authService = inject(AuthenticationService);
  private eventInfoService = inject(EventInfoService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private storage = inject<FirebaseStorage>(STORAGE);
  private destroy$ = new Subject<void>();

  eventId = signal<string>('');
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  selectedFile = signal<File | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => {
          const slug = params.get('slug');
          if (!slug)
            throw new Error(
              'Event slug parameter is missing from route. Expected format: /events/:slug/upload',
            );
          return slug;
        }),
        switchMap((slug) =>
          this.eventInfoService.getEventBySlug(slug).pipe(
            take(1),
            map((eventInfo) => {
              if (!eventInfo)
                throw new Error(`Event not found for slug: ${slug}`);
              return eventInfo.id;
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (eventId) => this.eventId.set(eventId),
        error: (err) => {
          console.error('[UploadComponent] Failed to resolve event:', err);
          this.snackBar.open(
            'Failed to load event. Please try again.',
            undefined,
            { duration: 5000 },
          );
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  upload(): void {
    const file = this.selectedFile();
    const user = this.authService.user$.getValue();
    if (!file || !user) return;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const unixTime = Date.now();
    const storagePath = `original/${user.uid}/${unixTime}-${baseName}.adi`;
    const storageRef = ref(this.storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.uploadProgress.set(Math.round(progress));
      },
      (error) => {
        this.uploading.set(false);
        console.error('[UploadComponent] Upload failed:', error);
        this.snackBar.open(
          'Upload failed. Please try again.',
          undefined,
          { duration: 5000 },
        );
      },
      () => {
        this.uploading.set(false);
        this.selectedFile.set(null);
        this.snackBar.open('Log uploaded successfully!', undefined, {
          duration: 5000,
        });
      },
    );
  }
}

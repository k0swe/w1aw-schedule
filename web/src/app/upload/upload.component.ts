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
import {
  FirebaseStorage,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable,
  type UploadMetadata,
} from 'firebase/storage';
import { Subject } from 'rxjs';
import { map, switchMap, take, takeUntil } from 'rxjs/operators';

import { AuthenticationService } from '../authentication/authentication.service';
import { EventInfoService } from '../event-info/event-info.service';
import { STORAGE } from '../firebase-rxjs';
import { UserSettingsService } from '../user-settings/user-settings.service';

type UploadedLogFile = {
  path: string;
  fileName: string;
  uploadedAt: number | null;
  uploadedAtDisplay: string;
};

const LEGACY_TIMESTAMP_PREFIX_REGEX = /^\d{10,13}-/;
const UPLOAD_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

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
  private userSettingsService = inject(UserSettingsService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private storage = inject<FirebaseStorage>(STORAGE);
  private destroy$ = new Subject<void>();

  eventId = signal<string>('');
  uploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  selectedFile = signal<File | null>(null);
  isApprovedOperator = signal<boolean | null>(null);
  loadingUploadedFiles = signal<boolean>(false);
  uploadedFiles = signal<UploadedLogFile[]>([]);

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
        switchMap((eventId) =>
          this.userSettingsService.getUserEventApproval(eventId).pipe(
            map((approval) => ({
              eventId,
              isApproved: approval?.status === 'Approved',
            })),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ eventId, isApproved }) => {
          this.eventId.set(eventId);
          this.isApprovedOperator.set(isApproved);
          void this.loadUploadedFiles().catch((error) => {
            console.error(
              '[UploadComponent] Failed to initialize uploaded logs list:',
              error,
            );
          });
        },
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
    if (this.isApprovedOperator() !== true) {
      this.snackBar.open(
        'You must be approved for this event before uploading logs.',
        undefined,
        { duration: 5000 },
      );
      return;
    }

    const file = this.selectedFile();
    const user = this.authService.user$.getValue();
    if (!file || !user) return;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const unixTime = Date.now();
    const storagePath = `${this.eventId()}/original/${user.uid}/${unixTime}-${baseName}.adi`;
    const storageRef = ref(this.storage, storagePath);
    const metadata: UploadMetadata = {
      contentType: 'text/plain; charset=utf-8',
      customMetadata: {
        originalFileName: file.name,
      },
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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
        void this.loadUploadedFiles().catch((error) => {
          console.error(
            '[UploadComponent] Failed to refresh uploaded logs list:',
            error,
          );
        });
        this.snackBar.open('Log uploaded successfully!', undefined, {
          duration: 5000,
        });
      },
    );
  }

  private async loadUploadedFiles(): Promise<void> {
    const user = this.authService.user$.getValue();
    const eventId = this.eventId();
    if (!user || !eventId) {
      this.uploadedFiles.set([]);
      return;
    }

    this.loadingUploadedFiles.set(true);

    try {
      const listRef = ref(this.storage, `${eventId}/original/${user.uid}`);
      const listed = await listAll(listRef);

      const uploadedFiles = await Promise.all(
        listed.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const originalFileName =
            metadata.customMetadata?.['originalFileName'];
          const trimmedOriginalFileName = originalFileName?.trim() || '';
          const uploadDate = metadata.timeCreated
            ? new Date(metadata.timeCreated)
            : null;
          return {
            path: itemRef.fullPath,
            fileName:
              trimmedOriginalFileName ||
              itemRef.name.replace(LEGACY_TIMESTAMP_PREFIX_REGEX, ''),
            uploadedAt: uploadDate?.getTime() ?? null,
            uploadedAtDisplay: uploadDate
              ? UPLOAD_TIME_FORMATTER.format(uploadDate)
              : 'Unknown',
          };
        }),
      );

      uploadedFiles.sort(
        (a, b) =>
          (b.uploadedAt ?? Number.NEGATIVE_INFINITY) -
          (a.uploadedAt ?? Number.NEGATIVE_INFINITY),
      );
      this.uploadedFiles.set(uploadedFiles);
    } catch (error) {
      console.error('[UploadComponent] Failed to list uploaded logs:', error);
      this.uploadedFiles.set([]);
      this.snackBar.open('Failed to load uploaded logs.', undefined, {
        duration: 5000,
      });
    } finally {
      this.loadingUploadedFiles.set(false);
    }
  }
}

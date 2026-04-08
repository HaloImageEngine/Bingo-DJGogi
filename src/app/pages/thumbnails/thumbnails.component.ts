import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ThumbnailImage } from '../../models/thumbnail.model';
import { ThumbnailService } from '../../services/thumbnail.service';

@Component({
  selector: 'app-thumbnails',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thumbnails.component.html',
  styleUrl: './thumbnails.component.scss'
})
export class ThumbnailsComponent implements OnInit {
  private readonly thumbnailService = inject(ThumbnailService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly images = signal<ThumbnailImage[]>([]);

  readonly totalCount = computed(() => this.images().length);
  readonly approvedCount = computed(() => this.images().filter(i => i.Approved).length);

  readonly trackById = (_index: number, img: ThumbnailImage) => img.ImageId;

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.loading.set(true);
    this.error.set(null);

    this.thumbnailService
      .getImages()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Unable to load images. Please try again.');
          console.error('Thumbnail load failed', err);
          return of<ThumbnailImage[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(items => this.images.set(items));
  }

  navigateToDetail(image: ThumbnailImage): void {
    this.router.navigate(['/thumbnail-detail', image.ImageId], { state: { image } });
  }
}

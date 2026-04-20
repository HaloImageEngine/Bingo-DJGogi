import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ModelSongDisplay } from '../../models/model-song-display.model';
import { SongService } from '../../services/song.service';

@Component({
  selector: 'app-songs-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './songslist.component.html',
  styleUrl: './songslist.component.css'
})
export class SongsListComponent implements OnInit {
  private readonly songService = inject(SongService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);

  readonly totalCount = computed(() => this.songs().length);
  readonly activeCount = computed(() => this.songs().filter(song => song.Active).length);

  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;

  ngOnInit(): void {
    this.loadSongs();
  }

  loadSongs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.songService
      .getSongs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Songs list load failed', err);
          this.error.set('Unable to load songs right now.');
          return of<ModelSongDisplay[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(songs => {
        const sortedSongs = [...songs].sort((left, right) => {
          const leftTitle = left.Title ?? '';
          const rightTitle = right.Title ?? '';
          return leftTitle.localeCompare(rightTitle);
        });

        this.songs.set(sortedSongs);
      });
  }

  songDetailLink(song: ModelSongDisplay): string[] {
    return ['/console/songs', this.songService.getSongRouteId(song)];
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }
}

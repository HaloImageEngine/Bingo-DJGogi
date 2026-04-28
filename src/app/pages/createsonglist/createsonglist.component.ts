import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { ModelSongDisplay } from '../../models/model-song-display.model';
import { SongService } from '../../services/song.service';

@Component({
  selector: 'app-create-song-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './createsonglist.component.html',
  styleUrl: './createsonglist.component.scss'
})
export class CreateSongListComponent implements OnInit {
  private readonly songService = inject(SongService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly selectedSongs = signal<ModelSongDisplay[]>([]);
  readonly searchTerm = signal('');

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedIds = new Set(this.selectedSongs().map(song => song.song_id));

    return this.songs().filter(song => {
      if (selectedIds.has(song.song_id)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const title = (song.Title ?? '').toLowerCase();
      const artist = (song.Artist ?? '').toLowerCase();
      const genre = (song.Genre ?? '').toLowerCase();

      return title.includes(term) || artist.includes(term) || genre.includes(term);
    });
  });

  readonly songCount = computed(() => this.songs().length);
  readonly selectedCount = computed(() => this.selectedSongs().length);
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
          console.error('Create song list load failed', err);
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

  addSong(song: ModelSongDisplay): void {
    if (this.selectedSongs().some(item => item.song_id === song.song_id)) {
      return;
    }

    this.selectedSongs.update(list => [...list, song]);
  }

  removeSong(song: ModelSongDisplay): void {
    this.selectedSongs.update(list => list.filter(item => item.song_id !== song.song_id));
  }

  clearSelection(): void {
    this.selectedSongs.set([]);
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

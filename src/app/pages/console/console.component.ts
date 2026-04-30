import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BingoCalledSong, BingoTopCard, BingoWinnerResult } from '../../models/bingo-game.model';
import { Song } from '../../models/song.model';
import { BingoGameService } from '../../services/bingo-game.service';

export type GameStatus = 'idle' | 'active' | 'paused' | 'finished';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './console.component.html',
  styleUrl: './console.component.css'
})
export class ConsoleComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly bingoGameService = inject(BingoGameService);
  readonly gameId = signal(1);
  readonly topCardsCount = 5;

  // --- Game state ---
  gameStatus = signal<GameStatus>('idle');
  roundNumber = signal(1);
  gameActionError = signal<string | null>(null);
  gameActionMessage = signal<string | null>(null);
  gameActionLoading = signal(false);
  topCards = signal<BingoTopCard[]>([]);

  // --- Song pool & playlist ---
  allSongs = signal<Song[]>([]);
  playlist = signal<Song[]>([]);
  calledSongs = signal<Song[]>([]);
  currentSong = signal<Song | null>(null);

  // --- Filters ---
  searchTerm = signal('');
  genreFilter = signal('');
  decadeFilter = signal('');
  difficultyFilter = signal('');

  // --- Computed ---
  remainingCount = computed(() =>
    this.playlist().length - this.calledSongs().length
  );

  calledCount = computed(() => this.calledSongs().length);

  filteredSongs = computed(() => {
    let songs = this.allSongs();
    const term = this.searchTerm().toLowerCase();
    const genre = this.genreFilter();
    const decade = this.decadeFilter();
    const difficulty = this.difficultyFilter();

    if (term) {
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term)
      );
    }
    if (genre) songs = songs.filter(s => s.genre === genre);
    if (decade) songs = songs.filter(s => s.decade === decade);
    if (difficulty) songs = songs.filter(s => s.difficulty === difficulty);

    return songs;
  });

  uniqueGenres = computed(() =>
    [...new Set(this.allSongs().map(s => s.genre).filter(Boolean))] as string[]
  );

  uniqueDecades = computed(() =>
    [...new Set(this.allSongs().map(s => s.decade).filter(Boolean))] as string[]
  );

  constructor() {
    this.loadSampleSongs();
  }

  // --- Song calling panel ---
  manualSongId = signal<number | null>(null);
  callSongLoading = signal(false);
  callSongError = signal<string | null>(null);
  winnerResult = signal<BingoWinnerResult | null>(null);

  // --- Game controls ---
  startGame(): void {
    if (this.playlist().length === 0 || this.gameActionLoading()) return;

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .startNewGame(this.gameId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.Success) {
            this.gameActionError.set('Unable to start a new game right now.');
            return;
          }

          this.gameStatus.set('active');
          this.calledSongs.set([]);
          this.currentSong.set(null);
          this.roundNumber.set(1);
        },
        error: error => {
          console.error('Start game failed', error);
          this.gameActionError.set('Unable to start a new game right now.');
        },
        complete: () => this.gameActionLoading.set(false)
      });
  }

  clearCards(): void {
    if (this.gameActionLoading()) return;

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .clearAllCalledFlags(this.gameId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.Success) {
            this.gameActionError.set('Unable to clear called cards right now.');
            return;
          }

          this.calledSongs.set([]);
          this.currentSong.set(null);
          this.roundNumber.set(1);
          this.gameActionMessage.set(
            `Success: ${result.Success} | GameID: ${result.GameID} | ReturnValue: ${result.ReturnValue}`
          );
        },
        error: error => {
          console.error('Clear cards failed', error);
          this.gameActionError.set(this.formatActionError(error, 'Unable to clear called cards right now.'));
        },
        complete: () => this.gameActionLoading.set(false)
      });
  }

  clearCalled(): void {
    if (this.gameActionLoading()) return;

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .clearAllCalledSongs(this.gameId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.Success) {
            this.gameActionError.set('Unable to clear called songs right now.');
            return;
          }

          this.calledSongs.set([]);
          this.winnerResult.set(null);
          this.gameActionMessage.set(
            `Success: ${result.Success} | GameID: ${result.GameID} | ReturnValue: ${result.ReturnValue}`
          );
        },
        error: error => {
          console.error('Clear called songs failed', error);
          this.gameActionError.set('Unable to clear called songs right now.');
        },
        complete: () => this.gameActionLoading.set(false)
      });
  }

  getTopCards(): void {
    if (this.gameActionLoading()) return;

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .getTopCards(this.gameId(), this.topCardsCount)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cards => {
          this.topCards.set(cards);
        },
        error: error => {
          console.error('Get top cards failed', error);
          this.gameActionError.set('Unable to load top cards right now.');
        },
        complete: () => this.gameActionLoading.set(false)
      });
  }

  getCalledSongs(): void {
    if (this.gameActionLoading()) return;

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .getCalledSongs(this.gameId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: calledSongs => {
          this.calledSongs.set(calledSongs.map(song => this.mapCalledSongToSong(song)));
        },
        error: error => {
          console.error('Get called songs failed', error);
          this.gameActionError.set('Unable to load called songs right now.');
        },
        complete: () => this.gameActionLoading.set(false)
      });
  }

  updateGameId(value: string | number | null): void {
    const nextGameId = Number(value);

    if (!Number.isInteger(nextGameId) || nextGameId <= 0 || nextGameId > 999) {
      return;
    }

    this.gameId.set(nextGameId);
  }

  pauseGame(): void {
    this.gameStatus.set('paused');
  }

  resumeGame(): void {
    this.gameStatus.set('active');
  }

  endGame(): void {
    this.gameStatus.set('finished');
    this.currentSong.set(null);
  }

  resetGame(): void {
    this.gameStatus.set('idle');
    this.calledSongs.set([]);
    this.currentSong.set(null);
    this.roundNumber.set(1);
  }

  // --- Manual song call ---
  callSongManual(): void {
    const songId = this.manualSongId();
    if (songId === null || songId <= 0 || this.callSongLoading()) return;

    const gameId = this.gameId();
    this.callSongLoading.set(true);
    this.callSongError.set(null);
    this.winnerResult.set(null);

    this.bingoGameService
      .callSongByNumber(gameId, songId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.manualSongId.set(null);
          this.refreshCalledSongsAfterCall(gameId);
        },
        error: err => {
          console.error('Call song failed', err);
          this.callSongError.set('Failed to call song. Please try again.');
          this.callSongLoading.set(false);
        }
      });
  }

  private refreshCalledSongsAfterCall(gameId: number): void {
    this.bingoGameService
      .getCalledSongs(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: calledSongs => {
          this.calledSongs.set(calledSongs.map(song => this.mapCalledSongToSong(song)));

          this.bingoGameService
            .checkForWinner(gameId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: winner => {
                this.winnerResult.set(winner);

                this.bingoGameService
                  .getTopCards(gameId, this.topCardsCount)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: cards => this.topCards.set(cards),
                    error: err => console.error('Get top cards failed', err),
                    complete: () => this.callSongLoading.set(false)
                  });
              },
              error: err => {
                console.error('Check for winner failed', err);
                this.callSongLoading.set(false);
              }
            });
        },
        error: err => {
          console.error('Get called songs failed', err);
          this.callSongError.set('Failed to refresh the called songs list.');
          this.callSongLoading.set(false);
        }
      });
  }

  private mapCalledSongToSong(song: BingoCalledSong): Song {
    const librarySong = this.allSongs().find(item => item.song_id === song.SongID);

    return librarySong ?? {
      song_id: song.SongID,
      title: song.SongTitle,
      artist: song.SongArtist,
      play_count: 0,
      active: true
    };
  }

  private formatActionError(error: unknown, fallbackMessage: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallbackMessage;
    }

    const body = error.error as Record<string, unknown> | null;
    const status = error.status ? `HTTP ${error.status}` : 'Request failed';

    if (body && typeof body === 'object') {
      const success = body['Success'];
      const gameId = body['GameID'];
      const returnValue = body['ReturnValue'];

      if (success !== undefined || gameId !== undefined || returnValue !== undefined) {
        return `${status} | Success: ${String(success)} | GameID: ${String(gameId)} | ReturnValue: ${String(returnValue)}`;
      }
    }

    const errorMessage = typeof error.error === 'string' && error.error.trim().length > 0
      ? error.error.trim()
      : error.message;

    return `${status} | ${errorMessage || fallbackMessage}`;
  }

  // --- Song calling ---
  callNextSong(): void {
    const remaining = this.playlist().filter(
      s => !this.calledSongs().some(c => c.song_id === s.song_id)
    );
    if (remaining.length === 0) {
      this.endGame();
      return;
    }
    const index = Math.floor(Math.random() * remaining.length);
    const next = remaining[index];
    this.currentSong.set(next);
    this.calledSongs.update(list => [...list, next]);
  }

  callSpecificSong(song: Song): void {
    if (this.calledSongs().some(c => c.song_id === song.song_id)) return;
    this.currentSong.set(song);
    this.calledSongs.update(list => [...list, song]);
  }

  // --- Playlist management ---
  addToPlaylist(song: Song): void {
    if (this.playlist().some(s => s.song_id === song.song_id)) return;
    this.playlist.update(list => [...list, song]);
  }

  removeFromPlaylist(song: Song): void {
    this.playlist.update(list => list.filter(s => s.song_id !== song.song_id));
  }

  addAllFiltered(): void {
    const current = this.playlist();
    const toAdd = this.filteredSongs().filter(
      s => !current.some(p => p.song_id === s.song_id)
    );
    this.playlist.update(list => [...list, ...toAdd]);
  }

  clearPlaylist(): void {
    this.playlist.set([]);
  }

  shufflePlaylist(): void {
    const shuffled = [...this.playlist()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.playlist.set(shuffled);
  }

  isInPlaylist(song: Song): boolean {
    return this.playlist().some(s => s.song_id === song.song_id);
  }

  isCalled(song: Song): boolean {
    return this.calledSongs().some(c => c.song_id === song.song_id);
  }

  formatDuration(seconds?: number | null): string {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- Sample data (replace with API call) ---
  private loadSampleSongs(): void {
    this.allSongs.set([
      { song_id: 1, title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', subgenre: 'Classic Rock', mood: 'Epic', tempo: 'slow', release_year: 1975, decade: '70s', era: 'Classic', bingo_category: 'Karaoke Anthem', difficulty: 'easy', play_count: 0, duration_seconds: 354, active: true },
      { song_id: 2, title: 'Rolling in the Deep', artist: 'Adele', genre: 'Pop', subgenre: 'Soul Pop', mood: 'Powerful', tempo: 'medium', release_year: 2010, decade: '10s', era: 'Modern', bingo_category: 'Wedding Classic', difficulty: 'easy', play_count: 0, duration_seconds: 228, active: true },
      { song_id: 3, title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop', subgenre: 'Neo Soul', mood: 'Happy', tempo: 'fast', release_year: 2013, decade: '10s', era: 'Modern', bingo_category: 'Dancefloor Filler', difficulty: 'easy', play_count: 0, duration_seconds: 233, active: true },
      { song_id: 4, title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop', subgenre: 'Synth Pop', mood: 'Energetic', tempo: 'fast', release_year: 2019, decade: '10s', era: 'Current', bingo_category: 'Dancefloor Filler', difficulty: 'medium', play_count: 0, duration_seconds: 200, active: true },
      { song_id: 5, title: 'Mr. Brightside', artist: 'The Killers', genre: 'Rock', subgenre: 'Indie Rock', mood: 'Energetic', tempo: 'fast', release_year: 2003, decade: '00s', era: 'Retro', bingo_category: 'Karaoke Anthem', difficulty: 'medium', play_count: 0, duration_seconds: 222, active: true },
    ]);
  }
}

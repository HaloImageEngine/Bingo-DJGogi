import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BingoCalledSong, BingoCallListSongByGci, BingoTopCard, BingoWinnerResult } from '../../models/bingo-game.model';
import { Song } from '../../models/song.model';
import { ActiveGameService } from '../../services/active-game.service';
import { BingoGameService } from '../../services/bingo-game.service';
import { ConsoleContextService } from '../../services/console-context.service';

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
  private readonly activeGameService = inject(ActiveGameService);
  private readonly bingoGameService = inject(BingoGameService);
  private readonly consoleContextService = inject(ConsoleContextService);
  readonly gameId = signal(1);
  readonly topCardsCount = 5;
  readonly activeGame = this.activeGameService.activeGame;
  readonly activeGameExpiresAt = computed(() => {
    const expiresAt = this.activeGameService.expiresAt();

    if (!expiresAt) {
      return 'Inactive';
    }

    return new Date(expiresAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  });

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
  playlistLoading = signal(false);
  playlistError = signal<string | null>(null);
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
    this.applyStoredConsoleContext();
  }

  // --- Song calling panel ---
  callListId = signal<number | null>(null);
  inning = signal<number | null>(1);
  manualSongId = signal<number | null>(null);
  callSongLoading = signal(false);
  callSongError = signal<string | null>(null);
  winnerResult = signal<BingoWinnerResult | null>(null);

  // --- Game controls ---
  startGame(): void {
    if (this.playlist().length === 0 || this.gameActionLoading()) return;

    const callListId = this.callListId();
    const inning = this.inning();

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .clearAllCalledFlags(this.gameId(), callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!result.Success) {
            this.gameActionError.set('Unable to start a new game right now.');
            return;
          }

          this.gameStatus.set('active');
          this.activeGameService.setActive(true);
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

    const callListId = this.callListId();
    const inning = this.inning();

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .clearAllCalledFlags(this.gameId(), callListId, inning)
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
            `Success: ${result.Success} | GameID: ${result.GameID} | CallListID: ${result.CallListID ?? '-'} | Inning: ${result.Inning ?? '-'} | ReturnValue: ${result.ReturnValue}`
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

    const callListId = this.callListId();
    const inning = this.inning();

    this.gameActionLoading.set(true);
    this.gameActionError.set(null);
    this.gameActionMessage.set(null);

    this.bingoGameService
      .clearAllCalledSongs(this.gameId(), callListId, inning)
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
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  updateCallListId(value: string | number | null): void {
    const nextCallListId = Number(value);

    if (!Number.isInteger(nextCallListId) || nextCallListId <= 0) {
      this.callListId.set(null);
      this.resetPlaylistState();
      this.syncConsoleContext();
      return;
    }

    this.callListId.set(nextCallListId);
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  updateInning(value: string | number | null): void {
    const nextInning = Number(value);

    if (!Number.isInteger(nextInning) || nextInning <= 0) {
      this.inning.set(null);
      this.resetPlaylistState();
      this.syncConsoleContext();
      return;
    }

    this.inning.set(nextInning);
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  pauseGame(): void {
    this.gameStatus.set('paused');
    this.activeGameService.setActive(false);
  }

  resumeGame(): void {
    this.gameStatus.set('active');
    this.activeGameService.setActive(true);
  }

  endGame(): void {
    this.gameStatus.set('finished');
    this.activeGameService.setActive(false);
    this.currentSong.set(null);
  }

  resetGame(): void {
    this.gameStatus.set('idle');
    this.activeGameService.setActive(false);
    this.calledSongs.set([]);
    this.currentSong.set(null);
    this.roundNumber.set(1);
  }

  updateActiveGame(value: boolean | string): void {
    this.activeGameService.setActive(value === true || value === 'true');
  }

  // --- Manual song call ---
  callSongManual(): void {
    const songId = this.manualSongId();
    if (songId === null || songId <= 0 || this.callSongLoading()) return;

    const gameId = this.gameId();
    const callListId = this.callListId();
    const inning = this.inning();
    this.callSongLoading.set(true);
    this.callSongError.set(null);
    this.winnerResult.set(null);

    this.bingoGameService
      .callSongByNumber(gameId, songId, callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.activeGameService.touch();
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

  private loadPlaylistForSelection(): void {
    const gameId = this.gameId();
    const callListId = this.callListId();
    const inning = this.inning();

    if (callListId === null || inning === null) {
      this.resetPlaylistState();
      return;
    }

    this.playlistLoading.set(true);
    this.playlistError.set(null);

    this.bingoGameService
      .getCallListSongsByGci(gameId, callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: songs => {
          const playlist = songs.map(song => this.mapPlaylistSong(song));
          this.playlist.set(playlist);
          this.allSongs.set(playlist);
        },
        error: error => {
          console.error('Load playlist failed', error);
          this.playlist.set([]);
          this.playlistError.set('Unable to load playlist songs right now.');
        },
        complete: () => this.playlistLoading.set(false)
      });
  }

  private resetPlaylistState(): void {
    this.playlist.set([]);
    this.playlistLoading.set(false);
    this.playlistError.set(null);
  }

  private mapPlaylistSong(song: BingoCallListSongByGci): Song {
    return {
      song_id: song.song_id,
      title: song.title,
      artist: song.artist,
      genre: song.genre ?? undefined,
      release_year: song.release_year ?? undefined,
      decade: song.decade ?? undefined,
      era: song.era ?? undefined,
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

  private applyStoredConsoleContext(): void {
    const ctx = this.consoleContextService.getContext();
    if (!ctx) return;

    if (ctx.Game_ID) {
      this.gameId.set(ctx.Game_ID);
    }

    if (ctx.Call_List_ID !== null) {
      this.callListId.set(ctx.Call_List_ID);
    }

    if (ctx.Inning !== null) {
      this.inning.set(ctx.Inning);
    }

    this.loadPlaylistForSelection();
  }

  private syncConsoleContext(): void {
    this.consoleContextService.setContext({
      Game_ID: this.gameId(),
      Call_List_ID: this.callListId(),
      Inning: this.inning()
    });
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
    this.activeGameService.touch();
    this.currentSong.set(next);
    this.calledSongs.update(list => [...list, next]);
  }

  callSpecificSong(song: Song): void {
    if (this.calledSongs().some(c => c.song_id === song.song_id) || this.callSongLoading()) return;

    const gameId = this.gameId();
    const callListId = this.callListId();
    const inning = this.inning();

    this.callSongLoading.set(true);
    this.callSongError.set(null);
    this.winnerResult.set(null);

    this.bingoGameService
      .callSongByNumber(gameId, song.song_id, callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.activeGameService.touch();
          this.currentSong.set(song);
          this.refreshCalledSongsAfterCall(gameId);
        },
        error: err => {
          console.error('Call song failed', err);
          this.callSongError.set('Failed to call song. Please try again.');
          this.callSongLoading.set(false);
        }
      });
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

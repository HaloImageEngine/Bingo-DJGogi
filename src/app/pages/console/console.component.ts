import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of } from 'rxjs';
import { BingoCalledSong, BingoCalledSongFromGci, BingoCallListSongByGci, BingoSongsCalledCalculateByGci, BingoTopCard, BingoWinnerResult } from '../../models/bingo-game.model';
import { Song } from '../../models/song.model';
import { ActiveGameService } from '../../services/active-game.service';
import { BingoGameService } from '../../services/bingo-game.service';
import { ConsoleContextService } from '../../services/console-context.service';
import { environment } from '../../../environments/environment';

export type GameStatus = 'idle' | 'active' | 'paused' | 'finished';

/** Which winner-check REST endpoint to use after a song is called (mutually exclusive). */
export type WinnerCheckMode = 'standard' | 'twoLines' | 'fourCorners' | 'blackout';

/** Persisted in `sessionStorage` so Top Cards survive route changes within the tab. */
interface TopCardsSessionPayload {
  gameId: number;
  callListId: number | null;
  inning: number | null;
  cards: BingoTopCard[];
}

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
  private readonly topCardsSessionStorageKey = 'bingo_console_top_cards_v1';
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

  /** Server counts for current Game + Call List + Inning (`Get_Songs_Called_Calculate_by_GCI`). */
  gciSongStats = signal<BingoSongsCalledCalculateByGci | null>(null);

  // --- Computed ---
  /**
   * Called songs from the API that also appear on the loaded playlist (current Call List + Inning).
   * Used for stats fallbacks and aligning playlist "called" state with this list only.
   */
  calledSongsOnCurrentList = computed(() => {
    const pl = this.playlist();
    const all = this.calledSongs();
    if (pl.length === 0) {
      return all;
    }
    const ids = new Set(pl.map(s => Number(s.song_id)).filter(n => Number.isFinite(n)));
    return all.filter(c => {
      const id = Number(c.song_id);
      return Number.isFinite(id) && ids.has(id);
    });
  });

  /** Called Songs panel: GCI `CalledSongs` when loaded, else deduped `Get_Called_Songs` rows. */
  calledSongsForDisplay = computed(() => {
    const gci = this.gciStatsForContext();
    if (gci?.CalledSongs && gci.CalledSongs.length > 0) {
      return gci.CalledSongs.map(row => this.mapGciCalledSongRowToSong(row));
    }
    const seen = new Set<number>();
    const out: Song[] = [];
    for (const row of this.calledSongs()) {
      const id = Number(row.song_id);
      if (!Number.isFinite(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      out.push(row);
    }
    return out;
  });

  calledCount = computed(() => this.calledSongsOnCurrentList().length);

  remainingCount = computed(() => {
    const pl = this.playlist();
    if (pl.length === 0) {
      return 0;
    }
    return pl.length - this.calledCount();
  });

  /** Latest GCI stats row only if it matches the current Game / Call List / Inning inputs. */
  readonly gciStatsForContext = computed((): BingoSongsCalledCalculateByGci | null => {
    const s = this.gciSongStats();
    const cid = this.callListId();
    const inn = this.inning();
    if (!s || cid === null || inn === null) {
      return null;
    }
    if (s.Game_ID !== this.gameId() || s.Call_List_ID !== cid || s.Inning !== inn) {
      return null;
    }
    return s;
  });

  /** Stats row: prefer server GCI counts when available, else local playlist-based fallbacks. */
  playlistCountDisplay = computed(() => this.gciStatsForContext()?.TotalSongs ?? this.playlist().length);

  calledCountDisplay = computed(() => this.gciStatsForContext()?.SongsCalled ?? this.calledCount());

  remainingCountDisplay = computed(() => {
    const s = this.gciStatsForContext();
    return s !== null ? s.SongsRemaining : this.remainingCount();
  });

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
    this.restoreTopCardsFromSession();
  }

  // --- Song calling panel ---
  callListId = signal<number | null>(null);
  inning = signal<number | null>(1);
  manualSongId = signal<number | null>(null);
  callSongLoading = signal(false);
  callSongError = signal<string | null>(null);
  winnerResult = signal<BingoWinnerResult | null>(null);
  /** Exactly one mode is always active; defaults follow inning 1–4 when inning changes. */
  winnerCheckMode = signal<WinnerCheckMode>('standard');

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
          this.refreshGciSongStats();
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
          this.refreshGciSongStats();
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
          this.refreshGciSongStats();
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
      .getTopCards(this.gameId(), this.topCardsCount, this.callListId(), this.inning())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cards => {
          this.topCards.set(cards);
          this.persistTopCardsSession(cards);
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
        complete: () => {
          this.gameActionLoading.set(false);
          this.refreshGciSongStats();
        }
      });
  }

  /**
   * Refetches `Get_Called_Songs` then GCI stats (no global game-action loading state).
   * Used when Inning changes so the Called Songs panel does not show the previous inning's rows.
   */
  private refreshCalledSongsAfterInningChange(): void {
    const gameId = this.gameId();
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return;
    }

    this.bingoGameService
      .getCalledSongs(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: calledSongs => {
          this.calledSongs.set(calledSongs.map(song => this.mapCalledSongToSong(song)));
        },
        error: err => console.error('Refresh called songs after inning change failed', err),
        complete: () => this.refreshGciSongStats()
      });
  }

  updateGameId(value: string | number | null): void {
    const nextGameId = Number(value);

    if (!Number.isInteger(nextGameId) || nextGameId <= 0 || nextGameId > 999) {
      return;
    }

    const previousGameId = this.gameId();
    this.gameId.set(nextGameId);
    if (nextGameId !== previousGameId) {
      this.invalidateTopCardsForContextChange();
    }
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  updateCallListId(value: string | number | null): void {
    const nextCallListId = Number(value);
    const previousCallListId = this.callListId();

    if (!Number.isInteger(nextCallListId) || nextCallListId <= 0) {
      this.callListId.set(null);
      this.resetPlaylistState();
      this.syncConsoleContext();
      if (previousCallListId !== null) {
        this.invalidateTopCardsForContextChange();
      }
      return;
    }

    this.callListId.set(nextCallListId);
    if (nextCallListId !== previousCallListId) {
      this.invalidateTopCardsForContextChange();
    }
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  updateInning(value: string | number | null): void {
    const nextInning = Number(value);
    const previousInning = this.inning();

    if (!Number.isInteger(nextInning) || nextInning <= 0) {
      this.inning.set(null);
      this.resetPlaylistState();
      this.syncConsoleContext();
      if (previousInning !== null) {
        this.invalidateTopCardsForContextChange();
        this.refreshCalledSongsAfterInningChange();
      }
      return;
    }

    this.inning.set(nextInning);
    if (nextInning !== previousInning) {
      this.invalidateTopCardsForContextChange();
      this.refreshCalledSongsAfterInningChange();
    }
    this.syncWinnerCheckModeToInning();
    this.loadPlaylistForSelection();
    this.syncConsoleContext();
  }

  /** User picks winner-check API; checkboxes are mutually exclusive (one must stay on). */
  selectWinnerCheckMode(mode: WinnerCheckMode, event: Event): void {
    event.preventDefault();
    this.winnerCheckMode.set(mode);
  }

  private syncWinnerCheckModeToInning(): void {
    const inn = this.inning();
    if (inn === 1) {
      this.winnerCheckMode.set('standard');
    } else if (inn === 2) {
      this.winnerCheckMode.set('twoLines');
    } else if (inn === 3) {
      this.winnerCheckMode.set('fourCorners');
    } else if (inn === 4) {
      this.winnerCheckMode.set('blackout');
    }
  }

  private checkWinnerForActiveMode(gameId: number): Observable<BingoWinnerResult> {
    const callListId = this.callListId();
    const inning = this.inning();
    switch (this.winnerCheckMode()) {
      case 'standard':
        return this.bingoGameService.checkForWinner(gameId, callListId, inning);
      case 'twoLines':
        return this.bingoGameService.checkForWinner2Lines(gameId, callListId, inning);
      case 'fourCorners':
        return this.bingoGameService.checkForWinner4Corners(gameId, callListId, inning);
      case 'blackout':
        return this.bingoGameService.checkForWinnerBlackout(gameId, callListId, inning);
    }
  }

  /** True when the winner API `Result` contains "bingo" (case-insensitive), e.g. `"BINGO!"`. */
  isBingoWinnerResult(winner: BingoWinnerResult | null | undefined): boolean {
    const text = winner?.Result?.trim();
    if (!text) {
      return false;
    }
    return text.toLowerCase().includes('bingo');
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

    if (environment.debugLogging) {
      console.log(
        '[Console] callSongManual — one Call_TheSongNumber request; then refresh (called songs, winner, top cards).',
        JSON.stringify({ gameId, songId, callListId, inning }, null, 2)
      );
    }

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
    if (environment.debugLogging) {
      console.log(
        '[Console] refreshCalledSongsAfterCall — separate GETs (not extra Call_TheSongNumber): Get_Called_Songs, winner check (parallel), Get_Top_Cards (always).',
        JSON.stringify({ gameId }, null, 2)
      );
    }

    this.bingoGameService
      .getCalledSongs(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: calledSongs => {
          this.calledSongs.set(calledSongs.map(song => this.mapCalledSongToSong(song)));
          this.refreshGciSongStats();

          // Winner check must not block Top Cards — playlist/manual "Call" should always refresh top cards.
          this.checkWinnerForActiveMode(gameId)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              catchError(err => {
                console.error('Check for winner failed', err);
                return of(null);
              })
            )
            .subscribe(winner => {
              this.winnerResult.set(winner);
            });

          this.bingoGameService
            .getTopCards(gameId, this.topCardsCount, this.callListId(), this.inning())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: cards => {
                this.topCards.set(cards);
                this.persistTopCardsSession(cards);
              },
              error: err => console.error('Get top cards failed', err),
              complete: () => this.callSongLoading.set(false)
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
          this.playlistLoading.set(false);
          this.refreshGciSongStats();
        },
        complete: () => {
          this.playlistLoading.set(false);
          this.refreshGciSongStats();
        }
      });
  }

  private resetPlaylistState(): void {
    this.playlist.set([]);
    this.playlistLoading.set(false);
    this.playlistError.set(null);
    this.gciSongStats.set(null);
  }

  /** Loads `Get_Songs_Called_Calculate_by_GCI` for the current Game / Call List / Inning (clears when invalid). */
  private refreshGciSongStats(): void {
    const gameId = this.gameId();
    const callListId = this.callListId();
    const inning = this.inning();

    if (
      callListId === null ||
      inning === null ||
      !Number.isInteger(callListId) ||
      callListId <= 0 ||
      !Number.isInteger(inning) ||
      inning <= 0
    ) {
      this.gciSongStats.set(null);
      return;
    }

    this.bingoGameService
      .getSongsCalledCalculateByGci(gameId, callListId, inning)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: stats => {
          this.gciSongStats.set(stats);
          if (stats.CalledSongs && stats.CalledSongs.length > 0) {
            this.calledSongs.set(stats.CalledSongs.map(row => this.mapGciCalledSongRowToSong(row)));
          }
        },
        error: err => {
          console.error('Get songs called calculate by GCI failed', err);
          this.gciSongStats.set(null);
        }
      });
  }

  private mapGciCalledSongRowToSong(row: BingoCalledSongFromGci): Song {
    return {
      song_id: row.song_id,
      title: row.title,
      artist: row.artist,
      play_count: 0,
      active: true,
      calledTimeStamp: row.DateTimeStamp,
      thisNumberAWinner: row.ThisNumberAWinner
    };
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

    this.syncWinnerCheckModeToInning();
    this.loadPlaylistForSelection();
  }

  private syncConsoleContext(): void {
    this.consoleContextService.setContext({
      Game_ID: this.gameId(),
      Call_List_ID: this.callListId(),
      Inning: this.inning()
    });
  }

  private readTopCardsSession(): TopCardsSessionPayload | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.sessionStorage.getItem(this.topCardsSessionStorageKey);
      if (!raw) {
        return null;
      }

      const o = JSON.parse(raw) as {
        gameId?: unknown;
        callListId?: unknown;
        inning?: unknown;
        cards?: unknown;
      };

      if (typeof o.gameId !== 'number' || !Number.isFinite(o.gameId)) {
        return null;
      }

      let callListId: number | null = null;
      if (o.callListId !== null && o.callListId !== undefined) {
        if (typeof o.callListId !== 'number' || !Number.isFinite(o.callListId)) {
          return null;
        }
        callListId = o.callListId;
      }

      let inning: number | null = null;
      if (o.inning !== null && o.inning !== undefined) {
        if (typeof o.inning !== 'number' || !Number.isFinite(o.inning)) {
          return null;
        }
        inning = o.inning;
      }

      if (!Array.isArray(o.cards)) {
        return null;
      }

      const cards: BingoTopCard[] = [];
      for (const row of o.cards) {
        if (!row || typeof row !== 'object') {
          continue;
        }
        const r = row as { CardID?: unknown; CalledCount?: unknown };
        const cardId = Number(r.CardID);
        if (!Number.isFinite(cardId)) {
          continue;
        }
        const calledCount = Number(r.CalledCount);
        cards.push({
          CardID: cardId,
          CalledCount: Number.isFinite(calledCount) ? calledCount : 0
        });
      }

      return { gameId: o.gameId, callListId, inning, cards };
    } catch {
      return null;
    }
  }

  private persistTopCardsSession(cards: BingoTopCard[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: TopCardsSessionPayload = {
      gameId: this.gameId(),
      callListId: this.callListId(),
      inning: this.inning(),
      cards
    };

    try {
      window.sessionStorage.setItem(this.topCardsSessionStorageKey, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Console] Top cards session storage write failed', e);
    }
  }

  private clearTopCardsSession(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.removeItem(this.topCardsSessionStorageKey);
  }

  private topCardsSessionMatchesCurrentContext(stored: TopCardsSessionPayload): boolean {
    return (
      stored.gameId === this.gameId() &&
      stored.callListId === this.callListId() &&
      stored.inning === this.inning()
    );
  }

  private restoreTopCardsFromSession(): void {
    const stored = this.readTopCardsSession();
    if (!stored) {
      return;
    }

    if (!this.topCardsSessionMatchesCurrentContext(stored)) {
      this.clearTopCardsSession();
      return;
    }

    this.topCards.set(stored.cards);
  }

  private invalidateTopCardsForContextChange(): void {
    this.clearTopCardsSession();
    this.topCards.set([]);
  }

  // --- Song calling ---
  callNextSong(): void {
    const remaining = this.playlist().filter(s => !this.isCalled(s));
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
    if (this.isCalled(song) || this.callSongLoading()) return;

    const gameId = this.gameId();
    const callListId = this.callListId();
    const inning = this.inning();

    this.callSongLoading.set(true);
    this.callSongError.set(null);
    this.winnerResult.set(null);

    if (environment.debugLogging) {
      console.log(
        '[Console] callSpecificSong (playlist Call) — one Call_TheSongNumber request; then refresh (called songs, winner, top cards).',
        JSON.stringify(
          { gameId, song_id: song.song_id, title: song.title, callListId, inning },
          null,
          2
        )
      );
    }

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
    const id = Number(song.song_id);
    if (!Number.isFinite(id)) {
      return false;
    }
    if (this.playlist().length === 0) {
      return this.calledSongs().some(c => Number(c.song_id) === id);
    }
    return this.calledSongsOnCurrentList().some(c => Number(c.song_id) === id);
  }

  formatCalledTimeStamp(value: string | null | undefined): string {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '—';
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  formatWinnerFlag(value: string | null | undefined): string {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '—';
    }
    const v = String(value).trim().toLowerCase();
    if (v === 'true') return 'Yes';
    if (v === 'false') return 'No';
    return String(value);
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

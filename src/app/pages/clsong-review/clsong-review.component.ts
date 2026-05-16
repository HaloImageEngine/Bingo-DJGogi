import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import {
  CallListSongColumnItem,
  CallListSongsFourColumnView,
  CallListSongsInningColumn,
  buildCallListSongsFourColumnView
} from '../../models/call-list-songs-four-column-view.model';
import { ConsoleContextService } from '../../services/console-context.service';
import { SongService } from '../../services/song.service';

@Component({
  selector: 'app-clsong-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clsong-review.component.html',
  styleUrl: './clsong-review.component.scss'
})
export class ClsongReviewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly songService = inject(SongService);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadMessage = signal<string | null>(null);
  readonly hasLoaded = signal(false);
  readonly columnView = signal<CallListSongsFourColumnView | null>(null);

  readonly trackByColumn = (_index: number, column: CallListSongsInningColumn) => column.inning;
  readonly trackBySong = (_index: number, song: CallListSongColumnItem) => song.songId;

  ngOnInit(): void {
    const ctx = this.consoleContextService.getContext();
    if (!ctx) {
      return;
    }
    if (ctx.Game_ID) {
      this.gameId.set(ctx.Game_ID);
    }
    if (ctx.Call_List_ID !== null && ctx.Call_List_ID !== undefined) {
      this.callListId.set(ctx.Call_List_ID);
    }
    if (ctx.Inning !== null && ctx.Inning !== undefined) {
      this.inning.set(ctx.Inning);
    }
    if (ctx.Game_ID && ctx.Call_List_ID) {
      this.loadSongs();
    }
  }

  setGameIdFromInput(value: unknown): void {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(n)) {
      this.gameId.set(1);
      return;
    }
    this.gameId.set(Math.max(1, Math.trunc(n)));
  }

  setInningFromInput(value: unknown): void {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(n)) {
      this.inning.set(1);
      return;
    }
    this.inning.set(Math.max(1, Math.trunc(n)));
  }

  setCallListIdFromInput(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.callListId.set(null);
      return;
    }
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isInteger(n) || n < 1) {
      this.callListId.set(null);
      return;
    }
    this.callListId.set(n);
  }

  loadSongs(): void {
    const gid = this.gameId();
    const clid = this.callListId();
    const inn = this.inning();

    if (!Number.isFinite(gid) || gid < 1) {
      this.error.set('Enter a valid Game_ID (1 or greater).');
      this.loadMessage.set(null);
      return;
    }
    if (clid === null || clid < 1) {
      this.error.set('Enter a valid Call_List_ID (1 or greater).');
      this.loadMessage.set(null);
      return;
    }
    if (!Number.isFinite(inn) || inn < 1) {
      this.error.set('Enter a valid Inning (1 or greater).');
      this.loadMessage.set(null);
      return;
    }

    this.error.set(null);
    this.consoleContextService.setContext({
      Game_ID: gid,
      Call_List_ID: clid,
      Inning: inn
    });

    this.loading.set(true);
    this.columnView.set(null);
    this.hasLoaded.set(false);

    this.songService
      .getCallListSongsBy4Inning(gid, clid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_Call_List_Songs_by4Inning failed', err);
          this.error.set('Unable to load call list songs from the API.');
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(response => {
        if (!response) {
          return;
        }

        const view = buildCallListSongsFourColumnView(response, gid, clid, inn);
        this.columnView.set(view);
        this.hasLoaded.set(true);
        this.loadMessage.set(
          `Loaded ${view.totalSongCount} songs for game ${gid}, call list ${clid} (Inning ${view.activeInning} highlighted).`
        );
      });
  }

  /** Re-highlight the active column when Inning changes without refetching. */
  applyInningHighlight(): void {
    const current = this.columnView();
    const gid = this.gameId();
    const clid = this.callListId();
    const inn = this.inning();

    if (!current || clid === null) {
      return;
    }

    this.consoleContextService.setContext({
      Game_ID: gid,
      Call_List_ID: clid,
      Inning: inn
    });

    const active = Math.min(4, Math.max(1, Math.trunc(inn)));
    this.columnView.set({
      ...current,
      activeInning: active,
      columns: current.columns.map(col => ({
        ...col,
        isActive: col.inning === active
      }))
    });
  }
}

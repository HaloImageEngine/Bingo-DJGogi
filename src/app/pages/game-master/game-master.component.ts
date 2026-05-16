import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { BingoGameSetupCheckResult } from '../../models/bingo-game-setup.model';
import { BingoGameWinnerResultRow } from '../../models/bingo-game-winner-result.model';
import { ConsoleContextService } from '../../services/console-context.service';
import { GameMgmtService } from '../../services/game-mgmt.service';

export type GameMasterTab = 'gameInfo' | 'gameResults' | 'gameWinners';

@Component({
  selector: 'app-game-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './game-master.component.html',
  styleUrl: './game-master.component.scss'
})
export class GameMasterComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly consoleContextService = inject(ConsoleContextService);
  private readonly gameMgmtService = inject(GameMgmtService);

  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasLoaded = signal(false);
  readonly loadMessage = signal<string | null>(null);
  readonly activeTab = signal<GameMasterTab>('gameInfo');
  readonly gameSetup = signal<BingoGameSetupCheckResult | null>(null);
  readonly setupLoading = signal(false);
  readonly gameWinners = signal<BingoGameWinnerResultRow[]>([]);
  readonly winnersLoading = signal(false);
  readonly winnersError = signal<string | null>(null);

  selectTab(tab: GameMasterTab): void {
    this.activeTab.set(tab);
  }

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
    if (ctx.Game_ID && ctx.Call_List_ID && ctx.Inning) {
      this.hasLoaded.set(true);
      this.fetchGameData(ctx.Game_ID);
    }
  }

  validationStatusClass(status: string | null | undefined): string {
    const value = status?.trim().toUpperCase() ?? '';
    if (value === 'PASS' || value === 'READY' || value === 'MATCH' || value === 'FOUND' || value === 'COMPLETE') {
      return 'is-pass';
    }
    if (value === 'WARNING' || value === 'INCOMPLETE') {
      return 'is-warn';
    }
    if (value === 'FAIL' || value === 'ERROR') {
      return 'is-fail';
    }
    return '';
  }

  formatBool(value: boolean | null | undefined): string {
    if (value === true) {
      return 'Yes';
    }
    if (value === false) {
      return 'No';
    }
    return '—';
  }

  formatValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
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

  loadGame(): void {
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
    this.activeTab.set('gameInfo');
    this.hasLoaded.set(true);
    this.loadMessage.set(`Game ${gid} · Call list ${clid} · Inning ${inn} saved for Console and related pages.`);
    this.fetchGameData(gid);
  }

  private fetchGameData(gameId: number): void {
    this.fetchGameSetup(gameId);
    this.fetchGameWinners(gameId);
  }

  private fetchGameSetup(gameId: number): void {
    this.setupLoading.set(true);
    this.gameSetup.set(null);

    this.gameMgmtService
      .checkGameSetup(gameId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Check_GameSetup failed', err);
          this.error.set('Unable to load game setup check from the API.');
          return of<BingoGameSetupCheckResult | null>(null);
        }),
        finalize(() => this.setupLoading.set(false))
      )
      .subscribe(result => {
        if (result) {
          this.gameSetup.set(result);
        }
      });
  }

  private fetchGameWinners(gameId: number): void {
    this.winnersLoading.set(true);
    this.winnersError.set(null);
    this.gameWinners.set([]);

    this.gameMgmtService
      .getGameWinnersResults(gameId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Get_Game_Winners_Results failed', err);
          this.winnersError.set('Unable to load game winners from the API.');
          return of<BingoGameWinnerResultRow[]>([]);
        }),
        finalize(() => this.winnersLoading.set(false))
      )
      .subscribe(rows => this.gameWinners.set(rows));
  }
}

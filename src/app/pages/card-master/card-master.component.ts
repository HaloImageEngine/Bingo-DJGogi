import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { PrintedCard, PrintedCardSquare } from '../../models/printed-card.model';
import { ConsoleContextService } from '../../services/console-context.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

export type CardMasterTab = 'tab1' | 'tab2' | 'tab3';

@Component({
  selector: 'app-card-master',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './card-master.component.html',
  styleUrl: './card-master.component.scss'
})
export class CardMasterComponent implements OnInit {
  /** Angular templates cannot reference global `Math`; expose if bindings use `Math.*`. */
  readonly Math = Math;

  private readonly destroyRef = inject(DestroyRef);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly consoleContextService = inject(ConsoleContextService);

  readonly gameId = signal(1);
  readonly callListId = signal<number | null>(null);
  readonly inning = signal(1);

  readonly cards = signal<PrintedCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasQueried = signal(false);
  readonly activeTab = signal<CardMasterTab>('tab1');
  readonly expandedCardId = signal<number | null>(null);

  readonly trackByCardId = (_index: number, card: PrintedCard) => card.CardID;

  selectTab(tab: CardMasterTab): void {
    this.activeTab.set(tab);
  }

  toggleCardRow(card: PrintedCard, event?: Event): void {
    event?.stopPropagation();
    this.expandedCardId.update(id => (id === card.CardID ? null : card.CardID));
  }

  isCardExpanded(cardId: number): boolean {
    return this.expandedCardId() === cardId;
  }

  /** 5×5 rows in `SquarePosition` order (1–25). */
  getSquareGrid(card: PrintedCard): PrintedCardSquare[][] {
    const sorted = [...card.Squares].sort((a, b) => a.SquarePosition - b.SquarePosition);
    const grid: PrintedCardSquare[][] = [];

    for (let i = 0; i < sorted.length; i += 5) {
      grid.push(sorted.slice(i, i + 5));
    }

    return grid;
  }

  songNumberLabel(square: PrintedCardSquare): string {
    if (square.IsFreeSpace) {
      return 'FREE';
    }

    const songId = square.Song?.SongID;
    if (typeof songId === 'number' && Number.isFinite(songId)) {
      return String(songId);
    }

    return '—';
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

  loadCards(): void {
    const gid = this.gameId();
    if (!Number.isFinite(gid) || gid < 1) {
      this.error.set('Enter a valid Game_ID (1 or greater).');
      return;
    }

    const clid = this.callListId();
    const inn = this.inning();

    this.error.set(null);
    this.loading.set(true);
    this.hasQueried.set(true);
    this.expandedCardId.set(null);
    this.activeTab.set('tab1');

    this.printedCardsService
      .getPrintedCardsByGameId(gid, {
        callListId: clid !== null && clid > 0 ? clid : undefined,
        inning: Number.isFinite(inn) && inn > 0 ? inn : undefined
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Card master load failed', err);
          this.error.set('Unable to load printed cards right now.');
          return of<PrintedCard[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(list => {
        this.cards.set(list);
        this.consoleContextService.setContext({
          Game_ID: gid,
          Call_List_ID: clid !== null && clid > 0 ? clid : null,
          Inning: Number.isFinite(inn) && inn > 0 ? inn : null
        });
      });
  }
}

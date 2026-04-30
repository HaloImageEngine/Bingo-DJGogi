import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintedCard } from '../../models/printed-card.model';
import { ActiveGameService } from '../../services/active-game.service';
import { PrintService } from '../../services/print.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface SlidecardoneState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-slidecardone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slidecardone.component.html',
  styleUrl: './slidecardone.component.scss'
})
export class SlidecardoneComponent {
  private readonly activeGameService = inject(ActiveGameService);
  private readonly printService = inject(PrintService);
  private readonly printedCardsService = inject(PrintedCardsService);
  private readonly refreshIntervalMs = Math.max(environment.slidecardRefreshIntervalSeconds, 1) * 1000;

  readonly cardId = signal(87);
  readonly showPrintCardMeta = signal(false);
  readonly refreshEnabled = this.activeGameService.activeGame;
  readonly state = toSignal(
    toObservable(computed(() => ({ cardId: this.cardId(), refreshEnabled: this.refreshEnabled() }))).pipe(
      distinctUntilChanged((left, right) => left.cardId === right.cardId && left.refreshEnabled === right.refreshEnabled),
      switchMap(({ cardId, refreshEnabled }) => {
        if (!refreshEnabled) {
          return of({
            cards: [],
            loading: false,
            error: 'Refresh is waiting for ActiveGame to be enabled in the console.'
          } satisfies SlidecardoneState);
        }

        return timer(0, this.refreshIntervalMs).pipe(
          switchMap(() =>
            this.printedCardsService.getPrintedCardsByCardId(cardId).pipe(
              map(cards => ({ cards, loading: false, error: null } satisfies SlidecardoneState)),
              catchError(error => {
                console.error('Printed card load failed', error);
                return of({
                  cards: [],
                  loading: false,
                  error: 'Unable to load the bingo card right now.'
                } satisfies SlidecardoneState);
              })
            )
          ),
          startWith({ cards: [], loading: true, error: null } satisfies SlidecardoneState)
        );
      })
    ),
    { initialValue: { cards: [], loading: true, error: null } }
  );

  readonly card = computed(() => this.state().cards[0] ?? null);

  printCard(): void {
    this.printCurrentCard(false);
  }

  printCardWithMeta(): void {
    this.printCurrentCard(true);
  }

  updateCardId(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value.trim() ?? '';
    const parsed = Number(value);
    this.cardId.set(Number.isInteger(parsed) && parsed > 0 ? parsed : 87);
  }

  private printCurrentCard(showMeta: boolean): void {
    if (this.state().loading || this.state().error || !this.card()) {
      return;
    }

    this.showPrintCardMeta.set(showMeta);

    const view = globalThis.window;
    const resetMeta = (): void => this.showPrintCardMeta.set(false);

    if (showMeta && view) {
      view.addEventListener('afterprint', resetMeta, { once: true });
    }

    this.printService.print({
      bodyClass: 'print-slidecardone'
    });

    if (!showMeta) {
      resetMeta();
    }
  }
}

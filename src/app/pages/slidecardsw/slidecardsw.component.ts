import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';

import { PrintedCard } from '../../models/printed-card.model';
import { PrintService } from '../../services/print.service';
import { PrintedCardsService } from '../../services/printed-cards.service';

interface SlidecardswState {
  cards: PrintedCard[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-slidecardsw',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slidecardsw.component.html',
  styleUrl: './slidecardsw.component.scss'
})
export class SlidecardswComponent {
  private readonly printService = inject(PrintService);
  private readonly printedCardsService = inject(PrintedCardsService);

  @ViewChild('sliderViewport')
  private sliderViewport?: ElementRef<HTMLElement>;

  readonly gameId = 1;
  readonly currentSlideIndex = signal(0);
  readonly state = toSignal(
    this.printedCardsService.getPrintedCardsByGameId(this.gameId).pipe(
      map(cards => ({ cards, loading: false, error: null } satisfies SlidecardswState)),
      startWith({ cards: [], loading: true, error: null } satisfies SlidecardswState),
      catchError(error => {
        console.error('Printed cards load failed', error);
        return of({
          cards: [],
          loading: false,
          error: 'Unable to load slide cards right now.'
        } satisfies SlidecardswState);
      })
    ),
    { initialValue: { cards: [], loading: true, error: null } }
  );

  readonly slides = computed(() => this.chunkCards(this.state().cards, 2));
  readonly canGoPrevious = computed(() => this.currentSlideIndex() > 0);
  readonly canGoNext = computed(() => this.currentSlideIndex() < this.slides().length - 1);

  goToPreviousSlide(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.scrollToSlide(this.currentSlideIndex() - 1);
  }

  goToNextSlide(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.scrollToSlide(this.currentSlideIndex() + 1);
  }

  printAllCards(): void {
    if (this.state().loading || this.state().error || this.slides().length === 0) {
      return;
    }

    this.printService.print({
      bodyClass: 'print-slidecardsw',
      title: `Game ${this.gameId} bingo cards`
    });
  }

  onSliderScroll(): void {
    const viewport = this.sliderViewport?.nativeElement;

    if (!viewport) {
      return;
    }

    const slideWidth = viewport.clientWidth;

    if (slideWidth <= 0) {
      return;
    }

    const nextIndex = Math.round(viewport.scrollLeft / slideWidth);

    if (nextIndex !== this.currentSlideIndex()) {
      this.currentSlideIndex.set(nextIndex);
    }
  }

  private chunkCards(cards: PrintedCard[], size: number): PrintedCard[][] {
    const chunks: PrintedCard[][] = [];

    for (let index = 0; index < cards.length; index += size) {
      chunks.push(cards.slice(index, index + size));
    }

    return chunks;
  }

  private scrollToSlide(slideIndex: number): void {
    const viewport = this.sliderViewport?.nativeElement;

    if (!viewport) {
      this.currentSlideIndex.set(slideIndex);
      return;
    }

    const boundedIndex = Math.max(0, Math.min(slideIndex, this.slides().length - 1));
    viewport.scrollTo({
      left: boundedIndex * viewport.clientWidth,
      behavior: 'smooth'
    });
    this.currentSlideIndex.set(boundedIndex);
  }
}

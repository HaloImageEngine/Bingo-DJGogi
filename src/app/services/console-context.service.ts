import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

import { CallListService } from './calllist.service';

export interface BingoConsoleContext {
  Game_ID: number | null;
  Call_List_ID: number | null;
  Inning: number | null;
}

@Injectable({ providedIn: 'root' })
export class ConsoleContextService {
  private readonly storageKey = 'bingo_console_context_v1';
  private readonly callListService = inject(CallListService);

  getContext(): BingoConsoleContext | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<BingoConsoleContext>;
      return this.normalizeContext(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Stores the 3 values as a single JSON object in localStorage.
   * If all values are null/invalid, the item is removed.
   */
  setContext(context: BingoConsoleContext): void {
    if (typeof window === 'undefined') return;

    const normalized = this.normalizeContext(context);
    const shouldRemove =
      normalized.Game_ID === null &&
      normalized.Call_List_ID === null &&
      normalized.Inning === null;

    if (shouldRemove) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(normalized));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.storageKey);
  }

  getGameId(): number | null {
    return this.getContext()?.Game_ID ?? null;
  }

  getCallListId(): number | null {
    return this.getContext()?.Call_List_ID ?? null;
  }

  getInning(): number | null {
    return this.getContext()?.Inning ?? null;
  }

  /**
   * Runs once at app startup (see APP_INITIALIZER).
   * - If nothing is in localStorage yet: fetch max Game ID and max Call List ID from the API
   *   and persist them with Inning 1 as the default “latest” row context.
   * - If localStorage already has a saved context: keep it (user/session choice) and do not
   *   overwrite with API values.
   */
  initializeFromApiAndStorage(): Observable<BingoConsoleContext> {
    if (typeof window === 'undefined') {
      return of(this.normalizeContext({}));
    }

    if (window.localStorage.getItem(this.storageKey)) {
      const existing = this.getContext() ?? this.normalizeContext({});
      return of(existing);
    }

    return forkJoin({
      maxGameId: this.callListService.getMaxGameId().pipe(catchError(() => of(0))),
      maxCallListId: this.callListService.getMaxCallListId().pipe(catchError(() => of(0)))
    }).pipe(
      map(({ maxGameId, maxCallListId }) => {
        const merged = this.normalizeContext({
          Game_ID: maxGameId > 0 ? maxGameId : null,
          Call_List_ID: maxCallListId > 0 ? maxCallListId : null,
          Inning: 1
        });
        this.setContext(merged);
        return merged;
      })
    );
  }

  private normalizeContext(context: Partial<BingoConsoleContext>): BingoConsoleContext {
    const gameId = this.normalizePositiveInt(context.Game_ID);
    const callListId = this.normalizePositiveInt(context.Call_List_ID);
    const inning = this.normalizePositiveInt(context.Inning);

    return {
      Game_ID: gameId,
      Call_List_ID: callListId,
      Inning: inning
    };
  }

  private normalizePositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }
}


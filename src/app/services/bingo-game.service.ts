import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { BingoCalledSong, BingoGameActionResult, BingoTopCard, BingoWinnerResult } from '../models/bingo-game.model';
import { Song } from '../models/song.model';

@Injectable({ providedIn: 'root' })
export class BingoGameService {
  private readonly http = inject(HttpClient);
  private readonly clearCalledFlagsApiBaseUrl = environment.bingoClearCalledFlagsApiBaseUrl;
  private readonly clearCalledSongsApiBaseUrl = environment.bingoClearCalledSongsApiBaseUrl;
  private readonly topCardsApiBaseUrl = environment.bingoTopCardsApiBaseUrl;
  private readonly callSongApiUrl = environment.bingoCallSongApiUrl;
  private readonly checkForWinnerApiBaseUrl = environment.bingoCheckForWinnerApiBaseUrl;
  private readonly calledSongsApiUrl = environment.bingoCalledSongsApiUrl;

  clearAllCalledFlags(gameId: number): Observable<BingoGameActionResult> {
    return this.http.post<unknown>(`${this.clearCalledFlagsApiBaseUrl}/${gameId}`, null).pipe(
      map(response => this.normalizeActionResult(response, gameId))
    );
  }

  clearAllCalledSongs(gameId: number): Observable<BingoGameActionResult> {
    return this.http.post<unknown>(`${this.clearCalledSongsApiBaseUrl}/${gameId}`, null).pipe(
      map(response => this.normalizeActionResult(response, gameId))
    );
  }

  startNewGame(gameId: number): Observable<BingoGameActionResult> {
    return this.clearAllCalledFlags(gameId);
  }

  getTopCards(gameId: number, topN: number): Observable<BingoTopCard[]> {
    return this.http.get<unknown>(`${this.topCardsApiBaseUrl}/${gameId}/${topN}`).pipe(
      map(response => this.normalizeTopCards(response))
    );
  }

  getCalledSongs(gameId: number): Observable<BingoCalledSong[]> {
    return this.http.get<unknown>(`${this.calledSongsApiUrl}?Game_ID=${gameId}`).pipe(
      map(response => this.normalizeCalledSongs(response))
    );
  }

  checkForWinner(gameId: number): Observable<BingoWinnerResult> {
    return this.http.get<unknown>(`${this.checkForWinnerApiBaseUrl}/${gameId}`).pipe(
      map(response => this.normalizeWinnerResult(response, gameId))
    );
  }

  callSongByNumber(gameId: number, songId: number): Observable<Song | null> {
    const url = `${this.callSongApiUrl}?Game_ID=${gameId}&Song_ID=${songId}`;
    return this.http.get<unknown>(url).pipe(
      map(response => this.normalizeSongResponse(response, songId))
    );
  }

  private normalizeWinnerResult(response: unknown, fallbackGameId: number): BingoWinnerResult {
    const record = this.unwrapRecord(response) ?? {};

    return {
      GameID: this.asNullableNumber(record['GameID'] ?? record['gameId']) ?? fallbackGameId,
      WinningCardID: this.asNullableNumber(record['WinningCardID'] ?? record['winningCardId']),
      WinningPattern: (record['WinningPattern'] ?? record['winningPattern'] ?? null) as string | null,
      PlayerName: (record['PlayerName'] ?? record['playerName'] ?? null) as string | null,
      PlayerEmail: (record['PlayerEmail'] ?? record['playerEmail'] ?? null) as string | null,
      Result: (record['Result'] ?? record['result'] ?? null) as string | null
    };
  }

  private normalizeSongResponse(response: unknown, fallbackSongId: number): Song | null {
    const candidates = ['data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const nested = record
      ? candidates.map(k => this.asRecord(record[k])).find(v => v !== null) ?? record
      : null;

    if (!nested) return null;

    const songId = this.asNullableNumber(nested['song_id'] ?? nested['Song_ID'] ?? nested['SongID']) ?? fallbackSongId;
    const title = (nested['title'] ?? nested['Title'] ?? nested['SongName'] ?? nested['song_name'] ?? '') as string;
    const artist = (nested['artist'] ?? nested['Artist'] ?? '') as string;

    return {
      song_id: songId,
      title: String(title),
      artist: String(artist),
      play_count: 0,
      active: true
    };
  }

  private normalizeActionResult(response: unknown, fallbackGameId: number): BingoGameActionResult {
    const record = this.unwrapRecord(response);

    return {
      Success: this.asBoolean(record?.['Success'] ?? record?.['success']),
      GameID: this.asNullableNumber(record?.['GameID'] ?? record?.['gameId']) ?? fallbackGameId,
      ReturnValue: this.asNullableNumber(record?.['ReturnValue'] ?? record?.['returnValue']) ?? 0
    };
  }

  private normalizeCalledSongs(response: unknown): BingoCalledSong[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapCalledSong(item))
      .filter((item): item is BingoCalledSong => item !== null);
  }

  private normalizeTopCards(response: unknown): BingoTopCard[] {
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const record = this.asRecord(response);
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;
    const rawItems = Array.isArray(listCandidate)
      ? listCandidate
      : Array.isArray(response)
        ? response
        : response
          ? [response]
          : [];

    return rawItems
      .map(item => this.mapTopCard(item))
      .filter((item): item is BingoTopCard => item !== null);
  }

  private mapCalledSong(item: unknown): BingoCalledSong | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const songId = this.asNullableNumber(record['SongID'] ?? record['songId'] ?? record['song_id']);
    const songTitle = record['SongTitle'] ?? record['songTitle'] ?? record['Title'];
    const songArtist = record['SongArtist'] ?? record['songArtist'] ?? record['Artist'];

    if (songId === null) {
      return null;
    }

    return {
      SongID: songId,
      SongTitle: typeof songTitle === 'string' ? songTitle : '',
      SongArtist: typeof songArtist === 'string' ? songArtist : ''
    };
  }

  private mapTopCard(item: unknown): BingoTopCard | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['CardID'] ?? record['Card_ID'] ?? record['cardId']);
    const calledCount = this.asNullableNumber(
      record['CalledCount'] ?? record['Called_Count'] ?? record['calledCount']
    );

    if (cardId === null || calledCount === null) {
      return null;
    }

    return {
      CardID: cardId,
      CalledCount: calledCount
    };
  }

  private unwrapRecord(response: unknown): Record<string, unknown> | null {
    const record = this.asRecord(response);

    if (!record) {
      return null;
    }

    const candidates = ['data', 'Data', 'item', 'Item', 'result', 'Result', 'payload', 'Payload'];

    for (const candidate of candidates) {
      const nested = this.asRecord(record[candidate]);

      if (nested) {
        return nested;
      }
    }

    return record;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private asNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }

    return false;
  }
}

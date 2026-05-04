import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  BingoCalledSong,
  BingoCallListCreate,
  BingoCallListMaster,
  BingoCallListSongInsert,
  BingoGameActionResult,
  BingoTopCard,
  BingoWinnerResult
} from '../models/bingo-game.model';
import { LookupOption } from '../models/lookup-option.model';
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
  private readonly callListMasterApiUrl = environment.bingoCallListMasterApiUrl;
  private readonly callListDropdownApiUrl = environment.bingoCallListDropdownApiUrl;
  private readonly insertCallListMasterApiUrl = environment.bingoInsertCallListMasterApiUrl;
  private readonly insertCallListSongApiUrl = environment.bingoInsertCallListSongApiUrl;
  private readonly insertCallListSongsJsonApiUrl = environment.bingoInsertCallListSongsJsonApiUrl;

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

  getCallListMaster(): Observable<BingoCallListMaster[]> {
    return this.http.get<unknown>(this.callListMasterApiUrl).pipe(
      map(response => this.normalizeCallListMaster(response))
    );
  }

  getCallListDropdownOptions(): Observable<LookupOption[]> {
    return this.http.get<unknown>(this.callListDropdownApiUrl).pipe(
      map(response => this.normalizeCallListDropdownOptions(response))
    );
  }

  insertCallListMaster(payload: BingoCallListCreate): Observable<BingoCallListCreate> {
    return this.http.post<unknown>(this.insertCallListMasterApiUrl, this.toCreateCallListApiPayload(payload)).pipe(
      map(response => this.normalizeCallListCreate(response, payload))
    );
  }

  private toCreateCallListApiPayload(payload: BingoCallListCreate): Record<string, unknown> {
    return {
      Call_List_Name: payload.CallListName,
      Call_List_Date: payload.CallListDate,
      Call_List_Description: payload.CallListDescription,
      Game_ID: payload.GameID,
      Call_List_Genre: payload.CallListGenre,
      Call_List_Decade: payload.CallListDecade,
      Call_List_Era: payload.CallListEra,
      Call_List_SongCount: payload.CallListSongCount,
      Call_List_IsActive: payload.CallListIsActive,
      NewCallListID: payload.NewCallListID ?? 0
    };
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

  insertCallListSong(payload: BingoCallListSongInsert): Observable<BingoCallListSongInsert> {
    return this.http.post<unknown>(this.insertCallListSongApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsert(response, payload))
    );
  }

  insertCallListSongs(payload: BingoCallListSongInsert[]): Observable<BingoCallListSongInsert[]> {
    return this.http.post<unknown>(this.insertCallListSongsJsonApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsertList(response, payload))
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

  private normalizeCallListSongInsert(
    response: unknown,
    fallbackPayload: BingoCallListSongInsert
  ): BingoCallListSongInsert {
    const record = this.unwrapRecord(response) ?? {};

    return {
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['CallListId'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID,
      Title: this.asString(record['Title'] ?? record['title'], fallbackPayload.Title),
      Artist: this.asString(record['Artist'] ?? record['artist'], fallbackPayload.Artist),
      FeaturedArtist: this.asString(
        record['FeaturedArtist'] ?? record['featured_artist'],
        fallbackPayload.FeaturedArtist
      ),
      LeadVocalist: this.asString(record['LeadVocalist'] ?? record['lead_vocalist'], fallbackPayload.LeadVocalist),
      ArtistType: this.asString(record['ArtistType'] ?? record['artist_type'], fallbackPayload.ArtistType),
      Genre: this.asString(record['Genre'] ?? record['genre'], fallbackPayload.Genre),
      Explicit: this.asBoolean(record['Explicit'] ?? record['explicit'] ?? fallbackPayload.Explicit),
      ReleaseYear: this.asNullableNumber(record['ReleaseYear'] ?? record['release_year']) ?? fallbackPayload.ReleaseYear,
      Decade: this.asString(record['Decade'] ?? record['decade'], fallbackPayload.Decade),
      Era: this.asString(record['Era'] ?? record['era'], fallbackPayload.Era),
      LastPlayed: this.asString(record['LastPlayed'] ?? record['last_played'], fallbackPayload.LastPlayed),
      NewSongID: this.asNullableNumber(record['NewSongID'] ?? record['SongId'] ?? record['song_id'] ?? record['SongID']) ?? fallbackPayload.NewSongID
    };
  }

  private normalizeCallListSongInsertList(
    response: unknown,
    fallbackPayloads: BingoCallListSongInsert[]
  ): BingoCallListSongInsert[] {
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
      .map((item: unknown, index: number) => {
        const record = this.asRecord(item);
        const songRecord = this.asRecord(record?.['Song']) ?? record;

        if (!songRecord) {
          return fallbackPayloads[index] ?? null;
        }

        return this.normalizeCallListSongInsert(songRecord, fallbackPayloads[index] ?? fallbackPayloads[0]);
      })
      .filter((item: BingoCallListSongInsert | null): item is BingoCallListSongInsert => item !== null);
  }

  private normalizeCallListCreate(response: unknown, fallbackPayload: BingoCallListCreate): BingoCallListCreate {
    const record = this.unwrapRecord(response) ?? {};

    return {
      NewCallListID: this.asNullableNumber(record['NewCallListID'] ?? record['ReturnValue']) ?? fallbackPayload.NewCallListID,
      CallListName: this.asString(record['CallListName'] ?? record['Call_List_Name'], fallbackPayload.CallListName),
      CallListDate: this.asString(record['CallListDate'] ?? record['Call_List_Date'], fallbackPayload.CallListDate),
      CallListDescription: this.asString(
        record['CallListDescription'] ?? record['Call_List_Description'],
        fallbackPayload.CallListDescription
      ),
      GameID: this.asNullableNumber(record['GameID'] ?? record['Game_ID']) ?? fallbackPayload.GameID,
      CallListGenre: this.asString(record['CallListGenre'] ?? record['Call_List_Genre'], fallbackPayload.CallListGenre),
      CallListDecade: this.asString(record['CallListDecade'] ?? record['Call_List_Decade'], fallbackPayload.CallListDecade),
      CallListEra: this.asString(record['CallListEra'] ?? record['Call_List_Era'], fallbackPayload.CallListEra),
      CallListSongCount: this.asNullableNumber(record['CallListSongCount'] ?? record['Call_List_SongCount']) ?? fallbackPayload.CallListSongCount,
      CallListIsActive: this.asBoolean(record['CallListIsActive'] ?? record['Call_List_IsActive'] ?? fallbackPayload.CallListIsActive),
      CallListCreatedAt: this.asNullableString(record['CallListCreatedAt'] ?? record['Call_List_CreatedAt']) ?? fallbackPayload.CallListCreatedAt,
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID
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

  private normalizeCallListMaster(response: unknown): BingoCallListMaster[] {
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
      .map(item => this.mapCallListMaster(item))
      .filter((item): item is BingoCallListMaster => item !== null);
  }

  private normalizeCallListDropdownOptions(response: unknown): LookupOption[] {
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
      .map(item => this.mapCallListDropdownOption(item))
      .filter((item): item is LookupOption => item !== null);
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

  private mapCallListMaster(item: unknown): BingoCallListMaster | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);

    if (callListId === null) {
      return null;
    }

    return {
      Call_List_ID: callListId,
      Call_List_Name: this.asString(record['Call_List_Name'] ?? record['CallListName']),
      Call_List_Date: this.asNullableString(record['Call_List_Date'] ?? record['CallListDate']),
      Call_List_Description: this.asNullableString(record['Call_List_Description'] ?? record['CallListDescription']),
      Call_List_Genre: this.asNullableString(record['Call_List_Genre'] ?? record['CallListGenre']),
      Call_List_Decade: this.asNullableString(record['Call_List_Decade'] ?? record['CallListDecade']),
      Call_List_Era: this.asNullableString(record['Call_List_Era'] ?? record['CallListEra']),
      Call_List_SongCount: this.asNullableNumber(record['Call_List_SongCount'] ?? record['CallListSongCount']) ?? 0,
      Call_List_IsActive: this.asBoolean(record['Call_List_IsActive'] ?? record['CallListIsActive']),
      Call_List_CreatedAt: this.asNullableString(record['Call_List_CreatedAt'] ?? record['CallListCreatedAt']),
      Call_List_UpdatedAt: this.asNullableString(record['Call_List_UpdatedAt'] ?? record['CallListUpdatedAt'])
    };
  }

  private mapCallListDropdownOption(item: unknown): LookupOption | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const id = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);
    const name = this.asNullableString(record['Call_List_Description'] ?? record['CallListDescription']);

    if (id === null || name === null) {
      return null;
    }

    return {
      Id: id,
      Name: name
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

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
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

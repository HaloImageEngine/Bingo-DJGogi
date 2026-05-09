import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  BingoCallListCreate,
  BingoCallListMaster,
  BingoCallListSong,
  BingoCallListSongInsert,
  BingoInsertGameGameNight,
  BingoInsertGameGameNightResult,
  CallListBuildResult
} from '../models/bingo-game.model';

@Injectable({ providedIn: 'root' })
export class CallListService {
  private readonly http = inject(HttpClient);
  private readonly callListMasterApiUrl = environment.bingoCallListMasterApiUrl;
  private readonly callListSongsApiUrl = environment.bingoCallListSongsApiUrl;
  private readonly insertCallListMasterApiUrl = environment.bingoInsertCallListMasterApiUrl;
  private readonly insertCallListSongApiUrl = environment.bingoInsertCallListSongApiUrl;
  private readonly insertCallListSongsJsonApiUrl = environment.bingoInsertCallListSongsJsonApiUrl;
  private readonly maxCallListIdApiUrl = environment.bingoMaxCallListIdApiUrl;
  private readonly maxGameIdApiUrl = environment.bingoMaxGameIdApiUrl;
  private readonly insertGameGameNightApiUrl = environment.bingoInsertGameGameNightApiUrl;

  getMaxCallListId(): Observable<number> {
    return this.http.get<unknown>(this.maxCallListIdApiUrl).pipe(
      map(response => {
        const arr = this.unwrapArray(response);
        const record = this.asRecord(arr[0]);
        return this.asNullableNumber(record?.['Max_CallList_ID']) ?? 0;
      })
    );
  }

  getMaxGameId(): Observable<number> {
    return this.http.get<unknown>(this.maxGameIdApiUrl).pipe(
      map(response => {
        const arr = this.unwrapArray(response);
        const record = this.asRecord(arr[0]);
        return this.asNullableNumber(record?.['Max_Game_ID']) ?? 0;
      })
    );
  }

  getCallListMasters(): Observable<BingoCallListMaster[]> {
    return this.http.get<unknown>(this.callListMasterApiUrl).pipe(
      tap(response => {
        console.group('getCallListMasters raw response');
        console.log('response', response);
        console.groupEnd();
      }),
      map(response => this.normalizeCallListMasters(response)),
      tap(masters => {
        console.group('getCallListMasters normalized');
        console.log('count', masters.length);
        console.log('masters', masters);
        console.groupEnd();
      })
    );
  }

  getCallListSongs(callListId: number): Observable<BingoCallListSong[]> {
    return this.http.get<unknown>(`${this.callListSongsApiUrl}/${callListId}`).pipe(
      map(response => this.normalizeCallListSongs(response))
    );
  }

  addCallListSong(payload: BingoCallListSongInsert): Observable<BingoCallListSongInsert> {
    const requestBody = this.toAddCallListSongApiPayload(payload);

    console.group('Insert_CallList_Song');
    console.log('URL', this.insertCallListSongApiUrl);
    console.log('Request JSON', JSON.parse(JSON.stringify(requestBody)));
    console.groupEnd();

    return this.http.post<unknown>(this.insertCallListSongApiUrl, requestBody).pipe(
      tap(response => {
        console.group('Insert_CallList_Song Response');
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => this.normalizeCallListSongInsert(response, payload))
    );
  }

  insertGameGameNight(payload: BingoInsertGameGameNight): Observable<BingoInsertGameGameNightResult> {
    console.group('Insert_Game_GameNight');
    console.log('URL', this.insertGameGameNightApiUrl);
    console.log('Request JSON', JSON.parse(JSON.stringify(payload)));
    console.groupEnd();

    return this.http.post<unknown>(this.insertGameGameNightApiUrl, payload).pipe(
      tap(response => {
        console.group('Insert_Game_GameNight Response');
        console.log('Response JSON', JSON.parse(JSON.stringify(response)));
        console.groupEnd();
      }),
      map(response => {
        const record = this.unwrapRecord(response) ?? {};
        return {
          NewGN_ID: this.asNullableNumber(record['NewGN_ID']) ?? 0
        };
      })
    );
  }

  buildCallList(payload: BingoCallListCreate, songs: BingoCallListSongInsert[]): Observable<CallListBuildResult> {
    return this.http.post<unknown>(this.insertCallListMasterApiUrl, this.toCreateCallListApiPayload(payload)).pipe(
      map(response => this.normalizeCallListCreate(response, payload)),
      switchMap(result => {
        const callListId = result.CallListID ?? result.NewCallListID;

        if (callListId === null) {
          throw new Error('Call list creation did not return an identifier.');
        }

        const insertRequests = songs.length > 0
          ? this.insertCallListSongs(songs.map(song => ({ ...song, CallListID: callListId })))
          : of([] as BingoCallListSongInsert[]);

        return insertRequests.pipe(
          switchMap(() => this.getCallListSongs(callListId).pipe(
            map(callListSongs => ({
              master: this.toCallListMaster(result, callListSongs.length || payload.CallListSongCount, callListId),
              songs: callListSongs
            }))
          ))
        );
      })
    );
  }

  private toCreateCallListApiPayload(payload: BingoCallListCreate): Record<string, unknown> {
    const body = {
      Call_List_Name: payload.CallListName,
      Call_List_Date: payload.CallListDate,
      Call_List_Description: payload.CallListDescription || null,
      Game_ID: payload.GameID ?? null,
      Call_List_Genre: payload.CallListGenre || null,
      Call_List_Decade: payload.CallListDecade || null,
      Call_List_Era: payload.CallListEra || null,
      Call_List_SongCount: payload.CallListSongCount,
      Call_List_IsActive: payload.CallListIsActive,
      NewCallListID: payload.NewCallListID ?? 0
    };

    console.group('Create_CallList_Master request');
    console.log('payload', JSON.parse(JSON.stringify(body)));
    console.groupEnd();

    return body;
  }

  private toAddCallListSongApiPayload(payload: BingoCallListSongInsert): Record<string, unknown> {
    return {
      CallListID: payload.CallListID,
      Inning: payload.Inning,
      Song_ID: payload.Song_ID,
      title: payload.Title,
      artist: payload.Artist,
      featured_artist: payload.FeaturedArtist || null,
      lead_vocalist: payload.LeadVocalist || null,
      artist_type: payload.ArtistType || null,
      genre: payload.Genre || null,
      explicit: payload.Explicit,
      release_year: payload.ReleaseYear || null,
      decade: payload.Decade || null,
      era: payload.Era || null
    };
  }

  insertCallListSongs(payload: BingoCallListSongInsert[]): Observable<BingoCallListSongInsert[]> {
    return this.http.post<unknown>(this.insertCallListSongsJsonApiUrl, payload).pipe(
      map(response => this.normalizeCallListSongInsertList(response, payload))
    );
  }

  private toCallListMaster(
    result: BingoCallListCreate,
    songCount: number,
    callListId: number
  ): BingoCallListMaster {
    return {
      Call_List_ID: callListId,
      Call_List_Name: result.CallListName,
      Call_List_Date: result.CallListDate || null,
      Call_List_Description: result.CallListDescription || null,
      Call_List_Genre: result.CallListGenre || null,
      Call_List_Decade: result.CallListDecade || null,
      Call_List_Era: result.CallListEra || null,
      Call_List_SongCount: songCount,
      Call_List_IsActive: result.CallListIsActive,
      Call_List_CreatedAt: result.CallListCreatedAt,
      Call_List_UpdatedAt: null
    };
  }

  private normalizeCallListMasters(response: unknown): BingoCallListMaster[] {
    return this.unwrapArray(response)
      .map(item => this.mapCallListMaster(item))
      .filter((item): item is BingoCallListMaster => item !== null);
  }

  private normalizeCallListSongs(response: unknown): BingoCallListSong[] {
    return this.unwrapArray(response)
      .map(item => this.mapCallListSong(item))
      .filter((item): item is BingoCallListSong => item !== null);
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

  private normalizeCallListSongInsert(response: unknown, fallbackPayload: BingoCallListSongInsert): BingoCallListSongInsert {
    const record = this.unwrapRecord(response) ?? {};

    return {
      CallListID: this.asNullableNumber(record['CallListID'] ?? record['CallListId'] ?? record['Call_List_ID']) ?? fallbackPayload.CallListID,
      Inning: this.asNullableNumber(record['Inning'] ?? record['inning']) ?? fallbackPayload.Inning,
      Song_ID: this.asNullableNumber(record['Song_ID'] ?? record['SongID'] ?? record['SongId'] ?? record['song_id']) ?? fallbackPayload.Song_ID,
      Title: this.asString(record['Title'] ?? record['title'], fallbackPayload.Title),
      Artist: this.asString(record['Artist'] ?? record['artist'], fallbackPayload.Artist),
      FeaturedArtist: this.asString(record['FeaturedArtist'] ?? record['featured_artist'], fallbackPayload.FeaturedArtist),
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
    return this.unwrapArray(response)
      .map((item, index) => {
        const record = this.asRecord(item);
        const songRecord = this.asRecord(record?.['Song']) ?? record;

        if (!songRecord) {
          return fallbackPayloads[index] ?? null;
        }

        return this.normalizeCallListSongInsert(songRecord, fallbackPayloads[index] ?? fallbackPayloads[0]);
      })
      .filter((item): item is BingoCallListSongInsert => item !== null);
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

  private mapCallListSong(item: unknown): BingoCallListSong | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const songId = this.asNullableNumber(record['song_id'] ?? record['SongID'] ?? record['Song_ID']);
    const callListId = this.asNullableNumber(record['Call_List_ID'] ?? record['CallListID']);

    if (songId === null || callListId === null) {
      return null;
    }

    return {
      song_id: songId,
      Call_List_ID: callListId,
      inning: this.asNullableNumber(record['inning'] ?? record['Inning']),
      title: this.asString(record['title'] ?? record['Title']),
      artist: this.asString(record['artist'] ?? record['Artist']),
      featured_artist: this.asNullableString(record['featured_artist'] ?? record['FeaturedArtist']),
      lead_vocalist: this.asNullableString(record['lead_vocalist'] ?? record['LeadVocalist']),
      artist_type: this.asNullableString(record['artist_type'] ?? record['ArtistType']),
      genre: this.asNullableString(record['genre'] ?? record['Genre']),
      explicit: this.asBoolean(record['explicit'] ?? record['Explicit']),
      release_year: this.asNullableNumber(record['release_year'] ?? record['ReleaseYear']),
      decade: this.asNullableString(record['decade'] ?? record['Decade']),
      era: this.asNullableString(record['era'] ?? record['Era']),
      last_played: this.asNullableString(record['last_played'] ?? record['LastPlayed'])
    };
  }

  private unwrapArray(response: unknown): unknown[] {
    const record = this.asRecord(response);
    const candidates = ['data', 'Data', 'items', 'Items', 'result', 'Result', 'payload', 'Payload'];
    const listCandidate = record
      ? candidates.map(key => record[key]).find(value => Array.isArray(value))
      : undefined;

    if (Array.isArray(listCandidate)) {
      return listCandidate;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return response ? [response] : [];
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

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value : null;
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'y', 'yes'].includes(value.trim().toLowerCase());
    }

    return false;
  }
}

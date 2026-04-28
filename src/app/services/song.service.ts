import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { ModelSongDisplay } from '../models/model-song-display.model';

@Injectable({ providedIn: 'root' })
export class SongService {
  private readonly http = inject(HttpClient);
  private readonly getAllSongsUrl = environment.bingoSongsApiUrl;

  getSongs(): Observable<ModelSongDisplay[]> {
    return this.http.get(this.getAllSongsUrl, { responseType: 'text' }).pipe(
      map(response => this.parseSongsResponse(response))
    );
  }

  getSongById(songId: number): Observable<ModelSongDisplay | null> {
    return this.getSongs().pipe(
      map(songs => songs.find(song => song.song_id === songId) ?? null)
    );
  }

  getSongRouteId(song: Pick<ModelSongDisplay, 'song_id'>): string {
    return String(song.song_id ?? '');
  }

  private parseSongsResponse(response: string): ModelSongDisplay[] {
    const normalized = response.trim();

    if (normalized.length === 0) {
      return [];
    }

    if (normalized.startsWith('<')) {
      return this.parseSongsXml(normalized);
    }

    try {
      return this.normalizeSongs(JSON.parse(normalized));
    } catch {
      return [];
    }
  }

  private normalizeSongs(response: unknown): ModelSongDisplay[] {
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
      .map(item => this.mapSong(item))
      .filter((item): item is ModelSongDisplay => item !== null);
  }

  private parseSongsXml(xml: string): ModelSongDisplay[] {
    const document = this.parseXmlDocument(xml);

    if (!document) {
      return [];
    }

    return Array.from(document.getElementsByTagName('ModelSongsDisplay'))
      .map(node => this.mapSong(this.xmlNodeToRecord(node)))
      .filter((item): item is ModelSongDisplay => item !== null);
  }

  private mapSong(item: unknown): ModelSongDisplay | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    return {
      song_id: this.asNullableNumber(record['song_id']),
      Title: this.asNullableString(record['Title']),
      Artist: this.asNullableString(record['Artist']),
      ArtistType: this.asNullableString(record['ArtistType']),
      Genre: this.asNullableString(record['Genre']),
      Subgenre: this.asNullableString(record['Subgenre']),
      Mood: this.asNullableString(record['Mood']),
      Tempo: this.asNullableString(record['Tempo']),
      ReleaseYear: this.asNullableNumber(record['ReleaseYear']),
      Decade: this.asNullableString(record['Decade']),
      Era: this.asNullableString(record['Era']),
      BingoCategory: this.asNullableString(record['BingoCategory']),
      Difficulty: this.asNullableString(record['Difficulty']),
      ChartPeakPosition: this.asNullableNumber(record['ChartPeakPosition']),
      ChartCountry: this.asNullableString(record['ChartCountry']),
      SpotifyPopularity: this.asNullableNumber(record['SpotifyPopularity']),
      DurationSeconds: this.asNullableNumber(record['DurationSeconds']),
      Active: this.asBoolean(record['Active'])
    };
  }

  private parseXmlDocument(xml: string): Document | null {
    const parser = new DOMParser();
    const document = parser.parseFromString(xml, 'application/xml');

    return document.querySelector('parsererror') ? null : document;
  }

  private xmlNodeToRecord(node: Element): Record<string, unknown> {
    return Array.from(node.children).reduce<Record<string, unknown>>((record, child) => {
      const isNil = child.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'nil') === 'true';
      record[child.tagName] = isNil ? null : child.textContent?.trim() ?? null;
      return record;
    }, {});
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

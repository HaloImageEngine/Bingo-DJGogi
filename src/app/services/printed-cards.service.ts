import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { PrintedCard, PrintedCardResultRow, PrintedCardSquare } from '../models/printed-card.model';

@Injectable({ providedIn: 'root' })
export class PrintedCardsService {
  private readonly http = inject(HttpClient);
  private readonly printedCardsApiBaseUrl = environment.bingoPrintedCardsApiBaseUrl;

  getPrintedCardsByGameId(gameId: number): Observable<PrintedCard[]> {
    return this.http.get(`${this.printedCardsApiBaseUrl}/${gameId}`, { responseType: 'text' }).pipe(
      map(response => this.parsePrintedCardsResponse(response)),
      map(rows => this.groupCards(rows))
    );
  }

  private parsePrintedCardsResponse(response: string): PrintedCardResultRow[] {
    const normalized = response.trim();

    if (normalized.length === 0) {
      return [];
    }

    if (normalized.startsWith('<')) {
      return this.parsePrintedCardsXml(normalized);
    }

    try {
      return this.normalizeRows(JSON.parse(normalized));
    } catch {
      return [];
    }
  }

  private normalizeRows(response: unknown): PrintedCardResultRow[] {
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
      .map(item => this.mapRow(item))
      .filter((item): item is PrintedCardResultRow => item !== null);
  }

  private parsePrintedCardsXml(xml: string): PrintedCardResultRow[] {
    const document = this.parseXmlDocument(xml);

    if (!document) {
      return [];
    }

    return Array.from(document.getElementsByTagName('ModelPrintedCard'))
      .map(node => this.mapRow(this.xmlNodeToRecord(node)))
      .filter((item): item is PrintedCardResultRow => item !== null);
  }

  private mapRow(item: unknown): PrintedCardResultRow | null {
    const record = this.asRecord(item);

    if (!record) {
      return null;
    }

    const cardId = this.asNullableNumber(record['CardID']);
    const gameId = this.asNullableNumber(record['GameID']);
    const gnid = this.asNullableNumber(record['GNID']);
    const squarePosition = this.asNullableNumber(record['SquarePosition']);
    const rowNumber = this.asNullableNumber(record['RowNumber']);
    const columnLetter = this.asColumnLetter(record['ColumnLetter']);
    const gameNumber = this.asStringValue(record['GameNumber']);
    const squareCode = this.asStringValue(record['SquareCode']);

    if (
      cardId === null ||
      gameId === null ||
      gnid === null ||
      squarePosition === null ||
      rowNumber === null ||
      columnLetter === null ||
      gameNumber === null ||
      squareCode === null
    ) {
      return null;
    }

    return {
      CardID: cardId,
      GameID: gameId,
      GNID: gnid,
      GameNumber: gameNumber,
      GameName: this.asNullableString(record['GameName']),
      GameWinPattern: this.asNullableString(record['GameWinPattern']),
      CardDateCreate: this.asStringValue(record['CardDateCreate']) ?? '',
      CardPlayerName: this.asNullableString(record['CardPlayerName']),
      CardPlayerEmail: this.asNullableString(record['CardPlayerEmail']),
      PlayCount: this.asNullableNumber(record['PlayCount']) ?? 0,
      CardIsWinner: this.asBoolean(record['CardIsWinner']),
      CardSeedKey: this.asNullableString(record['CardSeedKey']),
      CardPrintedAt: this.asNullableString(record['CardPrintedAt']),
      SquareCode: squareCode,
      SquarePosition: squarePosition,
      ColumnLetter: columnLetter,
      RowNumber: rowNumber,
      SongID: this.asNullableNumber(record['SongID']),
      SongTitle: this.asNullableString(record['SongTitle']),
      SongArtist: this.asNullableString(record['SongArtist']),
      IsCalled: this.asBoolean(record['IsCalled']),
      IsFreeSpace: this.asBoolean(record['IsFreeSpace'])
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

  private groupCards(rows: PrintedCardResultRow[]): PrintedCard[] {
    const cards = new Map<number, PrintedCard>();

    for (const row of rows) {
      const existing = cards.get(row.CardID);

      if (existing) {
        existing.Squares.push(this.mapSquare(row));
        continue;
      }

      cards.set(row.CardID, {
        CardID: row.CardID,
        GameID: row.GameID,
        GNID: row.GNID,
        GameNumber: row.GameNumber,
        GameName: row.GameName,
        GameWinPattern: row.GameWinPattern,
        CardDateCreate: row.CardDateCreate,
        CardPlayerName: row.CardPlayerName,
        CardPlayerEmail: row.CardPlayerEmail,
        PlayCount: row.PlayCount,
        CardIsWinner: row.CardIsWinner,
        CardSeedKey: row.CardSeedKey,
        CardPrintedAt: row.CardPrintedAt,
        Squares: [this.mapSquare(row)]
      });
    }

    return Array.from(cards.values())
      .map(card => ({
        ...card,
        Squares: [...card.Squares].sort((left, right) => left.SquarePosition - right.SquarePosition)
      }))
      .sort((left, right) => left.CardID - right.CardID);
  }

  private mapSquare(row: PrintedCardResultRow): PrintedCardSquare {
    return {
      SquareCode: row.SquareCode,
      SquarePosition: row.SquarePosition,
      ColumnLetter: row.ColumnLetter,
      RowNumber: row.RowNumber,
      Song: row.SongID === null
        ? null
        : {
            SongID: row.SongID,
            SongName: row.SongTitle ?? '',
            SongArtist: row.SongArtist ?? ''
          },
      IsCalled: row.IsCalled,
      IsFreeSpace: row.IsFreeSpace
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }

  private asNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private asStringValue(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return null;
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
      return value.toLowerCase() === 'true' || value === '1';
    }

    return false;
  }

  private asColumnLetter(value: unknown): PrintedCardResultRow['ColumnLetter'] | null {
    return value === 'B' || value === 'I' || value === 'N' || value === 'G' || value === 'O'
      ? value
      : null;
  }
}

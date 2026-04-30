export interface BingoGameActionResult {
  Success: boolean;
  GameID: number;
  ReturnValue: number;
}

export interface BingoTopCard {
  CardID: number;
  CalledCount: number;
}

export interface BingoWinnerResult {
  GameID: number;
  WinningCardID: number | null;
  WinningPattern: string | null;
  PlayerName: string | null;
  PlayerEmail: string | null;
  Result: string | null;
}

export interface BingoCalledSong {
  SongID: number;
  SongTitle: string;
  SongArtist: string;
}
